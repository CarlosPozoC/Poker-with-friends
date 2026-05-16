'use client';

import { useGameStore } from '@/store/gameStore';
import { CardFace, CardBack, EmptySlot } from './CardView';
import { PlayerPanel } from './PlayerPanel';
import { useCallback, useState, useMemo } from 'react';
import { getSocket } from '@/lib/socket';
import { ActionType, ClientGameState, ClientPlayer } from '@/lib/types';

type SeatPos = { top: string; left: string; transform: string };

const SEAT_POSITIONS: Record<number, SeatPos[]> = {
  2: [
    { top: '2%', left: '50%', transform: 'translate(-50%, 0)' },
    { top: '82%', left: '50%', transform: 'translate(-50%, 0)' },
  ],
  3: [
    { top: '2%', left: '50%', transform: 'translate(-50%, 0)' },
    { top: '52%', left: '5%', transform: 'translate(0, -50%)' },
    { top: '82%', left: '50%', transform: 'translate(-50%, 0)' },
  ],
  4: [
    { top: '2%', left: '50%', transform: 'translate(-50%, 0)' },
    { top: '50%', left: '92%', transform: 'translate(-100%, -50%)' },
    { top: '50%', left: '8%', transform: 'translate(0, -50%)' },
    { top: '82%', left: '50%', transform: 'translate(-50%, 0)' },
  ],
  5: [
    { top: '2%', left: '50%', transform: 'translate(-50%, 0)' },
    { top: '38%', left: '94%', transform: 'translate(-100%, -50%)' },
    { top: '38%', left: '6%', transform: 'translate(0, -50%)' },
    { top: '72%', left: '10%', transform: 'translate(0, -50%)' },
    { top: '82%', left: '50%', transform: 'translate(-50%, 0)' },
  ],
  6: [
    { top: '2%', left: '50%', transform: 'translate(-50%, 0)' },
    { top: '35%', left: '95%', transform: 'translate(-100%, -50%)' },
    { top: '72%', left: '95%', transform: 'translate(-100%, -50%)' },
    { top: '72%', left: '5%', transform: 'translate(0, -50%)' },
    { top: '35%', left: '5%', transform: 'translate(0, -50%)' },
    { top: '82%', left: '50%', transform: 'translate(-50%, 0)' },
  ],
};

function getVisualSeatOrder(players: ClientPlayer[], myPlayerId: string): ClientPlayer[] {
  const myIndex = players.findIndex((p) => p.id === myPlayerId);
  if (myIndex === -1) return players;
  const after = players.slice(myIndex + 1);
  const before = players.slice(0, myIndex);
  return [...after, ...before, players[myIndex]];
}

const PHASE_LABELS: Record<string, string> = {
  waiting: 'Waiting',
  'pre-flop': 'Pre-Flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  showdown: 'Showdown',
};

