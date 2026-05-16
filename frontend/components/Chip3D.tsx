'use client';

const CHIP_PALETTE: Record<number, { face: string; edge: string; light: string }> = {
  1: { face: '#94a3b8', edge: '#475569', light: '#cbd5e1' },
  5: { face: '#ef4444', edge: '#991b1b', light: '#fca5a5' },
  10: { face: '#3b82f6', edge: '#1e40af', light: '#93c5fd' },
  25: { face: '#22c55e', edge: '#15803d', light: '#86efac' },
  50: { face: '#14b8a6', edge: '#0f766e', light: '#5eead4' },
  100: { face: '#06b6d4', edge: '#0e7490', light: '#67e8f9' },
  500: { face: '#a855f7', edge: '#7e22ce', light: '#d8b4fe' },
  1000: { face: '#f59e0b', edge: '#b45309', light: '#fcd34d' },
  5000: { face: '#ec4899', edge: '#9d174d', light: '#f9a8d4' },
  10000: { face: '#f97316', edge: '#c2410c', light: '#fdba74' },
};

const DENOMS = [10000, 5000, 1000, 500, 100, 50, 25, 10, 5, 1];

export function breakdownAmount(amount: number): { denom: number; count: number }[] {
  let remaining = amount;
  const result: { denom: number; count: number }[] = [];
  for (const d of DENOMS) {
    if (remaining >= d) {
      const count = Math.floor(remaining / d);
      result.push({ denom: d, count });
      remaining -= count * d;
    }
    if (remaining <= 0) break;
  }
  return result;
}

export function Chip3D({ denom, size = 24 }: { denom: number; size?: number }) {
  const c = CHIP_PALETTE[denom] ?? CHIP_PALETTE[1];
  return (
    <div
      style={{
        width: size,
        height: Math.round(size * 0.5) + 3,
        perspective: '400px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          width: size - 1,
          height: 3,
          borderRadius: '0 0 50% 50%',
          background: c.edge,
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: 0.9,
        }}
      />
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `radial-gradient(circle at 38% 35%, ${c.light}88, ${c.face} 55%, ${c.edge})`,
          transform: 'rotateX(60deg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 2px 4px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
          border: `1px solid ${c.light}66`,
        }}
      >
        <div
          style={{
            width: '55%',
            height: '55%',
            borderRadius: '50%',
            border: `1.5px solid rgba(255,255,255,0.15)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: '35%', height: '35%', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
        </div>
      </div>
    </div>
  );
}

/** Single denomination stack (multiple chips of same value stacked vertically) */
function DenomStack({ denom, count, chipSize }: { denom: number; count: number; chipSize: number }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
      }}
    >
      <div style={{ position: 'relative', width: chipSize, height: count * (chipSize * 0.28) + 4 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              zIndex: count - i,
              transform: `translateY(${-i * 5}px)`,
            }}
          >
            <Chip3D denom={denom} size={chipSize} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full chip stack: breaks amount into denominations, renders side-by-side stacks */
export function ChipStack({ amount, chipSize = 24 }: { amount: number; chipSize?: number }) {
  const parts = breakdownAmount(amount);
  if (parts.length === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
      {parts.map((p, i) => (
        <DenomStack key={i} denom={p.denom} count={p.count} chipSize={chipSize} />
      ))}
      <span
        style={{
          color: '#fcd34d',
          fontSize: chipSize > 24 ? 13 : 11,
          fontWeight: 900,
          marginLeft: 4,
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          fontVariantNumeric: 'tabular-nums',
          alignSelf: 'center',
        }}
      >
        {amount.toLocaleString()}
      </span>
    </div>
  );
}