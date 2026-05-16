import { evaluateWinner, PlayerHand } from '../src/game/handEvaluator';
import { Card } from '../src/game/types';

function mk(suit: Card['suit'], rank: Card['rank']): Card {
  return { suit, rank };
}

let pass = 0;
let fail = 0;

function test(hands: PlayerHand[], board: Card[], strategy: 'player1Wins' | 'player2Wins' | 'split', label: string) {
  const allCards = [...board];
  hands.forEach((h) => allCards.push(...h.cards));
  const seen = new Set<string>();
  for (const c of allCards) {
    const key = `${c.rank}_${c.suit}`;
    if (seen.has(key)) { console.log(`❌ ${label.padEnd(60)} DUPLICATE`); fail++; return; }
    seen.add(key);
  }
  const result = evaluateWinner(hands, board);
  const ids = result.map((w) => w.playerId);
  const name = result[0]?.handName ?? 'none';
  const ok = strategy === 'split' ? ids.length === 2
    : strategy === 'player1Wins' ? (ids.length === 1 && ids[0] === 'p1')
    : (ids.length === 1 && ids[0] === 'p2');
  if (ok) pass++; else fail++;
  console.log(`${ok ? '✅' : '❌'} ${label.padEnd(55)} ${name.padEnd(20)} winners:[${ids}]`);
}

// ═══ TWO PAIR ═══════════════════════════════════════

// AAKKQ vs AAKK8 → p1 Q kicker > 8
test([
  { playerId: 'p1', cards: [mk('hearts', 'K'), mk('hearts', 'Q')] },
  { playerId: 'p2', cards: [mk('spades', 'K'), mk('clubs', '2')] },
], [mk('clubs', 'A'), mk('diamonds', 'A'), mk('diamonds', 'K'), mk('hearts', '8'), mk('diamonds', '3')],
  'player1Wins', '2P: AAKKQ vs AAKK8 → p1 wins (Q kicker > 8)');

// AAJJ9 vs KKQQA → p1 AA > KK (higher top pair wins)
test([
  { playerId: 'p1', cards: [mk('hearts', 'A'), mk('diamonds', 'J')] },
  { playerId: 'p2', cards: [mk('hearts', 'K'), mk('diamonds', 'Q')] },
], [mk('spades', 'A'), mk('clubs', 'J'), mk('hearts', '9'), mk('diamonds', 'K'), mk('spades', 'Q')],
  'player1Wins', '2P: AAJJ9 vs KKQQA → p1 wins (AA > KK top pair)');

// QQ994 vs QQ8810 → p1 99 > 88 (same top pair, diff bottom)
test([
  { playerId: 'p1', cards: [mk('hearts', 'Q'), mk('diamonds', '9')] },
  { playerId: 'p2', cards: [mk('spades', 'Q'), mk('clubs', '8')] },
], [mk('clubs', 'Q'), mk('hearts', '9'), mk('diamonds', '8'), mk('spades', '4'), mk('hearts', '10')],
  'player1Wins', '2P: QQ994 vs QQ8810 → p1 (99 > 88 bottom pair)');

// ═══ ONE PAIR ═══════════════════════════════════════

// AAQJT vs AAQJ9 → p1 T kicker > 9
test([
  { playerId: 'p1', cards: [mk('hearts', 'A'), mk('diamonds', '10')] },
  { playerId: 'p2', cards: [mk('clubs', 'A'), mk('hearts', '9')] },
], [mk('clubs', 'Q'), mk('hearts', 'J'), mk('diamonds', '5'), mk('spades', 'A'), mk('clubs', '3')],
  'player1Wins', '1P: AAQJT vs AAQJ9 → p1 (T > 9 kicker)');

// KKJT8 vs KKJT8 identical → split
test([
  { playerId: 'p1', cards: [mk('hearts', 'K'), mk('diamonds', 'J')] },
  { playerId: 'p2', cards: [mk('spades', 'K'), mk('clubs', 'J')] },
], [mk('clubs', 'K'), mk('hearts', '8'), mk('diamonds', '10'), mk('spades', '5'), mk('hearts', '3')],
  'split', '1P: KKJT8 vs KKJT8 identical → split');

// ═══ HIGH CARD ══════════════════════════════════════

// AQJT6 vs AQJ97 → p1 T kicker > 9 (5th card decides)
test([
  { playerId: 'p1', cards: [mk('hearts', '10'), mk('diamonds', '6')] },
  { playerId: 'p2', cards: [mk('spades', '9'), mk('hearts', '7')] },
], [mk('clubs', 'A'), mk('hearts', 'Q'), mk('diamonds', 'J'), mk('spades', '3'), mk('diamonds', '2')],
  'player1Wins', 'HC: AQJT6 vs AQJ97 → p1 (T > 9 kicker)');

