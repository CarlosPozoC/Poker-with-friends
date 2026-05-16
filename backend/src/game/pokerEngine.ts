import {
  Player,
  Room,
  GameState,
  Card,
  PlayerAction,
  SidePot,
  WinnerInfo,
  ActionType,
  BLIND_LEVELS,
} from './types';
import { shuffleDeck, dealCards } from './deck';
import { evaluateWinner } from './handEvaluator';

/** Advance tournament blind level if enough hands have been played */
function advanceBlindLevel(room: Room): void {
  if (!room.tournament) return;

  room.tournament.handsInLevel += 1;

  if (room.tournament.handsInLevel >= room.tournament.handsPerLevel) {
    const nextLevel = room.tournament.currentLevel + 1;
    if (nextLevel < BLIND_LEVELS.length) {
      room.tournament.currentLevel = nextLevel;
      room.tournament.handsInLevel = 0;
      room.smallBlind = BLIND_LEVELS[nextLevel].smallBlind;
      room.bigBlind = BLIND_LEVELS[nextLevel].bigBlind;
      console.log(`[Tournament] Level ${BLIND_LEVELS[nextLevel].level}: ${room.smallBlind}/${room.bigBlind}`);
    }
  }
}

export function startNewHand(room: Room): GameState {
  const eligiblePlayers = room.players.filter(
    (p) => p.status === 'active' && p.stack > 0,
  );
  if (eligiblePlayers.length < 2) {
    throw new Error('Need at least 2 players with chips to start');
  }

  advanceBlindLevel(room);

  const gs = createInitialGameState(room);
  const deck = shuffleDeck();
  gs.deck = deck;
  gs.handNumber = (room.gameState?.handNumber ?? 0) + 1;

  resetPlayersForNewHand(room, gs);
  postBlinds(room, gs);
  dealHoleCards(room, gs, deck);
  setFirstPlayerToAct(room, gs);
  updateCurrentTurn(room);

  room.gameState = gs;
  return gs;
}

function createInitialGameState(room: Room): GameState {
  const prevDealer = room.gameState?.dealerIndex ?? -1;
  const dealerIndex = findNextSeat(room, prevDealer, (p) => p.status === 'active' && p.stack > 0);

  return {
    phase: 'pre-flop',
    board: [],
    pot: 0,
    currentPlayerIndex: -1,
    dealerIndex,
    currentBet: 0,
    minRaise: room.bigBlind,
    deck: [],
    lastAction: 'New hand started',
    winners: null,
    sidePots: [],
    lastAggressorIndex: -1,
    roundStartPlayerIndex: -1,
    handNumber: 0,
    needsRunOut: false,
  };
}

function resetPlayersForNewHand(room: Room, gs: GameState): void {
  room.players.forEach((p, i) => {
    if (p.status === 'sitting-out' || p.status === 'disconnected') {
      p.cards = [];
      p.currentBet = 0;
      p.totalBetThisHand = 0;
      return;
    }
    if (p.stack <= 0) {
      p.status = 'sitting-out';
      p.cards = [];
      p.currentBet = 0;
      p.totalBetThisHand = 0;
      return;
    }
    p.status = 'active';
    p.cards = [];
    p.currentBet = 0;
    p.totalBetThisHand = 0;
    p.isDealer = i === gs.dealerIndex;
    p.hasActedThisRound = false;
    p.isSmallBlind = false;
    p.isBigBlind = false;
    p.isCurrentTurn = false;
  });
}

