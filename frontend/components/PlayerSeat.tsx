'use client';

import { motion } from 'framer-motion';
import { ClientPlayer, Card } from '@/lib/types';
import { ChipStack } from './Chip3D';
import { CardFace, CardBack } from './CardView';

const AVATAR_COLORS = [
  'from-blue-400 to-blue-600',
  'from-rose-400 to-rose-600',
  'from-emerald-400 to-emerald-600',
  'from-violet-400 to-violet-600',
  'from-amber-400 to-amber-600',
  'from-cyan-400 to-cyan-600',
  'from-pink-400 to-pink-600',
  'from-teal-400 to-teal-600',
  'from-orange-400 to-orange-600',
];

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function resolveAvatarUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  return `${apiUrl}${url}`;
}

type BetDirection = 'down' | 'up' | 'left' | 'right';

interface PlayerSeatProps {
  player: ClientPlayer;
  isCurrentUser: boolean;
  showCards: boolean;
  isTurn: boolean;
  seatIndex: number;
  betDirection: BetDirection;
  showdownCards?: Card[];
}

export function PlayerSeat({ player, isCurrentUser, showCards, isTurn, seatIndex, betDirection, showdownCards }: PlayerSeatProps) {
  const color = AVATAR_COLORS[seatIndex % AVATAR_COLORS.length];
  const isFolded = player.status === 'folded';
  const isAllIn = player.status === 'all-in';
  const isSittingOut = player.status === 'sitting-out';
  const isGone = isFolded || isSittingOut;
  const hasAnyRole = player.isDealer || player.isSmallBlind || player.isBigBlind;

  return (
    <div className={`relative transition-opacity duration-300 ${isGone ? 'opacity-30 grayscale' : ''}`}>
      {/* Opponent cards: real at showdown, backs otherwise */}
      {showCards && !isFolded && !isSittingOut && showdownCards && showdownCards.length > 0 && (
        <div className="flex justify-center gap-0.5 mb-0.5">
          {showdownCards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, rotateY: 180, scale: 0.5 }}
              animate={{ opacity: 1, rotateY: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, delay: i * 0.15 }}
            >
              <CardFace card={card} size="sm" />
            </motion.div>
          ))}
        </div>
      )}
      {showCards && !isFolded && !isSittingOut && !showdownCards && player.cardCount > 0 && (
        <div className="flex justify-center gap-0.5 mb-0.5">
          {Array.from({ length: player.cardCount }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: -20, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, delay: i * 0.1 }}
            >
              <CardBack size="sm" />
            </motion.div>
          ))}
        </div>
      )}

      {/* Glassmorphism pill */}
      <motion.div
        className={`
          relative flex items-center gap-2 px-3 py-1.5 rounded-2xl backdrop-blur-md transition-colors duration-300
          ${isFolded ? 'bg-slate-900/30' : 'bg-slate-900/50'}
        `}
        style={{ border: isTurn ? '2px solid rgba(234,179,8,0.8)' : isAllIn ? '2px solid rgba(168,85,247,0.6)' : isCurrentUser ? '2px solid rgba(245,158,11,0.5)' : '1px solid rgba(255,255,255,0.1)' }}
        animate={
          isTurn
            ? { boxShadow: ['0px 0px 0px rgba(234,179,8,0)', '0px 0px 20px rgba(234,179,8,0.6)', '0px 0px 0px rgba(234,179,8,0)'] }
            : isAllIn
              ? { boxShadow: '0px 0px 12px rgba(168,85,247,0.3)' }
              : { boxShadow: '0px 0px 0px rgba(0,0,0,0)' }
        }
        transition={
          isTurn
            ? { boxShadow: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' } }
            : { duration: 0.3 }
        }
      >
        {/* Avatar */}
        {player.avatarUrl ? (
          <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2 border-white/20 shadow-md ${isTurn ? 'ring-2 ring-yellow-300' : ''}`}>
            <img
              src={resolveAvatarUrl(player.avatarUrl)}
              alt={player.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.className = `w-8 h-8 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0 ${isTurn ? 'ring-2 ring-yellow-300' : ''}`;
                  parent.textContent = getInitials(player.name);
                }
              }}
            />
          </div>
        ) : (
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0 ${isTurn ? 'ring-2 ring-yellow-300' : ''}`}>
            {getInitials(player.name)}
          </div>
        )}

        {/* Name + stack */}
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-white text-[11px] font-semibold truncate max-w-[68px]">{player.name}</span>
          <span className="text-amber-400 text-[10px] font-bold tabular-nums">{player.stack.toLocaleString()}</span>
        </div>

        {/* Role badges on pill corner */}
        {hasAnyRole && (
          <div className="absolute -right-2 -top-2 z-10 flex gap-0.5">
            {player.isDealer && <span className="w-4 h-4 rounded-full bg-yellow-400 text-black text-[8px] font-black flex items-center justify-center shadow-sm">D</span>}
            {player.isSmallBlind && <span className="h-3.5 px-1 rounded bg-blue-500 text-white text-[7px] font-bold flex items-center justify-center shadow-sm">SB</span>}
            {player.isBigBlind && <span className="h-3.5 px-1 rounded bg-red-500 text-white text-[7px] font-bold flex items-center justify-center shadow-sm">BB</span>}
          </div>
        )}
      </motion.div>

      {/* ALL IN on the pill line */}
      {isAllIn && (
        <div className="flex justify-center mt-0.5">
          <span className="text-purple-400 text-[9px] font-black tracking-[0.15em]">ALL IN</span>
        </div>
      )}

      {/* Bet chips - positioned toward center */}
      {player.currentBet > 0 && (
        <div
          className="absolute z-10 flex justify-center"
          style={betDirection === 'down' ? { top: '100%', left: '50%', transform: 'translate(-50%, 6px)' } : betDirection === 'up' ? { bottom: '100%', left: '50%', transform: 'translate(-50%, -6px)' } : betDirection === 'left' ? { right: '100%', top: '50%', transform: 'translate(-6px, -50%)' } : { left: '100%', top: '50%', transform: 'translate(6px, -50%)' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            <ChipStack amount={player.currentBet} chipSize={20} />
          </motion.div>
        </div>
      )}

      {/* Turn bouncing dots */}
      {isTurn && (
        <div className="flex justify-center gap-0.5 mt-0.5">
          {[0, 150, 300].map((delay, i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-yellow-400"
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: delay / 1000, ease: 'easeInOut' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}