// Both use only board cards → identical → split
test([
  { playerId: 'p1', cards: [mk('hearts', '3'), mk('diamonds', '4')] },
  { playerId: 'p2', cards: [mk('spades', '2'), mk('clubs', '5')] },
], [mk('clubs', 'A'), mk('spades', 'K'), mk('hearts', 'Q'), mk('diamonds', 'J'), mk('clubs', '9')],
  'split', 'HC: AKQJ9 vs AKQJ9 (board plays) → split');

// ═══ THREE OF A KIND ════════════════════════════════

// 888AK vs 888AJ → p1 K kicker > J (trips kicker decides)
test([
  { playerId: 'p1', cards: [mk('hearts', '8'), mk('diamonds', 'K')] },
  { playerId: 'p2', cards: [mk('spades', '8'), mk('clubs', 'J')] },
], [mk('clubs', '8'), mk('spades', 'A'), mk('hearts', '5'), mk('diamonds', '2'), mk('spades', '3')],
  'player1Wins', '3Kind: 888AK vs 888AJ → p1 (K > J kicker)');

// ═══ FLUSH ══════════════════════════════════════════

// AJ932 vs AT832 hearts → p1 J > T (2nd flush card decides)
test([
  { playerId: 'p1', cards: [mk('hearts', 'J'), mk('hearts', '9')] },
  { playerId: 'p2', cards: [mk('hearts', '10'), mk('hearts', '8')] },
], [mk('hearts', 'A'), mk('hearts', '2'), mk('hearts', '3'), mk('diamonds', '7'), mk('spades', '4')],
  'player1Wins', 'Flush: AJ932 vs AT832 → p1 (J > T)');

// ═══ STRAIGHT ═══════════════════════════════════════

// 87654 both → split (identical straights)
test([
  { playerId: 'p1', cards: [mk('hearts', '8'), mk('diamonds', '4')] },
  { playerId: 'p2', cards: [mk('spades', '8'), mk('clubs', '4')] },
], [mk('clubs', '7'), mk('hearts', '6'), mk('diamonds', '5'), mk('spades', '2'), mk('hearts', '3')],
  'split', 'Straight: 87654 vs 87654 → split');

// KQJT9 vs QJT98 → p1 K-high > Q-high (higher straight wins)
test([
  { playerId: 'p1', cards: [mk('hearts', 'K'), mk('diamonds', '9')] },
  { playerId: 'p2', cards: [mk('spades', 'Q'), mk('clubs', '8')] },
], [mk('hearts', 'J'), mk('diamonds', '10'), mk('spades', '7'), mk('clubs', '2'), mk('hearts', '3')],
  'player1Wins', 'Straight: KQJT9 vs QJT98 → p1 (K > Q high)');

// ═══ FULL HOUSE ═════════════════════════════════════

// AAA88 vs KKKAA → p1 A trips > K trips
test([
  { playerId: 'p1', cards: [mk('hearts', 'A'), mk('hearts', '8')] },
  { playerId: 'p2', cards: [mk('spades', 'K'), mk('clubs', 'K')] },
], [mk('clubs', 'A'), mk('diamonds', 'A'), mk('diamonds', '8'), mk('hearts', 'K'), mk('clubs', '2')],
  'player1Wins', 'FH: AAA88 vs KKKAA → p1 (A trips > K)');

// 888AA vs 888AA identical → split
test([
  { playerId: 'p1', cards: [mk('hearts', '8'), mk('diamonds', 'A')] },
  { playerId: 'p2', cards: [mk('diamonds', '8'), mk('clubs', 'A')] },
], [mk('clubs', '8'), mk('spades', '8'), mk('hearts', '9'), mk('diamonds', '7'), mk('hearts', 'A')],
  'split', 'FH: 888AA vs 888AA identical → split');

// ═══ FOUR OF A KIND ═════════════════════════════════

// 4 aces on board, p2 K kicker > p1 J kicker
test([
  { playerId: 'p1', cards: [mk('spades', 'J'), mk('diamonds', '2')] },
  { playerId: 'p2', cards: [mk('hearts', 'K'), mk('clubs', '3')] },
], [mk('clubs', 'A'), mk('diamonds', 'A'), mk('hearts', 'A'), mk('spades', 'A'), mk('clubs', 'Q')],
  'player2Wins', '4Kind: AAAAJ vs AAAAK → p2 (K > J kicker)');

console.log(`\n${pass} passed, ${fail} failed`);
