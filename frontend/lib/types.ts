export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type PlayerStatus = 'active' | 'folded' | 'all-in' | 'disconnected' | 'sitting-out';
export type GamePhase = 'waiting' | 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';
export type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

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

export interface WinnerInfo {
  playerId: string;
  handName: string;
  winAmount: number;
}

export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}

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

export interface PlayerAction {
  type: ActionType;
  amount?: number;
}