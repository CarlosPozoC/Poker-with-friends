import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { Room, Player, ClientGameState, ClientPlayer, PlayerAction, BLIND_LEVELS } from '../game/types';
import { startNewHand, processAction, autoFoldDisconnected, prepareNextHand, getAvailableActions, runOutNextStreet, resolveHand } from '../game/pokerEngine';
import { config } from '../config';
import prisma from '../config/database';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
}

const rooms = new Map<string, Room>();
const socketRoomMap = new Map<string, string>();
const runningOutRooms = new Set<string>();

export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on('join_room', async (data: { roomCode: string; userId: string; userName: string }) => {
      try {
        const { roomCode, userId, userName } = data;
        socket.userId = userId;
        socket.userName = userName;

        let room = rooms.get(roomCode);

        if (!room) {
          room = createRoom(roomCode, userId);
          rooms.set(roomCode, room);
        }

        if (room.players.length >= room.maxPlayers) {
          socket.emit('error_message', { message: 'Room is full' });
          return;
        }

        const existingPlayer = room.players.find((p) => p.userId === userId);
        if (existingPlayer) {
          existingPlayer.status = existingPlayer.stack > 0 ? 'active' : 'sitting-out';
          existingPlayer.socketId = socket.id;

          const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
          existingPlayer.avatarUrl = dbUser?.avatarUrl ?? undefined;

          socket.join(roomCode);
          socketRoomMap.set(socket.id, roomCode);

          broadcastGameState(io, room);
          return;
        }

        const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });

        const player: Player = {
          id: uuidv4(),
          userId,
          name: userName,
          seatIndex: findNextSeat(room),
          cards: [],
          status: 'active',
          currentBet: 0,
          totalBetThisHand: 0,
          stack: config.defaultBalance,
          isDealer: false,
          isSmallBlind: false,
          isBigBlind: false,
          hasActedThisRound: false,
          socketId: socket.id,
          isCurrentTurn: false,
          avatarUrl: dbUser?.avatarUrl ?? undefined,
        };

        room.players.push(player);
        socket.join(roomCode);
        socketRoomMap.set(socket.id, roomCode);

        broadcastGameState(io, room);
      } catch (err: any) {
        socket.emit('error_message', { message: err.message });
      }
    });

    socket.on('start_game', (data: { roomCode: string }) => {
      try {
        const room = rooms.get(data.roomCode);
        if (!room) {
          socket.emit('error_message', { message: 'Room not found' });
          return;
        }
        if (room.gameState) {
          socket.emit('error_message', { message: 'Game already in progress' });
          return;
        }
        if (room.ownerId !== socket.userId) {
          socket.emit('error_message', { message: 'Only the room owner can start the game' });
          return;
        }

        const eligible = room.players.filter((p) => p.status === 'active' && p.stack > 0);
        if (eligible.length < 2) {
          socket.emit('error_message', { message: 'Need at least 2 players with chips' });
          return;
        }

        // Initialize tournament blind structure
        if (!room.tournament) {
          room.tournament = { currentLevel: 0, handsInLevel: 0, handsPerLevel: 15 };
          room.smallBlind = BLIND_LEVELS[0].smallBlind;
          room.bigBlind = BLIND_LEVELS[0].bigBlind;
        }

        const gs = startNewHand(room);
        room.gameState = gs;
        console.log(`[start_game] phase=${gs.phase} dealerIndex=${gs.dealerIndex} currentPlayerIndex=${gs.currentPlayerIndex}`);
        room.players.forEach((p) => {
          console.log(`  player: ${p.name} id=${p.id.slice(0,8)} seat=${p.seatIndex} status=${p.status} isCurrentTurn=${p.isCurrentTurn} isDealer=${p.isDealer} isSB=${p.isSmallBlind} isBB=${p.isBigBlind} stack=${p.stack} currentBet=${p.currentBet}`);
        });
        broadcastGameState(io, room);
      } catch (err: any) {
        socket.emit('error_message', { message: err.message });
      }
    });

    socket.on('leave_room', () => {
      handleLeaveRoom(io, socket);
    });

    socket.on('player_action', (data: { roomCode: string; action: PlayerAction }) => {
      try {
        const { roomCode, action } = data;
        const room = rooms.get(roomCode);
        if (!room || !room.gameState) {
          socket.emit('error_message', { message: 'No game in progress' });
          return;
        }

        if (runningOutRooms.has(roomCode)) {
          socket.emit('error_message', { message: 'Board is being dealt' });
          return;
        }

        const player = room.players.find((p) => p.userId === socket.userId);
        if (!player) {
          socket.emit('error_message', { message: 'Not in this room' });
          return;
        }

        console.log(`[Action] ${player.name} (userId=${socket.userId}, playerId=${player.id}) -> ${action.type}${action.amount ? ' ' + action.amount : ''} | currentTurnIndex=${room.gameState.currentPlayerIndex} currentPlayerId=${room.players[room.gameState.currentPlayerIndex]?.id}`);

        const gs = processAction(room, player.id, action);

        if (gs.needsRunOut) {
          gs.needsRunOut = false;
          broadcastGameState(io, room);
          startRunOutAnimation(io, roomCode);
        } else {
          broadcastGameState(io, room);

          if (gs.phase === 'showdown' && gs.winners) {
            handleHandEnd(io, roomCode);
          }
        }
      } catch (err: any) {
        console.error(`[Action Error] ${err.message}`);
        socket.emit('error_message', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      handleDisconnect(io, socket);
    });
  });
}

