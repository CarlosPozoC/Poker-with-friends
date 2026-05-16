'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClientPlayer, ClientGameState, ActionType, GamePhase } from '@/lib/types';
import { Slider } from '@/components/ui/slider';
import { getAudioManager } from '@/lib/audioManager';

interface ActionPanelProps {
  gameState: ClientGameState;
  myPlayer: ClientPlayer;
  sendAction: (type: ActionType, amount?: number) => void;
}

type QuickBetScenario = 'preflop-open' | 'preflop-3bet' | 'postflop';

function getQuickBetScenario(
  phase: GamePhase,
  myCurrentBet: number,
  callAmount: number,
  bigBlind: number,
): QuickBetScenario {
  if (phase !== 'pre-flop') return 'postflop';
  const currentHighBet = myCurrentBet + callAmount;
  if (currentHighBet <= bigBlind) return 'preflop-open';
  return 'preflop-3bet';
}

function getQuickBets(
  scenario: QuickBetScenario,
  pot: number,
  callAmount: number,
  bigBlind: number,
  minRaise: number,
  maxRaise: number,
  myCurrentBet: number,
): { label: string; amount: number }[] {
  const candidates: { label: string; amount: number }[] = [];
  const currentHighBet = myCurrentBet + callAmount;

  switch (scenario) {
    case 'preflop-open':
      candidates.push(
        { label: '3 BB', amount: 3 * bigBlind },
        { label: '4 BB', amount: 4 * bigBlind },
        { label: '5 BB', amount: 5 * bigBlind },
      );
      break;
    case 'preflop-3bet':
      candidates.push(
        { label: '3x', amount: 3 * currentHighBet },
        { label: '4x', amount: 4 * currentHighBet },
      );
      break;
    case 'postflop': {
      const potAfterCall = pot + callAmount;
      candidates.push(
        { label: '1/2 Pot', amount: callAmount + Math.floor(potAfterCall / 2) },
        { label: '2/3 Pot', amount: callAmount + Math.floor((potAfterCall * 2) / 3) },
        { label: 'Pot', amount: pot + 2 * callAmount },
      );
      break;
    }
  }

  candidates.push({ label: 'All-In', amount: maxRaise });

  return candidates
    .filter((c) => c.amount >= minRaise && c.amount <= maxRaise)
    .sort((a, b) => a.amount - b.amount)
    .filter((c, i, arr) => i === 0 || c.amount !== arr[i - 1].amount);
}

