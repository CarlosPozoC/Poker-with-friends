'use client';

import { useGameStore } from '@/store/gameStore';
import { CardFace, CardBack, EmptySlot } from './CardView';
import { PlayerSeat } from './PlayerSeat';
import { ActionPanel } from './ActionPanel';
import { ChipStack } from './Chip3D';
import { useCallback, useRef, useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { motion } from 'framer-motion';
import { ClientGameState, ActionType } from '@/lib/types';

type SeatPos = { top: string; left: string; transform: string; betDir: 'down' | 'up' | 'left' | 'right' };

// 6 fixed seats numbered clockwise around the table
// Seat 0 = bottom, then clockwise: 1=bottom-right, 2=top-right, 3=top, 4=top-left, 5=bottom-left
const FIXED_SEATS: SeatPos[] = [
  { top: '84%', left: '50%', transform: 'translate(-50%, 0)', betDir: 'up' },
  { top: '72%', left: '90%', transform: 'translate(-50%, -50%)', betDir: 'left' },
  { top: '35%', left: '90%', transform: 'translate(-50%, -50%)', betDir: 'left' },
  { top: '6%', left: '50%', transform: 'translate(-50%, 0)', betDir: 'down' },
  { top: '35%', left: '10%', transform: 'translate(-50%, -50%)', betDir: 'right' },
  { top: '72%', left: '10%', transform: 'translate(-50%, -50%)', betDir: 'right' },
];

const PHASE_LABELS: Record<string, string> = {
  waiting: 'Waiting',
  'pre-flop': 'Pre-Flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  showdown: 'Showdown',
};

type RainDrop = { id: number; fromX: string; fromY: string; colorIdx: number };

export function PokerTable() {
  const gameState = useGameStore((s) => s.gameState);
  const roomCode = useGameStore((s) => s.roomCode);
  const sendAction = useCallback((type: ActionType, amount?: number) => {
    getSocket().emit('player_action', { roomCode, action: { type, amount } });
  }, [roomCode]);
  const handleStartGame = useCallback(() => {
    getSocket().emit('start_game', { roomCode });
  }, [roomCode]);

  const [rainDrops, setRainDrops] = useState<RainDrop[]>([]);
  const prevPotRef = useRef(0);
  const dropCounter = useRef(0);
  const playerCount = gameState?.players.length ?? 0;

  // Flying chip rain when pot increases
  useEffect(() => {
    if (!gameState || gameState.phase === 'waiting') {
      prevPotRef.current = gameState?.pot ?? 0;
      return;
    }
    const delta = gameState.pot - prevPotRef.current;
    if (delta > 0) {
      const newDrops: RainDrop[] = [];
      const count = Math.min(Math.max(Math.ceil(delta / 200), 1), 4);
      for (let i = 0; i < count; i++) {
        dropCounter.current += 1;
        const fromIdx = (i * 3 + Math.floor(Math.random() * 3)) % FIXED_SEATS.length;
        const pos = FIXED_SEATS[fromIdx];
        newDrops.push({
          id: dropCounter.current,
          fromX: pos.left,
          fromY: pos.top,
          colorIdx: Math.floor((gameState.pot / 100 + i) * 7),
        });
      }
      setRainDrops((prev) => [...prev, ...newDrops]);
      const timeout = setTimeout(() => {
        setRainDrops((prev) => prev.filter((d) => !newDrops.find((n) => n.id === d.id)));
      }, 900);
      prevPotRef.current = gameState.pot;
      return () => clearTimeout(timeout);
    }
    prevPotRef.current = gameState.pot;
  }, [gameState?.pot, gameState?.phase]);

  if (!gameState || !roomCode) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 text-lg animate-pulse">Connecting to room...</div>
      </div>
    );
  }

  const myPlayer = gameState.players.find((p) => p.id === gameState.myPlayerId);
  const isMyTurn = !!(myPlayer && gameState.currentPlayerId === gameState.myPlayerId && myPlayer.status === 'active' && gameState.phase !== 'waiting' && gameState.phase !== 'showdown');
  const eligibleCount = gameState.players.filter((p) => p.status === 'active' || p.status === 'all-in').length;
  const currentTurnPlayer = gameState.players.find((p) => p.id === gameState.currentPlayerId);
  const waitingForName = currentTurnPlayer?.name ?? null;

  return (
    <div className="w-full max-w-5xl mx-auto select-none">

      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-[93%] h-[90%] rounded-[50%] border-[8px] sm:border-[14px]" style={{ borderColor: '#3d2b1f', boxShadow: '0 0 80px rgba(0,0,0,0.7), inset 0 0 40px rgba(0,0,0,0.3)' }}>
            <div className="absolute inset-0 rounded-[50%]" style={{ background: 'radial-gradient(ellipse at 50% 40%, #2d8a4e 0%, #1a6b37 40%, #0f4a25 80%, #0a3318 100%)' }} />
            <div className="absolute inset-0 rounded-[50%]" style={{ background: 'radial-gradient(ellipse at 50% 35%, rgba(110,231,183,0.07) 0%, transparent 55%)' }} />
            <div className="absolute inset-0 rounded-[50%]" style={{ boxShadow: 'inset 0 2px 15px rgba(0,0,0,0.4)' }} />

            {/* Community cards + pot as unified centered object */}
            {gameState.phase !== 'waiting' && (
              <div
                className="absolute z-10"
                style={{
                  top: '46%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 22,
                }}
              >
                {/* 5 cards */}
                <div className="flex gap-1 sm:gap-1.5">
                  {gameState.board.length === 0
                    ? Array.from({ length: 5 }).map((_, i) => <EmptySlot key={`e-${i}`} size="md" />)
                    : gameState.board.map((card, i) => (
                        <motion.div
                          key={`b-${i}`}
                          initial={{ opacity: 0, y: -30, scale: 0.6, rotateY: 180 }}
                          animate={{ opacity: 1, y: 0, scale: 1, rotateY: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: i * 0.15 }}
                        >
                          <CardFace card={card} size="md" />
                        </motion.div>
                      ))}
                  {gameState.board.length > 0 && Array.from({ length: Math.max(0, 5 - gameState.board.length) }).map((_, i) => <EmptySlot key={`r-${i}`} size="md" />)}
                </div>

                {/* Pot with chip stacks */}
                {gameState.pot > 0 && (
                  <motion.div
                    className="flex flex-col items-center gap-1"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.3 }}
                  >
                    <ChipStack amount={gameState.pot} chipSize={26} />
                    <span className="text-white/35 text-[8px] font-semibold tracking-[0.2em]">POT</span>
                  </motion.div>
                )}
              </div>
            )}

            {/* Flying chip rain */}
            {rainDrops.map((drop) => {
              const fromPos = FIXED_SEATS[drop.colorIdx % FIXED_SEATS.length] ?? FIXED_SEATS[0];
              if (!fromPos) return null;
              return (
                <motion.div
                  key={drop.id}
                  className="absolute z-30 pointer-events-none"
                  style={{ top: fromPos.top, left: fromPos.left, transform: fromPos.transform }}
                  initial={{ opacity: 1, scale: 0.4, x: 0, y: 0 }}
                  animate={{
                    opacity: [1, 1, 0],
                    scale: [0.4, 0.8, 0.3],
                    x: '35%',
                    y: '-20%',
                  }}
                  transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <div className="w-4 h-3 rounded-full bg-amber-400 border border-amber-200" style={{ transform: 'rotateX(60deg)' }} />
                </motion.div>
              );
            })}

            {/* Player seats - fixed clockwise positions */}
            {gameState.players.map((player) => {
              const pos = player.seatIndex >= 0 && player.seatIndex < FIXED_SEATS.length ? FIXED_SEATS[player.seatIndex] : null;
              if (!pos) return null;
              const isMe = player.id === gameState.myPlayerId;
              const isTurn = (player.isCurrentTurn || player.id === gameState.currentPlayerId) && player.status === 'active';
              return (
                <div key={player.id} className="absolute z-20" style={{ top: pos.top, left: pos.left, transform: pos.transform }}>
                  <PlayerSeat player={player} isCurrentUser={isMe} showCards={!isMe} seatIndex={player.seatIndex} isTurn={isTurn} betDirection={pos.betDir} showdownCards={player.showdownCards} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Phase badge */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-40">
          <motion.div
            className="bg-black/60 backdrop-blur-sm text-white/90 text-[11px] font-semibold px-3 py-1 rounded-full border border-white/10"
            key={gameState.phase}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {PHASE_LABELS[gameState.phase] ?? gameState.phase}
            {gameState.phase !== 'waiting' && gameState.phase !== 'showdown' && (
              <span className="text-white/40 ml-1.5">| {gameState.blindLevel ? `Lv${gameState.blindLevel} ` : ''}{gameState.smallBlind}/{gameState.bigBlind}</span>
            )}
          </motion.div>
        </div>
      </div>

      {/* My hole cards */}
      {myPlayer && gameState.phase !== 'waiting' && (
        <div className="flex justify-center gap-2 -mt-1 mb-1">
          {gameState.myCards.length > 0
            ? gameState.myCards.map((card, i) => (
                <motion.div
                  key={`mc-${i}`}
                  initial={{ opacity: 0, y: 30, scale: 0.5, rotateY: 180 }}
                  animate={{ opacity: 1, y: 0, scale: 1, rotateY: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25, delay: i * 0.15 }}
                >
                  <CardFace card={card} size="lg" />
                </motion.div>
              ))
            : myPlayer.status !== 'folded' && myPlayer.status !== 'sitting-out'
              ? <><CardBack size="lg" /><CardBack size="lg" /></>
              : null
          }
        </div>
      )}

      {/* Info area */}
      <div className="flex flex-col items-center gap-3 mt-1 mb-24">
        {gameState.phase !== 'waiting' && gameState.phase !== 'showdown' && (
          isMyTurn ? (
            <motion.div
              className="bg-green-500/90 text-black text-sm font-bold px-5 py-2 rounded-xl shadow-lg"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            >
              Your turn!
            </motion.div>
          ) : waitingForName ? (
            <div className="bg-gray-800/60 text-gray-300 px-5 py-2 rounded-xl border border-gray-700/40 text-sm">
              Waiting for <span className="text-amber-400 font-bold">{waitingForName}</span>
            </div>
          ) : null
        )}

        {gameState.phase === 'waiting' && (
          <WaitingPanel gameState={gameState} eligibleCount={eligibleCount} onStartGame={handleStartGame} />
        )}

        {gameState.lastAction && gameState.phase !== 'waiting' && (
          <motion.div
            className="text-gray-400 text-sm bg-gray-800/50 px-4 py-1.5 rounded-full border border-gray-700/30"
            key={gameState.lastAction}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {gameState.lastAction}
          </motion.div>
        )}

        {gameState.winners && (
          <motion.div
            className="bg-gradient-to-r from-green-900/80 to-emerald-900/80 border border-green-500/40 px-8 py-4 rounded-2xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {gameState.winners.map((w, i) => {
              const p = gameState.players.find((pl) => pl.id === w.playerId);
              return <div key={i} className="text-green-300 font-bold text-lg text-center">{p?.name ?? w.playerId} wins {w.winAmount.toLocaleString()} ({w.handName})</div>;
            })}
          </motion.div>
        )}
      </div>

      {isMyTurn && myPlayer && (
        <ActionPanel gameState={gameState} myPlayer={myPlayer} sendAction={sendAction} />
      )}
    </div>
  );
}

