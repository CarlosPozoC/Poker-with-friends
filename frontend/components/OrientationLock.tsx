'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw } from 'lucide-react';

export function OrientationLock() {
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    const check = () => {
      setPortrait(window.innerHeight > window.innerWidth);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  return (
    <AnimatePresence>
      {portrait && (
        <motion.div
          className="fixed inset-0 z-[100] bg-gray-950 flex flex-col items-center justify-center gap-6 px-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            animate={{ rotate: [0, -90, -90, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut', times: [0, 0.2, 0.8, 1] }}
          >
            <RotateCw className="w-16 h-16 text-amber-400" />
          </motion.div>
          <p className="text-white text-lg font-semibold text-center">
            Please rotate your device to landscape
          </p>
          <p className="text-gray-400 text-sm text-center">
            This game is best played in horizontal orientation
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
