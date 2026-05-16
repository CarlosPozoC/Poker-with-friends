'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { getAudioManager } from '@/lib/audioManager';

export default function HomePage() {
  const router = useRouter();
  const setAuth = useGameStore((s) => s.setAuth);
  const setRoomCode = useGameStore((s) => s.setRoomCode);
  const token = useGameStore((s) => s.token);
  const userName = useGameStore((s) => s.userName);
  const avatarUrl = useGameStore((s) => s.avatarUrl);
  const setAvatarUrl = useGameStore((s) => s.setAvatarUrl);
  const error = useGameStore((s) => s.error);
  const setError = useGameStore((s) => s.setError);

  const [isLogin, setIsLogin] = useState(true);
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const unlockAudio = useCallback(() => {
    getAudioManager().unlock();
  }, []);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUserId = localStorage.getItem('userId');
    const savedUserName = localStorage.getItem('userName');
    const savedAvatarUrl = localStorage.getItem('avatarUrl');
    if (savedToken && savedUserId && savedUserName) {
      setAuth(savedToken, savedUserId, savedUserName, savedAvatarUrl ?? undefined);
    }
  }, [setAuth]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin ? { username, password } : { username, password };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('userName', data.user.username);
      if (data.user.avatarUrl) {
        localStorage.setItem('avatarUrl', data.user.avatarUrl);
      }
      setAuth(data.token, data.user.id, data.user.username, data.user.avatarUrl);
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Image too large. Max 2MB.');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      setError('Only JPG, PNG, and WebP images are allowed.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch(`${API_URL}/api/user/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Upload failed');
        return;
      }

      const fullUrl = `${API_URL}${data.avatarUrl}`;
      localStorage.setItem('avatarUrl', fullUrl);
      setAvatarUrl(fullUrl);
    } catch (err: any) {
      setError(err.message || 'Upload error');
    } finally {
      setUploading(false);
    }
  };

  const handleJoinRoom = () => {
    if (!token) { setError('Please log in first'); return; }
    if (!roomCodeInput.trim()) return;
    unlockAudio();
    setRoomCode(roomCodeInput.toUpperCase());
    router.push('/game');
  };

  const handleCreateRoom = () => {
    if (!token) { setError('Please log in first'); return; }
    unlockAudio();
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomCode(code);
    router.push('/game');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700/50">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-amber-400 tracking-tight">
            Texas Hold&apos;em
          </h1>
          <p className="text-gray-500 text-sm mt-1">Multiplayer Poker</p>
        </div>

        {!token ? (
          <form onSubmit={handleAuth} className="space-y-4 mb-6">
            <h2 className="text-xl font-semibold text-white">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h2>

            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 border border-gray-600/50"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 border border-gray-600/50"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 rounded-xl font-bold disabled:opacity-50 transition-all"
            >
              {loading ? '...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>

            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-sm text-blue-400 hover:underline"
            >
              {isLogin ? 'Need an account? Register' : 'Already have an account? Sign in'}
            </button>
          </form>
        ) : (
          <div className="mb-6 p-4 bg-gray-700/30 rounded-xl border border-green-800/50 space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400/30 flex-shrink-0 bg-gray-700 cursor-pointer hover:ring-2 hover:ring-amber-400/50 transition-all"
                onClick={() => fileInputRef.current?.click()}
                title="Click to change avatar"
              >
                {uploading ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-600">
                    <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt={userName ?? ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-gray-900 text-lg font-black">
                    {userName?.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-green-400 text-sm">Signed in as <strong>{userName}</strong></p>
                <p className="text-gray-500 text-xs mt-0.5">Click avatar to upload photo</p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
        )}

        {error && <div className="text-red-400 text-sm mb-4 text-center">{error}</div>}

        {token && (
          <div className="border-t border-gray-700 pt-6 space-y-4">
            <h3 className="text-white font-semibold text-lg text-center">Play Poker</h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Room code"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                maxLength={6}
                className="flex-1 px-4 py-2.5 bg-gray-700/50 rounded-xl text-white placeholder-gray-400 uppercase tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600/50 font-mono"
              />
              <button
                onClick={handleJoinRoom}
                disabled={!roomCodeInput.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 rounded-xl font-bold disabled:opacity-50 transition-all"
              >
                Join
              </button>
            </div>

            <div className="flex items-center gap-3 text-gray-500 text-sm">
              <div className="border-t border-gray-700 flex-1" />
              or
              <div className="border-t border-gray-700 flex-1" />
            </div>

            <button
              onClick={handleCreateRoom}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 rounded-xl font-bold text-lg transition-all shadow-lg shadow-amber-500/20"
            >
              Create New Table
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
