'use client';

import { Card } from '@/lib/types';

const SUIT_SYMBOL: Record<string, string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
};

const RANK_DISPLAY: Record<string, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  '10': '10', J: 'J', Q: 'Q', K: 'K', A: 'A',
};

export function CardFace({ card, size = 'md' }: { card: Card; size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'w-9 h-13', md: 'w-13 h-[4.5rem]', lg: 'w-16 h-24' }[size];
  const rankSize = { sm: 'text-[10px]', md: 'text-xs', lg: 'text-lg' }[size];
  const suitSize = { sm: 'text-xs', md: 'text-base', lg: 'text-xl' }[size];
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const textColor = isRed ? '#ef4444' : '#111827';

  return (
    <div
      className={`inline-flex flex-col items-center justify-center rounded-md shadow-md border border-black/10 ${dims}`}
      style={{ backgroundColor: '#ffffff', color: textColor }}
    >
      <span className={`${rankSize} font-black leading-none tracking-tight`}>{RANK_DISPLAY[card.rank]}</span>
      <span className={`${suitSize} leading-none -mt-0.5`}>{SUIT_SYMBOL[card.suit]}</span>
    </div>
  );
}

export function CardBack({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'w-9 h-13', md: 'w-13 h-[4.5rem]', lg: 'w-16 h-24' }[size];
  return (
    <div className={`inline-flex items-center justify-center rounded-md shadow-md ${dims}`} style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb 50%, #1e40af)' }}>
      <div className="w-[88%] h-[88%] rounded-[3px] flex items-center justify-center" style={{ border: '1.5px solid rgba(96,165,250,0.25)', background: 'radial-gradient(circle, rgba(37,99,235,0.5) 0%, rgba(30,64,175,0.2) 100%)' }}>
        <span className="text-blue-200/60 font-bold" style={{ fontSize: size === 'sm' ? '13px' : size === 'lg' ? '20px' : '16px' }}>&#9824;</span>
      </div>
    </div>
  );
}

export function EmptySlot({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'w-9 h-13', md: 'w-13 h-[4.5rem]', lg: 'w-16 h-24' }[size];
  return <div className={`inline-flex items-center justify-center rounded-md border-2 border-dashed ${dims}`} style={{ borderColor: 'rgba(255,255,255,0.15)' }} />;
}