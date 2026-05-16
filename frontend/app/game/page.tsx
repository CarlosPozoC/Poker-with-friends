'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { getAudioManager } from '@/lib/audioManager';
import { useGameAudio } from '@/hooks/useGameAudio';
import { ClientGameState } from '@/lib/types';
import { PokerTable } from '@/components/PokerTable';
import { SoundToggle } from '@/components/SoundToggle';
import { FullscreenButton } from '@/components/FullscreenButton';
import { OrientationLock } from '@/components/OrientationLock';

export default function GamePage() {
  const router = useRouter();
  const roomCode = useGameStore((s) => s.roomCode);
  const userId = useGameStore((s) => s.userId);
  const userName = useGameStore((s) => s.userName);
  const token = useGameStore((s) => s.token);
  const setGameState = useGameStore((s) => s.setGameState);
  const setError = useGameStore((s) => s.setError);
  const error = useGameStore((s) => s.error);

  const joinedRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const [bustedMsg, setBustedMsg] = useState<string | null>(null);

  useGameAudio();

  const unlockAudio = useCallback(() => {
    getAudioManager().unlock();
  }, []);

  useEffect(() => {
    if (!roomCode || !userId || !userName || !token) {
      router.push('/');
      return;
    }

    const socket = getSocket();

    if (!joinedRef.current) {
      joinedRef.current = true;

      socket.on('connect', () => {
        console.log('[Socket] Connected:', socket.id);
        setConnected(true);
        socket.emit('join_room', { roomCode, userId, userName });
      });

      socket.on('game_state_update', (state: ClientGameState) => {
        console.log('[Game] State update:', state.phase, 'myPlayerId:', state.myPlayerId, 'currentTurnId:', state.currentPlayerId, 'actions:', state.availableActions);
        setGameState(state);
      });

      socket.on('hand_result', (data) => {
        console.log('[Game] Hand result:', data);
        getAudioManager().play('showdown');
      });

      socket.on('error_message', (data) => {
        console.error('[Game] Error:', data.message);
        setError(data.message);
        getAudioManager().play('error');
        setTimeout(() => setError(null), 5000);
      });

      socket.on('player_busted', (data: { playerId: string; message: string }) => {
        console.log('[Game] Player busted:', data);
        setBustedMsg(data.message);
        getAudioManager().play('bust');
        setTimeout(() => {
          disconnectSocket();
          router.push('/');
        }, 3000);
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });

      socket.on('connect_error', () => {
        setConnected(false);
      });

      socket.connect();
    }

    return () => {
      socket.off('connect');
      socket.off('game_state_update');
      socket.off('hand_result');
      socket.off('error_message');
      socket.off('player_busted');
      socket.off('disconnect');
      socket.off('connect_error');
      disconnectSocket();
      joinedRef.current = false;
    };
  }, [roomCode, userId, userName, token, router, setGameState, setError]);

  const gameState = useGameStore((s) => s.gameState);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex flex-col" onClick={unlockAudio}>
      <OrientationLock />
      {/* Top bar */}
      <div className="w-full bg-gray-900/80 border-b border-gray-800/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex justify-between items-center px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="text-amber-400 font-mono text-sm font-bold bg-gray-800 px-3 py-1 rounded-lg border border-amber-900/40">
              {roomCode}
            </span>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 shadow shadow-green-400/50' : 'bg-red-500 shadow shadow-red-400/50'}`} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs hidden sm:inline">{userName}</span>
            <FullscreenButton />
            <SoundToggle />
            <button onClick={() => { disconnectSocket(); router.push('/'); }} className="text-red-400/70 hover:text-red-300 text-xs border border-red-900/40 px-2 py-1 rounded-lg hover:bg-red-900/20 transition-colors">
              Leave
            </button>
          </div>
        </div>
      </div>

      <SoundToggle />

      {/* Error toast */}
      {error && <div className="bg-red-900/90 border border-red-700/50 text-red-200 px-6 py-2 rounded-xl text-sm text-center max-w-lg mx-auto mt-2 shadow-lg">{error}</div>}

      {/* Busted toast */}
      {bustedMsg && <div className="bg-gray-900/95 border border-red-500/60 text-red-300 px-8 py-4 rounded-2xl text-lg text-center max-w-md mx-auto mt-4 shadow-2xl animate-pulse">{bustedMsg}</div>}

      {/* Game area */}
      <div className="flex-1 flex items-start justify-center pt-2 px-2">
        <div className="w-full max-w-5xl">
          <PokerTable />
        </div>
      </div>
    </div>
  );
}