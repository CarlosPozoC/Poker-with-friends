export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type PlayerStatus = 'active' | 'folded' | 'all-in' | 'disconnected' | 'sitting-out';
export type GamePhase = 'waiting' | 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';
export type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

export interface Player {
  id: string;
  userId: string;
  name: string;
  seatIndex: number;
  cards: Card[];
  status: PlayerStatus;
  currentBet: number;
  totalBetThisHand: number;
  stack: number;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  hasActedThisRound: boolean;
  socketId: string;
  isCurrentTurn: boolean;
  avatarUrl?: string;
}

export interface Room {
  id: string;
  code: string;
  players: Player[];
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  gameState: GameState | null;
  ownerId: string;
  tournament?: {
    currentLevel: number;
    handsInLevel: number;
    handsPerLevel: number;
  };
}

export interface GameState {
  phase: GamePhase;
  board: Card[];
  pot: number;
  currentPlayerIndex: number;
  dealerIndex: number;
  currentBet: number;
  minRaise: number;
  deck: Card[];
  lastAction: string;
  winners: WinnerInfo[] | null;
  sidePots: SidePot[];
  lastAggressorIndex: number;
  roundStartPlayerIndex: number;
  handNumber: number;
  needsRunOut: boolean;
}

export interface WinnerInfo {
  playerId: string;
  handName: string;
  winAmount: number;
}

export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface PlayerAction {
  type: ActionType;
  amount?: number;
}

export interface BlindLevel {
  level: number;
  smallBlind: number;
  bigBlind: number;
}

export const BLIND_LEVELS: BlindLevel[] = [
  { level: 1,  smallBlind: 10,   bigBlind: 20 },
  { level: 2,  smallBlind: 15,   bigBlind: 30 },
  { level: 3,  smallBlind: 20,   bigBlind: 40 },
  { level: 4,  smallBlind: 25,   bigBlind: 50 },
  { level: 5,  smallBlind: 30,   bigBlind: 60 },
  { level: 6,  smallBlind: 40,   bigBlind: 80 },
  { level: 7,  smallBlind: 50,   bigBlind: 100 },
  { level: 8,  smallBlind: 60,   bigBlind: 120 },
  { level: 9,  smallBlind: 80,   bigBlind: 160 },
  { level: 10, smallBlind: 100,  bigBlind: 200 },
  { level: 11, smallBlind: 120,  bigBlind: 240 },
  { level: 12, smallBlind: 150,  bigBlind: 300 },
  { level: 13, smallBlind: 200,  bigBlind: 400 },
  { level: 14, smallBlind: 250,  bigBlind: 500 },
  { level: 15, smallBlind: 300,  bigBlind: 600 },
  { level: 16, smallBlind: 400,  bigBlind: 800 },
  { level: 17, smallBlind: 500,  bigBlind: 1000 },
  { level: 18, smallBlind: 700,  bigBlind: 1400 },
  { level: 19, smallBlind: 1000, bigBlind: 2000 },
  { level: 20, smallBlind: 1500, bigBlind: 3000 },
];

export interface ClientGameState {
  phase: GamePhase;
  board: Card[];
  pot: number;
  currentPlayerId: string;
  players: ClientPlayer[];
  myCards: Card[];
  lastAction: string;
  winners: WinnerInfo[] | null;
  sidePots: SidePot[];
  myPlayerId: string;
  availableActions: ActionType[];
  callAmount: number;
  minRaiseTotal: number;
  isOwner: boolean;
  roomCode: string;
  smallBlind: number;
  bigBlind: number;
  blindLevel?: number;
}

export interface ClientPlayer {
  id: string;
  name: string;
  seatIndex: number;
  status: PlayerStatus;
  currentBet: number;
  stack: number;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  cardCount: number;
  isCurrentTurn: boolean;
  showdownCards?: Card[];
  avatarUrl?: string;
}