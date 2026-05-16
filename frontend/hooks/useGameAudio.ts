'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { getAudioManager } from '@/lib/audioManager';
import type { ClientGameState } from '@/lib/types';

function detectAction(prev: ClientGameState | null, next: ClientGameState): string | null {
  if (!prev || prev.lastAction === next.lastAction) return null;
  const msg = next.lastAction.toLowerCase();
  if (msg.includes('fold')) return 'fold';
  if (msg.includes('all-in') || msg.includes('allin')) return 'allin';
  if (msg.includes('raise')) return 'raise';
  if (msg.includes('call')) return 'call';
  if (msg.includes('check')) return 'check';
  return null;
}

function getDealCount(prev: ClientGameState | null, next: ClientGameState): number {
  if (!prev) return 0;
  if (prev.phase === next.phase) return 0;
  switch (next.phase) {
    case 'pre-flop': return 2;
    case 'flop': return 3;
    case 'turn': return 1;
    case 'river': return 1;
    default: return 0;
  }
}

function hasPhaseChangedToShowdown(prev: ClientGameState | null, next: ClientGameState): boolean {
  if (!prev) return false;
  return prev.phase !== 'showdown' && next.phase === 'showdown';
}

function detectWin(prev: ClientGameState | null, next: ClientGameState, myPlayerId: string): 'win' | 'lose' | null {
  if (!prev?.winners && next.winners && next.winners.length > 0) {
    const iWon = next.winners.some((w) => w.playerId === myPlayerId);
    return iWon ? 'win' : 'lose';
  }
  return null;
}

function detectMyTurn(prev: ClientGameState | null, next: ClientGameState, myPlayerId: string): boolean {
  if (!prev) return false;
  if (next.phase === 'waiting' || next.phase === 'showdown') return false;
  const wasMyTurn = prev.currentPlayerId === myPlayerId;
  const isMyTurn = next.currentPlayerId === myPlayerId;
  return !wasMyTurn && isMyTurn;
}

export function useGameAudio() {
  const gameState = useGameStore((s) => s.gameState);
  const prevRef = useRef<ClientGameState | null>(null);

  useEffect(() => {
    if (!gameState) {
      prevRef.current = null;
      return;
    }

    const prev = prevRef.current;
    const audio = getAudioManager();
    const myPlayerId = gameState.myPlayerId;

    // Deal cards with count
    const dealCount = getDealCount(prev, gameState);
    if (dealCount > 0) {
      audio.playRepeated('deal', dealCount, 130);
    }

    // Showdown phase change
    if (hasPhaseChangedToShowdown(prev, gameState)) {
      audio.play('showdown');
    }

    // Action sounds (fold/check → sound; call/raise/allin → chip sound)
    const action = detectAction(prev, gameState);
    if (action === 'fold') {
      audio.play('fold');
    } else if (action === 'check') {
      audio.play('check');
    } else if (action === 'call' || action === 'raise' || action === 'allin') {
      audio.play('chip');
    }

    // My turn alert
    if (detectMyTurn(prev, gameState, myPlayerId)) {
      audio.play('turn-alert');
    }

    // Win/lose
    const winResult = detectWin(prev, gameState, myPlayerId);
    if (winResult) {
      audio.play(winResult);
    }

    prevRef.current = gameState;
  }, [gameState]);
}
