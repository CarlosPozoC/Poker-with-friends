import { Hand } from 'pokersolver';
import { Card, WinnerInfo } from './types';
import { cardToString } from './deck';

export interface PlayerHand {
  playerId: string;
  cards: Card[];
}

export function evaluateWinner(playerHands: PlayerHand[], board: Card[]): WinnerInfo[] {
  if (playerHands.length === 0) return [];
  if (playerHands.length === 1) {
    return [{ playerId: playerHands[0].playerId, handName: 'Last player standing', winAmount: 0 }];
  }

  const solved = playerHands.map((ph) => {
    const allCards = [...ph.cards, ...board].map(cardToString);
    return {
      playerId: ph.playerId,
      hand: Hand.solve(allCards),
    };
  });

  const winningHands = Hand.winners(solved.map((s) => s.hand));

  const winnerSet = new Set(winningHands);
  return solved
    .filter((s) => winnerSet.has(s.hand))
    .map((s) => ({
      playerId: s.playerId,
      handName: s.hand.name,
      winAmount: 0,
    }));
}