function postBlinds(room: Room, gs: GameState): void {
  const actives = room.players.filter((p) => p.status === 'active' && p.stack > 0);
  if (actives.length < 2) return;

  let sbIndex: number;
  let bbIndex: number;

  if (actives.length === 2) {
    sbIndex = gs.dealerIndex;
    bbIndex = findNextSeat(room, gs.dealerIndex, (p) => p.status === 'active' && p.stack > 0);
  } else {
    sbIndex = findNextSeat(room, gs.dealerIndex, (p) => p.status === 'active' && p.stack > 0);
    bbIndex = findNextSeat(room, sbIndex, (p) => p.status === 'active' && p.stack > 0);
  }

  const sbPlayer = room.players[sbIndex];
  const bbPlayer = room.players[bbIndex];

  sbPlayer.isSmallBlind = true;
  bbPlayer.isBigBlind = true;

  const sbActual = Math.min(room.smallBlind, sbPlayer.stack);
  sbPlayer.stack -= sbActual;
  sbPlayer.currentBet = sbActual;
  sbPlayer.totalBetThisHand = sbActual;
  if (sbPlayer.stack === 0) sbPlayer.status = 'all-in';

  const bbActual = Math.min(room.bigBlind, bbPlayer.stack);
  bbPlayer.stack -= bbActual;
  bbPlayer.currentBet = bbActual;
  bbPlayer.totalBetThisHand = bbActual;
  if (bbPlayer.stack === 0) bbPlayer.status = 'all-in';

  gs.pot = sbActual + bbActual;
  gs.currentBet = bbActual;
  gs.minRaise = room.bigBlind;
}

function dealHoleCards(room: Room, gs: GameState, deck: Card[]): void {
  for (const player of room.players) {
    if (player.status === 'active' || player.status === 'all-in') {
      player.cards = dealCards(deck, 2);
    }
  }
}

function setFirstPlayerToAct(room: Room, gs: GameState): void {
  if (gs.phase === 'pre-flop') {
    const actives = room.players.filter((p) => p.status === 'active');
    const bbIndex = room.players.findIndex((p) => p.isBigBlind);

    if (actives.length === 2) {
      gs.currentPlayerIndex = gs.dealerIndex;
      if (room.players[gs.dealerIndex].status !== 'active') {
        gs.currentPlayerIndex = findNextSeat(room, bbIndex, (p) => p.status === 'active');
      }
    } else {
      gs.currentPlayerIndex = findNextSeat(room, bbIndex, (p) => p.status === 'active');
    }
    gs.roundStartPlayerIndex = gs.currentPlayerIndex;
    gs.lastAggressorIndex = bbIndex;
  } else {
    const firstToAct = findNextSeat(room, gs.dealerIndex, (p) => p.status === 'active');
    gs.currentPlayerIndex = firstToAct;
    gs.roundStartPlayerIndex = firstToAct;
    gs.lastAggressorIndex = firstToAct;
  }
}

export function processAction(room: Room, playerId: string, action: PlayerAction): GameState {
  const gs = room.gameState;
  if (!gs) throw new Error('No game in progress');

  const playerIndex = room.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) throw new Error('Player not in room');
  if (playerIndex !== gs.currentPlayerIndex) throw new Error('Not your turn');

  const player = room.players[playerIndex];
  if (player.status !== 'active') throw new Error('Player cannot act');

  const available = getAvailableActions(room, playerIndex);
  if (!available.includes(action.type)) {
    throw new Error(`Action ${action.type} is not available. Available: ${available.join(', ')}`);
  }

  switch (action.type) {
    case 'fold':
      applyFold(room, gs, player);
      break;
    case 'check':
      applyCheck(gs, player);
      break;
    case 'call':
      applyCall(room, gs, player);
      break;
    case 'raise':
      applyRaise(room, gs, player, action.amount ?? (gs.currentBet + gs.minRaise));
      break;
    case 'all-in':
      applyAllIn(room, gs, player);
      break;
  }

  player.hasActedThisRound = true;
  gs.lastAction = buildActionMessage(player, action, gs);

  advanceGame(room, gs);
  return gs;
}

function applyFold(room: Room, gs: GameState, player: Player): void {
  player.status = 'folded';
  player.cards = [];
}

function applyCheck(gs: GameState, player: Player): void {
  // no chips moved
}

function applyCall(room: Room, gs: GameState, player: Player): void {
  const callAmount = Math.min(gs.currentBet - player.currentBet, player.stack);
  player.stack -= callAmount;
  player.currentBet += callAmount;
  player.totalBetThisHand += callAmount;
  gs.pot += callAmount;
  if (player.stack === 0) {
    player.status = 'all-in';
  }
}

