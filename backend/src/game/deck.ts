import crypto from 'crypto';
import { Card } from './types';

const SUITS: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Card['rank'][] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export function shuffleDeck(): Card[] {
  const deck = createDeck();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function dealCards(deck: Card[], count: number): Card[] {
  return deck.splice(0, count);
}

export function cardToString(card: Card): string {
  const rankMap: Record<string, string> = {
    '10': 'T',
    J: 'J',
    Q: 'Q',
    K: 'K',
    A: 'A',
  };
  const suitMap: Record<Card['suit'], string> = {
    hearts: 'h',
    diamonds: 'd',
    clubs: 'c',
    spades: 's',
  };
  const r = rankMap[card.rank] || card.rank;
  return `${r}${suitMap[card.suit]}`;
}