function handleLeaveRoom(io: Server, socket: AuthenticatedSocket): void {
  const roomCode = socketRoomMap.get(socket.id);
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  const playerIndex = room.players.findIndex((p) => p.userId === socket.userId);
  if (playerIndex === -1) return;

  const player = room.players[playerIndex];
  room.players.splice(playerIndex, 1);
  socket.leave(roomCode);
  socketRoomMap.delete(socket.id);

  io.to(roomCode).emit('player_left', { playerId: player.id });

  if (room.players.length === 0) {
    rooms.delete(roomCode);
    return;
  }

  if (room.ownerId === player.userId && room.players.length > 0) {
    room.ownerId = room.players[0].userId;
  }

  broadcastGameState(io, room);
}

function handleDisconnect(io: Server, socket: AuthenticatedSocket): void {
  const roomCode = socketRoomMap.get(socket.id);
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) {
    socketRoomMap.delete(socket.id);
    return;
  }

  const playerIndex = room.players.findIndex((p) => p.socketId === socket.id);
  if (playerIndex === -1) {
    socketRoomMap.delete(socket.id);
    return;
  }

  const player = room.players[playerIndex];
  socketRoomMap.delete(socket.id);

  if (player.stack <= 0) {
    room.players.splice(playerIndex, 1);
    if (room.ownerId === player.userId && room.players.length > 0) {
      room.ownerId = room.players[0].userId;
    }
    if (room.players.length === 0) {
      rooms.delete(roomCode);
      return;
    }
    broadcastGameState(io, room);
    return;
  }

  player.status = 'disconnected';
  broadcastGameState(io, room);

  setTimeout(() => {
    const currentRoom = rooms.get(roomCode);
    if (!currentRoom) return;

    const discPlayer = currentRoom.players.find((p) => p.id === player.id);
    if (!discPlayer || discPlayer.status !== 'disconnected') return;

    autoFoldDisconnected(currentRoom);
    if (currentRoom.gameState) {
      broadcastGameState(io, currentRoom);
    }
  }, config.reconnectGracePeriod);
}

function createRoom(code: string, ownerId: string): Room {
  return {
    id: uuidv4(),
    code,
    players: [],
    maxPlayers: config.maxPlayersPerRoom,
    smallBlind: BLIND_LEVELS[0].smallBlind,
    bigBlind: BLIND_LEVELS[0].bigBlind,
    gameState: null,
    ownerId,
  };
}

function findNextSeat(room: Room): number {
  const occupied = new Set(room.players.map((p) => p.seatIndex));
  for (let i = 0; i < room.maxPlayers; i++) {
    if (!occupied.has(i)) return i;
  }
  return room.players.length;
}

function buildClientPlayer(player: Player, forOtherPlayer: boolean, showdownCards?: boolean): ClientPlayer {
  return {
    id: player.id,
    name: player.name,
    seatIndex: player.seatIndex,
    status: player.status,
    currentBet: player.currentBet,
    stack: player.stack,
    isDealer: player.isDealer,
    isSmallBlind: player.isSmallBlind,
    isBigBlind: player.isBigBlind,
    cardCount: forOtherPlayer ? player.cards.length : 0,
    isCurrentTurn: player.isCurrentTurn,
    showdownCards: showdownCards ? player.cards : undefined,
    avatarUrl: player.avatarUrl,
  };
}