function applyRaise(room: Room, gs: GameState, player: Player, totalBet: number): void {
  const maxTotal = player.stack + player.currentBet;
  const actualTotal = Math.min(totalBet, maxTotal);
  const additional = actualTotal - player.currentBet;

  if (additional <= 0) throw new Error('Raise must be positive');

  const raiseAboveCurrent = actualTotal - gs.currentBet;
  if (raiseAboveCurrent > 0 && raiseAboveCurrent < gs.minRaise && player.stack > additional) {
    throw new Error(`Minimum raise is ${gs.minRaise} above current bet`);
  }

  player.stack -= additional;
  player.currentBet = actualTotal;
  player.totalBetThisHand += additional;
  gs.pot += additional;

  if (raiseAboveCurrent >= gs.minRaise) {
    gs.minRaise = raiseAboveCurrent;
  }
  gs.currentBet = actualTotal;
  gs.lastAggressorIndex = room.players.indexOf(player);

  if (player.stack === 0) {
    player.status = 'all-in';
  }

  if (raiseAboveCurrent > 0) {
    resetOtherPlayersActed(room, player.id);
  }
}

function applyAllIn(room: Room, gs: GameState, player: Player): void {
  const allInAmount = player.stack;
  const newTotalBet = player.currentBet + allInAmount;
  player.totalBetThisHand += allInAmount;
  gs.pot += allInAmount;
  player.stack = 0;
  player.currentBet = newTotalBet;
  player.status = 'all-in';

  if (newTotalBet > gs.currentBet) {
    const raiseSize = newTotalBet - gs.currentBet;
    if (raiseSize >= gs.minRaise) {
      gs.minRaise = raiseSize;
    }
    gs.currentBet = newTotalBet;
    gs.lastAggressorIndex = room.players.indexOf(player);
    resetOtherPlayersActed(room, player.id);
  }
}

/**
 * When someone raises (regular or all-in), everyone else who hasn't folded
 * must get another chance to act. Reset hasActedThisRound for all active players
 * except the raiser.
 */
function resetOtherPlayersActed(room: Room, raiserId: string): void {
  for (const p of room.players) {
    if (p.id !== raiserId && p.status === 'active') {
      p.hasActedThisRound = false;
    }
  }
}

function buildActionMessage(player: Player, action: PlayerAction, gs: GameState): string {
  switch (action.type) {
    case 'fold': return `${player.name} folds`;
    case 'check': return `${player.name} checks`;
    case 'call': return player.stack === 0 ? `${player.name} calls and is all-in` : `${player.name} calls ${gs.currentBet - player.currentBet}`;
    case 'raise': return player.stack === 0 ? `${player.name} raises to ${player.currentBet} all-in` : `${player.name} raises to ${player.currentBet}`;
    case 'all-in': return `${player.name} goes all-in (${player.currentBet})`;
  }
}

function advanceGame(room: Room, gs: GameState): void {
  const activePlayers = room.players.filter((p) => p.status === 'active');
  const nonFolded = room.players.filter((p) => p.status !== 'folded' && p.status !== 'sitting-out');

  if (nonFolded.length <= 1) {
    endHand(room, gs);
    return;
  }

  if (activePlayers.length === 0) {
    gs.needsRunOut = true;
    gs.currentPlayerIndex = -1;
    updateCurrentTurn(room);
    return;
  }

  if (activePlayers.length === 1) {
    const soleActive = activePlayers[0];
    const hasMatchedBet = soleActive.currentBet >= gs.currentBet || soleActive.status === 'all-in';
    if (soleActive.hasActedThisRound && hasMatchedBet) {
      gs.needsRunOut = true;
      gs.currentPlayerIndex = -1;
      updateCurrentTurn(room);
      return;
    }
  }

  if (isBettingRoundComplete(room, gs)) {
    advancePhase(room, gs);
  } else {
    gs.currentPlayerIndex = findNextSeat(room, gs.currentPlayerIndex, (p) => p.status === 'active');
    updateCurrentTurn(room);
  }
}

function isBettingRoundComplete(room: Room, gs: GameState): boolean {
  const activePlayers = room.players.filter((p) => p.status === 'active');
  if (activePlayers.length === 0) return true;

  // Every active player must have acted this round AND matched the current bet
  // (or be all-in, which is handled by being filtered out of activePlayers)
  const allActed = activePlayers.every((p) => p.hasActedThisRound);
  const allMatchBet = activePlayers.every((p) => p.currentBet >= gs.currentBet);

  return allActed && allMatchBet;
}

