'use client';

import { ClientPlayer } from '@/lib/types';

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

function getAvatarColor(seatIndex: number): string {
  return AVATAR_COLORS[seatIndex % AVATAR_COLORS.length];
}

interface PlayerPanelProps {
  player: ClientPlayer;
  isCurrentUser: boolean;
  showCards: boolean;
  seatIndex: number;
  isTurn: boolean;
}

export function PlayerPanel({ player, isCurrentUser, showCards, seatIndex, isTurn }: PlayerPanelProps) {
  const color = getAvatarColor(seatIndex);
  const isFolded = player.status === 'folded';
  const isAllIn = player.status === 'all-in';
  const isDisconnected = player.status === 'disconnected';
  const isSittingOut = player.status === 'sitting-out';
  const isActive = player.status === 'active';
  const isGone = isFolded || isSittingOut;

  return (
    <div className={`flex flex-col items-center gap-1 transition-all duration-300 ${isGone ? 'opacity-40 grayscale' : isDisconnected ? 'opacity-50' : ''}`}>
      {/* Opponent mini cards (shown above for non-local players) */}
      {showCards && !isFolded && !isSittingOut && player.cardCount > 0 && (
        <div className="flex gap-0.5 mb-0.5">
          {Array.from({ length: player.cardCount }).map((_, i) => (
            <div key={i} className="w-5 h-7 rounded-sm border border-blue-300/40 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e3a5f, #1e40af 50%, #1e3a5f)' }}>
              <span className="text-blue-200/70 font-bold" style={{ fontSize: '8px' }}>&#9824;</span>
            </div>
          ))}
        </div>
      )}

      {/* Main pill - glassmorphism */}
      <div className={`
        relative flex items-center gap-2 px-3 py-1.5 rounded-2xl backdrop-blur-md transition-all duration-500
        ${isTurn
          ? 'bg-slate-900/70 ring-[3px] ring-yellow-400 shadow-[0_0_20px_4px_rgba(234,179,8,0.45)] scale-105'
          : isAllIn
            ? 'bg-slate-900/60 ring-2 ring-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
            : isCurrentUser
              ? 'bg-slate-900/60 ring-2 ring-amber-400/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
              : 'bg-slate-900/50 ring-1 ring-white/10'
        }
        ${isFolded ? 'bg-slate-900/30 ring-white/5' : ''}
      `}>
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

        {/* Name + chips */}
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-white text-[11px] font-semibold truncate max-w-[68px]">{player.name}</span>
          <span className="text-amber-400 text-[10px] font-bold tabular-nums">
            {player.stack.toLocaleString()}
          </span>
        </div>

        {/* Role badges */}
        <div className="flex flex-col gap-0.5 ml-0.5">
          {player.isDealer && (
            <span className="w-4 h-4 rounded-full bg-yellow-400 text-black text-[8px] font-black flex items-center justify-center shadow">D</span>
          )}
          {player.isSmallBlind && (
            <span className="h-3.5 px-1 rounded bg-blue-500 text-white text-[7px] font-bold flex items-center justify-center">SB</span>
          )}
          {player.isBigBlind && (
            <span className="h-3.5 px-1 rounded bg-red-500 text-white text-[7px] font-bold flex items-center justify-center">BB</span>
          )}
        </div>
      </div>

      {/* Bet chip below pill */}
      {player.currentBet > 0 && (
        <div className="bg-gradient-to-b from-yellow-400 to-yellow-600 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-yellow-500/40 flex items-center gap-0.5">
          <span className="text-[8px]">&#9818;</span>
          {player.currentBet.toLocaleString()}
        </div>
      )}

      {/* All-in badge */}
      {isAllIn && (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full tracking-widest shadow-lg shadow-purple-500/40 animate-pulse">
          ALL IN
        </div>
      )}

      {/* Turn bouncing dots */}
      {isTurn && (
        <div className="flex gap-0.5 mt-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}
    </div>
  );
}