export function GameTable() {
  const gameState = useGameStore((s) => s.gameState);
  const roomCode = useGameStore((s) => s.roomCode);

  const sendAction = useCallback(
    (type: ActionType, amount?: number) => {
      const socket = getSocket();
      socket.emit('player_action', { roomCode, action: { type, amount } });
    },
    [roomCode],
  );

  const handleStartGame = useCallback(() => {
    const socket = getSocket();
    socket.emit('start_game', { roomCode });
  }, [roomCode]);

  if (!gameState || !roomCode) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 text-lg animate-pulse">Connecting to room...</div>
      </div>
    );
  }

  const myPlayer = gameState.players.find((p) => p.id === gameState.myPlayerId);
  const seatedPlayers = getVisualSeatOrder(gameState.players, gameState.myPlayerId);
  const seatPositions = SEAT_POSITIONS[Math.min(seatedPlayers.length, 6)] ?? SEAT_POSITIONS[6];

  const isMyTurn = !!(myPlayer && gameState.currentPlayerId === gameState.myPlayerId && myPlayer.status === 'active' && gameState.phase !== 'waiting' && gameState.phase !== 'showdown');
  const eligibleCount = gameState.players.filter((p) => p.status === 'active' || p.status === 'all-in').length;
  const currentTurnPlayer = gameState.players.find((p) => p.id === gameState.currentPlayerId);
  const waitingForName = currentTurnPlayer?.name ?? null;

  return (
    <div className="w-full max-w-5xl mx-auto select-none">
      <DebugPanel gameState={gameState} myPlayer={myPlayer} isMyTurn={isMyTurn} />

      {/* Premium table */}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Wood frame */}
          <div className="relative w-[93%] h-[90%] rounded-[50%] border-[14px] border-stone-800 shadow-[0_0_80px_rgba(0,0,0,0.7),inset_0_0_40px_rgba(0,0,0,0.3)]" style={{ borderColor: '#3d2b1f' }}>
            {/* Felt */}
            <div className="absolute inset-0 rounded-[50%]" style={{ background: 'radial-gradient(ellipse at 50% 40%, #2d8a4e 0%, #1a6b37 40%, #0f4a25 80%, #0a3318 100%)' }} />
            {/* Inner light */}
            <div className="absolute inset-0 rounded-[50%]" style={{ background: 'radial-gradient(ellipse at 50% 35%, rgba(110,231,183,0.06) 0%, transparent 55%)' }} />
            {/* Inner rim shadow */}
            <div className="absolute inset-0 rounded-[50%] shadow-[inset_0_2px_15px_rgba(0,0,0,0.4)]" />

            {/* Phase badge */}
            <div className="absolute top-[3%] left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1">
              <div className="bg-black/50 backdrop-blur-sm text-white/90 text-[11px] font-semibold px-3 py-1 rounded-full border border-white/10">
                {PHASE_LABELS[gameState.phase] ?? gameState.phase}
                {gameState.phase !== 'waiting' && gameState.phase !== 'showdown' && (
                  <span className="text-white/40 ml-1.5">| {gameState.smallBlind}/{gameState.bigBlind}</span>
                )}
              </div>
              {gameState.phase !== 'waiting' && gameState.phase !== 'showdown' && waitingForName && !isMyTurn && (
                <div className="bg-amber-500/90 text-black text-[10px] font-bold px-3 py-0.5 rounded-full animate-pulse shadow-lg">
                  {waitingForName}&apos;s turn
                </div>
              )}
              {isMyTurn && (
                <div className="bg-green-500/90 text-black text-[10px] font-bold px-3 py-0.5 rounded-full animate-pulse shadow-lg">
                  Your turn!
                </div>
              )}
            </div>

            {/* Pot - centered */}
            {gameState.pot > 0 && gameState.phase !== 'waiting' && (
              <div className="absolute top-[22%] left-1/2 -translate-x-1/2 z-10">
                <div className="bg-gradient-to-b from-yellow-400 via-yellow-500 to-amber-600 text-black font-black text-sm px-5 py-1.5 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.35)] tracking-wider border border-yellow-300/50">
                  POT {gameState.pot.toLocaleString()}
                </div>
              </div>
            )}

            {/* Community cards - centered below pot */}
            {gameState.phase !== 'waiting' && (
              <div className="absolute top-[46%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1.5 z-10">
                {gameState.board.length === 0
                  ? Array.from({ length: 5 }).map((_, i) => <EmptySlot key={`e-${i}`} size="md" />)
                  : <>
                      {gameState.board.map((card, i) => <CardFace key={`b-${i}`} card={card} size="md" />)}
                      {Array.from({ length: Math.max(0, 5 - gameState.board.length) }).map((_, i) => <EmptySlot key={`r-${i}`} size="md" />)}
                    </>}
              </div>
            )}

            {/* Player seats - radial POV layout */}
            {seatedPlayers.map((player, visualIdx) => {
              const pos = seatPositions[visualIdx];
              if (!pos) return null;
              const isMe = player.id === gameState.myPlayerId;
              const isTurn = (player.isCurrentTurn || player.id === gameState.currentPlayerId) && player.status === 'active';

              return (
                <div
                  key={player.id}
                  className="absolute z-20"
                  style={{ top: pos.top, left: pos.left, transform: pos.transform }}
                >
                  <PlayerPanel player={player} isCurrentUser={isMe} showCards={!isMe} seatIndex={player.seatIndex} isTurn={isTurn} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* My hole cards */}
      {myPlayer && gameState.phase !== 'waiting' && (
        <div className="flex justify-center gap-2 -mt-1 mb-1">
          {gameState.myCards.length > 0
            ? gameState.myCards.map((card, i) => <CardFace key={`mc-${i}`} card={card} size="lg" />)
            : myPlayer.status !== 'folded' && myPlayer.status !== 'sitting-out'
              ? <><CardBack size="lg" /><CardBack size="lg" /></>
              : null
          }
        </div>
      )}

      {/* Info area */}
      <div className="flex flex-col items-center gap-3 mt-1 mb-4">
        {gameState.phase !== 'waiting' && gameState.phase !== 'showdown' && !isMyTurn && waitingForName && (
          <div className="bg-gray-800/60 text-gray-300 px-5 py-2 rounded-xl border border-gray-700/40 text-sm">
            Waiting for <span className="text-amber-400 font-bold">{waitingForName}</span> to act...
          </div>
        )}

        {gameState.phase === 'waiting' && (
          <WaitingPanel gameState={gameState} eligibleCount={eligibleCount} onStartGame={handleStartGame} />
        )}

        {gameState.lastAction && gameState.phase !== 'waiting' && (
          <div className="text-gray-400 text-sm bg-gray-800/50 px-4 py-1.5 rounded-full border border-gray-700/30">
            {gameState.lastAction}
          </div>
        )}

        {gameState.winners && (
          <div className="bg-gradient-to-r from-green-900/80 to-emerald-900/80 border border-green-500/40 px-8 py-4 rounded-2xl">
            {gameState.winners.map((w, i) => {
              const p = gameState.players.find((pl) => pl.id === w.playerId);
              return <div key={i} className="text-green-300 font-bold text-lg text-center">{p?.name ?? w.playerId} wins {w.winAmount.toLocaleString()} ({w.handName})</div>;
            })}
          </div>
        )}
      </div>

      {isMyTurn && myPlayer && (
        <ActionControls gameState={gameState} myPlayer={myPlayer} sendAction={sendAction} />
      )}
    </div>
  );
}

function WaitingPanel({ gameState, eligibleCount, onStartGame }: { gameState: ClientGameState; eligibleCount: number; onStartGame: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 bg-gray-800/80 px-8 py-6 rounded-2xl border border-gray-700/50">
      <div className="text-gray-400 text-3xl">{'\u2660'}</div>
      <div className="text-gray-200 text-lg font-medium">Waiting for players</div>
      <div className="text-gray-500 text-sm">
        <span className="text-green-400 font-bold">{eligibleCount}</span> players seated (min 2)
      </div>
      <div className="text-gray-500 text-sm font-mono bg-gray-900 px-4 py-2 rounded-lg border border-gray-700">
        Room: <span className="text-amber-400 font-bold text-lg">{gameState.roomCode}</span>
      </div>
      {gameState.isOwner && eligibleCount >= 2 && (
        <button onClick={onStartGame} className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 rounded-xl font-bold text-lg shadow-lg shadow-green-500/30 transition-all active:scale-95">
          Deal Cards
        </button>
      )}
      {!gameState.isOwner && eligibleCount >= 2 && <div className="text-gray-400 text-sm">Waiting for the host to deal...</div>}
      {eligibleCount < 2 && <div className="text-amber-400/80 text-sm">Need at least 2 players</div>}
    </div>
  );
}

function DebugPanel({ gameState, myPlayer, isMyTurn }: { gameState: ClientGameState; myPlayer: ClientPlayer | undefined; isMyTurn: boolean }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-2 mb-2 text-[10px] font-mono text-gray-400 flex flex-wrap gap-x-3 gap-y-0.5">
      <span>Phase: <b className="text-white">{gameState.phase}</b></span>
      <span>Local ID: <b className="text-cyan-400">{gameState.myPlayerId?.slice(0, 8) ?? 'none'}</b></span>
      <span>Turn ID: <b className="text-cyan-400">{gameState.currentPlayerId?.slice(0, 8) ?? 'none'}</b></span>
      <span>Match: <b className={gameState.currentPlayerId === gameState.myPlayerId ? 'text-green-400' : 'text-red-400'}>{String(gameState.currentPlayerId === gameState.myPlayerId)}</b></span>
      <span>isMyTurn: <b className={isMyTurn ? 'text-green-400' : 'text-red-400'}>{String(isMyTurn)}</b></span>
      <span>actions: <b className="text-yellow-400">[{gameState.availableActions.join(', ')}]</b></span>
      <span>call: <b className="text-white">{gameState.callAmount}</b></span>
      <span>minR: <b className="text-white">{gameState.minRaiseTotal}</b></span>
      {myPlayer && <>
        <span>bet: <b className="text-white">{myPlayer.currentBet}</b></span>
        <span>stack: <b className="text-white">{myPlayer.stack}</b></span>
        <span>status: <b className="text-white">{myPlayer.status}</b></span>
      </>}
    </div>
  );
}