function advancePhase(room: Room, gs: GameState): void {
  const deck = gs.deck;

  resetBetsForNewRound(room, gs);

  switch (gs.phase) {
    case 'pre-flop':
      dealCards(deck, 1); // burn
      gs.board.push(...dealCards(deck, 3));
      gs.phase = 'flop';
      gs.lastAction = '--- Flop ---';
      break;
    case 'flop':
      dealCards(deck, 1);
      gs.board.push(...dealCards(deck, 1));
      gs.phase = 'turn';
      gs.lastAction = '--- Turn ---';
      break;
    case 'turn':
      dealCards(deck, 1);
      gs.board.push(...dealCards(deck, 1));
      gs.phase = 'river';
      gs.lastAction = '--- River ---';
      break;
    case 'river':
      endHand(room, gs);
      return;
    default:
      return;
  }

  gs.currentBet = 0;
  gs.minRaise = room.bigBlind;

  const firstToAct = findNextSeat(room, gs.dealerIndex, (p) => p.status === 'active');
  gs.currentPlayerIndex = firstToAct;
  gs.roundStartPlayerIndex = firstToAct;
  gs.lastAggressorIndex = firstToAct;

  room.players.forEach((p) => {
    p.hasActedThisRound = false;
  });

  // If no active players after a new round (all are all-in or folded), run out board
  const activeAfterRound = room.players.filter((p) => p.status === 'active');
  if (activeAfterRound.length === 0) {
    gs.needsRunOut = true;
    gs.currentPlayerIndex = -1;
    updateCurrentTurn(room);
    return;
  }
  if (activeAfterRound.length === 1) {
    const sole = activeAfterRound[0];
    if (sole.currentBet >= gs.currentBet) {
      gs.needsRunOut = true;
      gs.currentPlayerIndex = -1;
      updateCurrentTurn(room);
      return;
    }
  }

  updateCurrentTurn(room);
}

function resetBetsForNewRound(room: Room, gs: GameState): void {
  room.players.forEach((p) => {
    p.currentBet = 0;
  });
}

function runOutBoard(room: Room, gs: GameState): void {
  const deck = gs.deck;

  // Deal remaining community cards with proper burns
  if (gs.phase === 'pre-flop') {
    dealCards(deck, 1); // burn
    gs.board.push(...dealCards(deck, 3));
    gs.phase = 'flop';
  }
  if (gs.phase === 'flop' && gs.board.length < 4) {
    dealCards(deck, 1); // burn
    gs.board.push(...dealCards(deck, 1));
    gs.phase = 'turn';
  }
  if (gs.phase === 'turn' && gs.board.length < 5) {
    dealCards(deck, 1); // burn
    gs.board.push(...dealCards(deck, 1));
    gs.phase = 'river';
  }

  // Ensure we have exactly 5 cards
  while (gs.board.length < 5) {
    dealCards(deck, 1); // burn
    const card = dealCards(deck, 1);
    gs.board.push(...card);
  }

  gs.phase = 'river';
  gs.currentPlayerIndex = -1;
  gs.currentBet = 0;

  updateCurrentTurn(room);
  endHand(room, gs);
}