function buildClientState(room: Room, forUserId: string): ClientGameState {
  const gs = room.gameState;
  const myPlayer = room.players.find((p) => p.userId === forUserId);

  // Use BOTH isCurrentTurn flag AND currentPlayerId comparison for robustness
  const isMyTurn = !!(gs && myPlayer && myPlayer.status === 'active' && gs.phase !== 'showdown' && gs.phase !== 'waiting'
    && (myPlayer.isCurrentTurn || (gs.currentPlayerIndex >= 0 && gs.currentPlayerIndex < room.players.length && room.players[gs.currentPlayerIndex]?.id === myPlayer.id)));

  const playerIndex = myPlayer ? room.players.indexOf(myPlayer) : -1;
  const availableActions: PlayerAction['type'][] = isMyTurn && playerIndex >= 0
    ? getAvailableActions(room, playerIndex)
    : [];

  if (gs && gs.phase !== 'waiting' && myPlayer) {
    console.log(`[State] uid=${forUserId.slice(0,8)} myId=${myPlayer.id.slice(0,8)} isTurn=${myPlayer.isCurrentTurn} status=${myPlayer.status} myBet=${myPlayer.currentBet} stack=${myPlayer.stack} curBet=${gs.currentBet} phase=${gs.phase} actions=[${availableActions.join(',')}]`);
  }

  const callAmount = myPlayer && gs && myPlayer.status === 'active'
    ? Math.max(0, gs.currentBet - myPlayer.currentBet)
    : 0;

  const minRaiseTotal = gs ? gs.currentBet + gs.minRaise : 0;

  const isShowdown = gs?.phase === 'showdown';
  const blindLevel = room.tournament ? BLIND_LEVELS[room.tournament.currentLevel]?.level : undefined;

  return {
    phase: gs?.phase ?? 'waiting',
    board: gs?.board ?? [],
    pot: gs?.pot ?? 0,
    currentPlayerId: gs ? (room.players[gs.currentPlayerIndex]?.id ?? '') : '',
    players: room.players.map((p) => buildClientPlayer(p, p.userId !== forUserId, isShowdown && p.status !== 'folded' && p.status !== 'sitting-out')),
    myCards: myPlayer ? myPlayer.cards : [],
    lastAction: gs?.lastAction ?? '',
    winners: gs?.winners ?? null,
    sidePots: gs?.sidePots ?? [],
    myPlayerId: myPlayer?.id ?? '',
    availableActions,
    callAmount,
    minRaiseTotal,
    isOwner: room.ownerId === forUserId,
    roomCode: room.code,
    smallBlind: room.smallBlind,
    bigBlind: room.bigBlind,
    blindLevel,
  };
}

function broadcastGameState(io: Server, room: Room): void {
  for (const player of room.players) {
    if (player.socketId && player.status !== 'sitting-out') {
      const clientState = buildClientState(room, player.userId);
      io.to(player.socketId).emit('game_state_update', clientState);
    }
  }
}

function startRunOutAnimation(io: Server, roomCode: string): void {
  runningOutRooms.add(roomCode);

  const DEAL_DELAY = 1000;
  const SHOWDOWN_DELAY = 4000;

  const dealNextStreet = () => {
    const currentRoom = rooms.get(roomCode);
    if (!currentRoom || !currentRoom.gameState) {
      runningOutRooms.delete(roomCode);
      return;
    }

    const hasMore = runOutNextStreet(currentRoom);
    broadcastGameState(io, currentRoom);

    if (hasMore) {
      setTimeout(dealNextStreet, DEAL_DELAY);
    } else {
      setTimeout(resolveAndContinue, DEAL_DELAY);
    }
  };

  const resolveAndContinue = () => {
    const resolveRoom = rooms.get(roomCode);
    if (!resolveRoom || !resolveRoom.gameState) {
      runningOutRooms.delete(roomCode);
      return;
    }

    resolveHand(resolveRoom);
    broadcastGameState(io, resolveRoom);

    if (resolveRoom.gameState.winners) {
      io.to(roomCode).emit('hand_result', {
        winners: resolveRoom.gameState.winners,
        board: resolveRoom.gameState.board,
      });
    }

    emitBustedPlayers(io, resolveRoom);

    setTimeout(() => {
      const nextRoom = rooms.get(roomCode);
      if (!nextRoom) {
        runningOutRooms.delete(roomCode);
        return;
      }

      if (prepareNextHand(nextRoom)) {
        startNewHand(nextRoom);
        broadcastGameState(io, nextRoom);
      } else {
        nextRoom.gameState = null;
        broadcastGameState(io, nextRoom);
      }

      runningOutRooms.delete(roomCode);
    }, SHOWDOWN_DELAY);
  };

  setTimeout(dealNextStreet, DEAL_DELAY);
}

function handleHandEnd(io: Server, roomCode: string): void {
  const room = rooms.get(roomCode);
  if (!room || !room.gameState) return;

  io.to(roomCode).emit('hand_result', {
    winners: room.gameState.winners,
    board: room.gameState.board,
  });

  emitBustedPlayers(io, room);

  setTimeout(() => {
    const currentRoom = rooms.get(roomCode);
    if (!currentRoom) return;

    if (prepareNextHand(currentRoom)) {
      startNewHand(currentRoom);
      broadcastGameState(io, currentRoom);
    } else {
      currentRoom.gameState = null;
      broadcastGameState(io, currentRoom);
    }
  }, 4000);
}

function emitBustedPlayers(io: Server, room: Room): void {
  if (!room.gameState) return;

  for (const player of room.players) {
    if (player.stack === 0) {
      if (player.socketId) {
        io.to(player.socketId).emit('player_busted', {
          playerId: player.id,
          message: 'You have been eliminated. Better luck next time!',
        });
      }
    }
  }
}