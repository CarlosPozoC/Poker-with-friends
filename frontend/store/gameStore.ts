'use client';

import { create } from 'zustand';
import { ClientGameState } from '@/lib/types';

interface GameStore {
  token: string | null;
  userId: string | null;
  userName: string | null;
  avatarUrl: string | null;
  roomCode: string | null;
  gameState: ClientGameState | null;
  error: string | null;

  setAuth: (token: string, userId: string, userName: string, avatarUrl?: string) => void;
  setRoomCode: (code: string | null) => void;
  setGameState: (state: ClientGameState) => void;
  setError: (error: string | null) => void;
  setAvatarUrl: (url: string | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>()((set) => ({
  token: null,
  userId: null,
  userName: null,
  avatarUrl: null,
  roomCode: null,
  gameState: null,
  error: null,

  setAuth: (token, userId, userName, avatarUrl) => set({ token, userId, userName, avatarUrl: avatarUrl ?? null }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setGameState: (gameState) => set({ gameState, error: null }),
  setError: (error) => set({ error }),
  setAvatarUrl: (avatarUrl) => set({ avatarUrl }),
  reset: () =>
    set({
      token: null,
      userId: null,
      userName: null,
      avatarUrl: null,
      roomCode: null,
      gameState: null,
      error: null,
    }),
}));