interface ActionControlsProps {
  gameState: ClientGameState;
  myPlayer: ClientPlayer;
  sendAction: (type: ActionType, amount?: number) => void;
}

function ActionControls({ gameState, myPlayer, sendAction }: ActionControlsProps) {
  const [raiseAmount, setRaiseAmount] = useState(gameState.minRaiseTotal);
  const [showSlider, setShowSlider] = useState(false);

  const minRaise = gameState.minRaiseTotal;
  const maxRaise = myPlayer.stack + myPlayer.currentBet;
  const amountToCall = gameState.callAmount;
  const canCheck = gameState.availableActions.includes('check');
  const canCall = gameState.availableActions.includes('call');
  const canRaise = gameState.availableActions.includes('raise');
  const canAllIn = gameState.availableActions.includes('all-in');

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md border-t border-gray-600/30 z-50 px-4 py-3">
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-2">
        <div className="text-yellow-400 text-xs font-bold tracking-widest uppercase animate-pulse">Your Turn</div>

        <div className="flex gap-2 flex-wrap justify-center">
          {gameState.availableActions.includes('fold') && (
            <button onClick={() => sendAction('fold')} className="px-6 py-2.5 bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 min-w-[90px]">Fold</button>
          )}
          {canCheck && (
            <button onClick={() => sendAction('check')} className="px-6 py-2.5 bg-gradient-to-b from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 rounded-xl font-bold text-gray-900 shadow-lg transition-all active:scale-95 min-w-[90px]">Check</button>
          )}
          {canCall && (
            <button onClick={() => sendAction('call')} className="px-6 py-2.5 bg-gradient-to-b from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 min-w-[110px]">Call {amountToCall}</button>
          )}
          {canRaise && (
            <button onClick={() => { setRaiseAmount(minRaise); setShowSlider(true); }} className="px-6 py-2.5 bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 min-w-[90px]">Raise</button>
          )}
          {canAllIn && !canRaise && (
            <button onClick={() => sendAction('all-in')} className="px-6 py-2.5 bg-gradient-to-b from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 min-w-[110px]">All-in {myPlayer.stack}</button>
          )}
          {canAllIn && canRaise && (
            <button onClick={() => sendAction('all-in')} className="px-4 py-2.5 bg-gradient-to-b from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 rounded-xl font-bold text-white/80 text-sm shadow-lg transition-all active:scale-95">All-in</button>
          )}
        </div>

        {showSlider && canRaise && (
          <div className="bg-gray-800 rounded-xl px-5 py-3 border border-gray-600/50 w-full max-w-md">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-xs w-10 text-right">{minRaise}</span>
              <input type="range" min={minRaise} max={maxRaise} value={raiseAmount} onChange={(e) => setRaiseAmount(Number(e.target.value))} step={gameState.bigBlind} className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              <span className="text-gray-400 text-xs w-10">{maxRaise}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-amber-400 font-bold text-lg">{raiseAmount.toLocaleString()}</span>
              <div className="flex gap-2">
                <button onClick={() => { sendAction('raise', raiseAmount); setShowSlider(false); }} className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 rounded-lg font-bold text-sm transition-all">Confirm</button>
                <button onClick={() => setShowSlider(false)} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm transition-all">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}