function WaitingPanel({ gameState, eligibleCount, onStartGame }: { gameState: ClientGameState; eligibleCount: number; onStartGame: () => void }) {
  return (
    <motion.div
      className="flex flex-col items-center gap-4 bg-gray-800/80 px-8 py-6 rounded-2xl border border-gray-700/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="text-gray-200 text-lg font-medium">Waiting for players</div>
      <div className="text-gray-500 text-sm">
        <span className="text-green-400 font-bold">{eligibleCount}</span> players seated (min 2)
      </div>
      <div className="text-gray-500 text-sm font-mono bg-gray-900 px-4 py-2 rounded-lg border border-gray-700">
        Room: <span className="text-amber-400 font-bold text-lg">{gameState.roomCode}</span>
      </div>
      {gameState.isOwner && eligibleCount >= 2 && (
        <motion.button
          onClick={onStartGame}
          className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 rounded-xl font-bold text-lg shadow-lg shadow-green-500/30"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Deal Cards
        </motion.button>
      )}
      {!gameState.isOwner && eligibleCount >= 2 && <div className="text-gray-400 text-sm">Waiting for the host to deal...</div>}
      {eligibleCount < 2 && <div className="text-amber-400/80 text-sm">Need at least 2 players</div>}
    </motion.div>
  );
}