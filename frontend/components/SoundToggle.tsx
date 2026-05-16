'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';
import { getAudioManager } from '@/lib/audioManager';

export function SoundToggle() {
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const audio = getAudioManager();
    setMuted(audio.muted);
    setVolume(audio.volume);
  }, []);

  const handleToggle = useCallback(() => {
    const audio = getAudioManager();
    const newMuted = audio.toggleMute();
    setMuted(newMuted);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    const audio = getAudioManager();
    audio.volume = v;
    audio.muted = false;
    setVolume(v);
    setMuted(false);
  }, []);

  const Icon = muted ? VolumeX : volume > 0.5 ? Volume2 : Volume1;

  return (
    <motion.div
      className="fixed top-3 right-3 z-50 flex items-center gap-2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 }}
      onHoverStart={() => setVisible(true)}
      onHoverEnd={() => setVisible(false)}
    >
      <button
        onClick={handleToggle}
        className="p-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:bg-black/60 transition-all"
        title={muted ? 'Unmute' : 'Mute'}
      >
        <Icon className="w-4 h-4" />
      </button>

      <motion.div
        className="overflow-hidden"
        animate={{ width: visible ? 80 : 0, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={muted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-amber-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400"
        />
      </motion.div>
    </motion.div>
  );
}