function endHand(room: Room, gs: GameState): void {
  const nonFolded = room.players.filter(
    (p) => p.status !== 'folded' && p.status !== 'sitting-out',
  );

  gs.phase = 'showdown';

  if (nonFolded.length === 1) {
    const winner = nonFolded[0];
    const potAmount = gs.pot;
    gs.winners = [{ playerId: winner.id, handName: 'Last player standing', winAmount: potAmount }];
    winner.stack += potAmount;
    gs.pot = 0;
    gs.lastAction = `${winner.name} wins ${potAmount.toLocaleString()} (everyone else folded)`;
    return;
  }

  const sidePots = calculateSidePots(room.players, gs.pot);
  gs.sidePots = sidePots;

  const allWinners: WinnerInfo[] = [];

  for (const sidePot of sidePots) {
    if (sidePot.eligiblePlayerIds.length === 0) continue;

    const eligibleHands = room.players
      .filter((p) => sidePot.eligiblePlayerIds.includes(p.id))
      .filter((p) => p.cards.length > 0)
      .map((p) => ({ playerId: p.id, cards: p.cards }));

    if (eligibleHands.length === 0) continue;
    if (eligibleHands.length === 1) {
      allWinners.push({ playerId: eligibleHands[0].playerId, handName: 'Uncontested', winAmount: sidePot.amount });
      const p = room.players.find((pl) => pl.id === eligibleHands[0].playerId);
      if (p) p.stack += sidePot.amount;
      continue;
    }

    if (gs.board.length < 3) {
      const winner = eligibleHands[0];
      allWinners.push({ playerId: winner.playerId, handName: 'Uncontested', winAmount: sidePot.amount });
      const p = room.players.find((pl) => pl.id === winner.playerId);
      if (p) p.stack += sidePot.amount;
      continue;
    }

    const potWinners = evaluateWinner(eligibleHands, gs.board);
    const shareAmount = Math.floor(sidePot.amount / potWinners.length);

    potWinners.forEach((w) => {
      allWinners.push({ playerId: w.playerId, handName: w.handName, winAmount: shareAmount });
      const p = room.players.find((pl) => pl.id === w.playerId);
      if (p) p.stack += shareAmount;
    });

    const remainder = sidePot.amount - shareAmount * potWinners.length;
    if (remainder > 0 && potWinners.length > 0) {
      const firstWinner = room.players.find((pl) => pl.id === potWinners[0].playerId);
      if (firstWinner) firstWinner.stack += remainder;
    }
  }

  gs.winners = allWinners;
  gs.pot = 0;
  gs.lastAction = allWinners
    .map((w) => {
      const p = room.players.find((pl) => pl.id === w.playerId);
      return `${p?.name ?? w.playerId} wins ${w.winAmount} (${w.handName})`;
    })
    .join(', ');
}

export function calculateSidePots(players: Player[], totalPot: number): SidePot[] {
  const involved = players.filter(
    (p) => p.status !== 'folded' && p.status !== 'sitting-out' && p.totalBetThisHand > 0,
  );

  if (involved.length === 0) {
    return [{ amount: totalPot, eligiblePlayerIds: players.filter((p) => p.status !== 'folded').map((p) => p.id) }];
  }
  if (involved.length === 1) {
    return [{ amount: totalPot, eligiblePlayerIds: [involved[0].id] }];
  }

  const allInBets = [...new Set(involved.filter((p) => p.status === 'all-in').map((p) => p.totalBetThisHand))].sort((a, b) => a - b);
  const maxBet = Math.max(...involved.map((p) => p.totalBetThisHand));

  const levels: number[] = [0];
  for (const amount of allInBets) {
    if (amount > 0 && !levels.includes(amount)) levels.push(amount);
  }
  if (levels[levels.length - 1] !== maxBet) levels.push(maxBet);

  const sidePots: SidePot[] = [];
  let prevLevel = 0;

  for (const level of levels) {
    if (level === 0) { prevLevel = 0; continue; }
    if (level <= prevLevel) continue;

    const eligible = involved.filter((p) => p.totalBetThisHand >= level);
    if (eligible.length === 0) continue;

    let potAmount = 0;
    for (const p of involved) {
      const contribution = Math.min(level, p.totalBetThisHand) - Math.min(prevLevel, p.totalBetThisHand);
      potAmount += Math.max(0, contribution);
    }

    if (potAmount > 0) {
      sidePots.push({ amount: potAmount, eligiblePlayerIds: eligible.map((p) => p.id) });
    }
    prevLevel = level;
  }

  const accounted = sidePots.reduce((sum, sp) => sum + sp.amount, 0);
  if (accounted < totalPot) {
    sidePots.push({ amount: totalPot - accounted, eligiblePlayerIds: involved.map((p) => p.id) });
  }

  if (sidePots.length === 0) {
    return [{ amount: totalPot, eligiblePlayerIds: involved.map((p) => p.id) }];
  }

  return sidePots;
}