export function ActionPanel({ gameState, myPlayer, sendAction }: ActionPanelProps) {
  const [raiseAmount, setRaiseAmount] = useState(gameState.minRaiseTotal);
  const [showSlider, setShowSlider] = useState(false);
  const [inputText, setInputText] = useState('');

  const minRaise = gameState.minRaiseTotal;
  const maxRaise = myPlayer.stack + myPlayer.currentBet;
  const amountToCall = gameState.callAmount;
  const canCheck = gameState.availableActions.includes('check');
  const canCall = gameState.availableActions.includes('call');
  const canRaise = gameState.availableActions.includes('raise');
  const canAllIn = gameState.availableActions.includes('all-in');
  const canFold = gameState.availableActions.includes('fold');

  const scenario = getQuickBetScenario(gameState.phase, myPlayer.currentBet, amountToCall, gameState.bigBlind);

  const quickBets = getQuickBets(
    scenario,
    gameState.pot,
    amountToCall,
    gameState.bigBlind,
    minRaise,
    maxRaise,
    myPlayer.currentBet,
  );

  const clampRaise = useCallback(
    (value: number) => Math.min(maxRaise, Math.max(minRaise, Math.round(value))),
    [minRaise, maxRaise],
  );

  const syncBoth = useCallback(
    (amount: number) => {
      const clamped = clampRaise(amount);
      setRaiseAmount(clamped);
      setInputText(String(clamped));
    },
    [clampRaise],
  );

  const handleQuickBet = useCallback(
    (amount: number) => syncBoth(amount),
    [syncBoth],
  );

  const handleSliderChange = useCallback(
    (value: number | readonly number[]) => {
      const v = Array.isArray(value) ? value[0] : (value as number);
      syncBoth(v);
    },
    [syncBoth],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setInputText(raw);
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        setRaiseAmount(parsed);
      }
    },
    [],
  );

  const commitInput = useCallback(() => {
    const parsed = parseInt(inputText, 10);
    if (inputText === '' || isNaN(parsed) || parsed < 0) {
      setInputText(String(raiseAmount));
      return;
    }
    syncBoth(parsed);
  }, [inputText, raiseAmount, syncBoth]);

  const handleInputBlur = useCallback(() => commitInput(), [commitInput]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        commitInput();
        sendAction('raise', clampRaise(parseInt(inputText, 10) || raiseAmount));
        setShowSlider(false);
      }
    },
    [commitInput, sendAction, clampRaise, inputText, raiseAmount],
  );

  const handleOpenRaise = useCallback(() => {
    syncBoth(minRaise);
    setShowSlider(true);
  }, [minRaise, syncBoth]);

  const handleConfirm = useCallback(() => {
    getAudioManager().play('chip');
    sendAction('raise', raiseAmount);
    setShowSlider(false);
  }, [sendAction, raiseAmount]);

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-50"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="bg-slate-950/90 backdrop-blur-xl border-t border-white/5 shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-2xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
          <motion.div
            className="text-center mb-1 sm:mb-2"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <span className="text-amber-400 text-[10px] sm:text-[11px] font-black tracking-[0.2em] uppercase">Your Turn</span>
          </motion.div>

          <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-center">
            {canFold && <ActionButton label="Fold" onClick={() => { getAudioManager().play('fold'); sendAction('fold'); }} variant="fold" />}
            {canCheck && <ActionButton label="Check" onClick={() => { getAudioManager().play('check'); sendAction('check'); }} variant="check" />}
            {canCall && <ActionButton label={`Call ${amountToCall}`} onClick={() => { getAudioManager().play('chip'); sendAction('call'); }} variant="call" />}
            {canRaise && <ActionButton label="Raise" onClick={handleOpenRaise} variant="raise" />}
            {canAllIn && !canRaise && (
              <ActionButton label={`All-in ${myPlayer.stack}`} onClick={() => { getAudioManager().play('chip'); sendAction('all-in'); }} variant="allin" />
            )}
            {canAllIn && canRaise && (
              <ActionButton label="All-in" onClick={() => { getAudioManager().play('chip'); sendAction('all-in'); }} variant="allinSmall" />
            )}
          </div>

          <AnimatePresence>
            {showSlider && canRaise && (
              <motion.div
                className="mt-3 bg-slate-900/80 rounded-xl px-5 py-3 border border-white/10"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {quickBets.length > 0 && (
                  <div className="flex gap-1.5 mb-3 flex-wrap justify-center">
                    {quickBets.map((qb) => {
                      const isActive = qb.amount === raiseAmount;
                      return (
                        <button
                          key={qb.label}
                          onClick={() => handleQuickBet(qb.amount)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                            isActive
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-400/40 shadow-[0_0_8px_rgba(251,191,36,0.15)]'
                              : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {qb.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-3">
                  <span className="text-gray-400 text-[10px] sm:text-xs font-mono w-12 sm:w-16 text-right">{minRaise.toLocaleString()}</span>
                  <Slider
                    min={minRaise}
                    max={maxRaise}
                    value={[raiseAmount]}
                    onValueChange={handleSliderChange}
                    step={gameState.bigBlind}
                    className="flex-1"
                  />
                  <span className="text-gray-400 text-[10px] sm:text-xs font-mono w-12 sm:w-16">{maxRaise.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-gray-400 text-xs sm:text-sm font-mono">$</span>
                    <input
                      type="number"
                      value={inputText}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      onKeyDown={handleInputKeyDown}
                      min={minRaise}
                      max={maxRaise}
                      step={gameState.bigBlind}
                      className="w-24 sm:w-28 px-2 sm:px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-amber-400 font-bold text-base sm:text-lg text-center tabular-nums focus:outline-none focus:border-amber-400/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="flex gap-1.5 sm:gap-2">
                    <button
                      onClick={handleConfirm}
                      className="px-3 sm:px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 rounded-lg font-bold text-xs sm:text-sm text-white transition-all active:scale-95 min-h-[44px] sm:min-h-0"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setShowSlider(false)}
                      className="px-3 sm:px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs sm:text-sm text-gray-300 transition-all min-h-[44px] sm:min-h-0"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function ActionButton({ label, onClick, variant }: { label: string; onClick: () => void; variant: 'fold' | 'check' | 'call' | 'raise' | 'allin' | 'allinSmall' }) {
  const styles: Record<string, string> = {
    fold: 'bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white',
    check: 'bg-gradient-to-b from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 text-gray-900',
    call: 'bg-gradient-to-b from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 text-white',
    raise: 'bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white',
    allin: 'bg-gradient-to-b from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 text-white',
    allinSmall: 'bg-gradient-to-b from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white/80',
  };

  return (
    <motion.button
      className={`px-3 sm:px-5 py-2.5 sm:py-2.5 min-h-[44px] sm:min-h-0 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all active:scale-95 ${styles[variant]} ${
        variant === 'allinSmall' ? 'px-2 sm:px-4 text-[10px] sm:text-xs' : ''
      } ${
        variant === 'allin' ? 'min-w-[90px] sm:min-w-[100px]' :
        variant === 'call' ? 'min-w-[90px] sm:min-w-[100px]' :
        'min-w-[65px] sm:min-w-[80px]'
      }`}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {label}
    </motion.button>
  );
}