export function getAvailableActions(room: Room, playerIndex: number): ActionType[] {
  const gs = room.gameState;
  if (!gs) return [];

  const player = room.players[playerIndex];
  if (player.status !== 'active') return [];

  const actions: ActionType[] = [];

  // Can always fold
  actions.push('fold');

  // Check or Call?
  const canCheck = player.currentBet >= gs.currentBet;
  if (canCheck) {
    actions.push('check');
  } else {
    actions.push('call');
  }

  // Can raise? Need enough chips above the current bet
  const minRaiseTotal = gs.currentBet + gs.minRaise;
  const maxTotal = player.stack + player.currentBet;

  if (maxTotal > gs.currentBet) {
    if (maxTotal >= minRaiseTotal) {
      actions.push('raise');
    }
    // All-in is always available if we have any chips left
    actions.push('all-in');
  }

  return actions;
}

export function autoFoldDisconnected(room: Room): void {
  const gs = room.gameState;
  if (!gs) return;

  for (const p of room.players) {
    if (p.status === 'disconnected' && p.isCurrentTurn) {
      p.status = 'folded';
      p.cards = [];
      gs.lastAction = `${p.name} folds (disconnected)`;
      advanceGame(room, gs);
      return;
    }
  }
}

function findNextSeat(room: Room, fromIndex: number, predicate: (p: Player) => boolean): number {
  const n = room.players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (fromIndex + i) % n;
    if (predicate(room.players[idx])) return idx;
  }
  return fromIndex;
}

function getActingOrder(room: Room): Player[] {
  const dealerIdx = room.gameState?.dealerIndex ?? 0;
  const n = room.players.length;
  const ordered: Player[] = [];
  for (let i = 1; i <= n; i++) {
    const idx = (dealerIdx + i) % n;
    const p = room.players[idx];
    if (p.status === 'active' || p.status === 'all-in') {
      ordered.push(p);
    }
  }
  return ordered;
}

function updateCurrentTurn(room: Room): void {
  if (!room.gameState) return;
  room.players.forEach((p) => (p.isCurrentTurn = false));
  const idx = room.gameState.currentPlayerIndex;
  if (idx >= 0 && idx < room.players.length && room.players[idx].status === 'active') {
    room.players[idx].isCurrentTurn = true;
  }
}

export function prepareNextHand(room: Room): boolean {
  room.players = room.players.filter((p) => p.stack > 0);

  if (room.ownerId) {
    const ownerStillHere = room.players.some((p) => p.userId === room.ownerId);
    if (!ownerStillHere && room.players.length > 0) {
      room.ownerId = room.players[0].userId;
    }
  }

  room.players.forEach((p) => {
    if (p.status === 'folded' || p.status === 'all-in') {
      p.status = 'active';
    }
    p.currentBet = 0;
    p.totalBetThisHand = 0;
    p.hasActedThisRound = false;
    p.isDealer = false;
    p.isSmallBlind = false;
    p.isBigBlind = false;
    p.isCurrentTurn = false;
    p.cards = [];
  });

  const eligible = room.players.filter((p) => p.status === 'active' && p.stack > 0);
  if (eligible.length < 2) return false;
  return true;
}

/**
 * Deals one more community street (burn + deal) during a run-out.
 * Returns true if more streets remain (board length < 5), false if done.
 */
export function runOutNextStreet(room: Room): boolean {
  const gs = room.gameState;
  if (!gs) return false;

  const deck = gs.deck;

  switch (gs.phase) {
    case 'pre-flop':
      dealCards(deck, 1);
      gs.board.push(...dealCards(deck, 3));
      gs.phase = 'flop';
      gs.lastAction = '--- Flop ---';
      break;
    case 'flop':
      dealCards(deck, 1);
      gs.board.push(...dealCards(deck, 1));
      gs.phase = 'turn';
      gs.lastAction = '--- Turn ---';
      break;
    case 'turn':
      dealCards(deck, 1);
      gs.board.push(...dealCards(deck, 1));
      gs.phase = 'river';
      gs.lastAction = '--- River ---';
      break;
    default:
      return false;
  }

  return gs.board.length < 5;
}

export function resolveHand(room: Room): void {
  const gs = room.gameState;
  if (!gs) return;
  endHand(room, gs);
}