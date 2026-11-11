import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Sparkles,
  BookOpen,
  Feather,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
  Trophy,
  Repeat,
  Keyboard,
  Compass,
} from 'lucide-react';

export interface Card {
  id: string;
  type: 'rhetorical' | 'vocab';
  term: string;
  definition: string;
  mnemonicTip?: string; // Built-in memory tip
  synonyms?: string;
  antonyms?: string;
  prompt?: string;
  answer?: string;
  sentencePrompt?: string;
  hint?: string;
}

export interface ActiveRecallFlashcardsProps {
  initialCards?: Card[];
  cards?: Card[];
  onComplete?: () => void;
  className?: string;
}

export const ActiveRecallFlashcards: React.FC<ActiveRecallFlashcardsProps> = ({
  initialCards,
  cards,
  onComplete,
  className = '',
}) => {
  const sourceCards = initialCards || cards || [];

  // Queue state for spacing out missed cards ("No" puts them ~4 cards back)
  const [queue, setQueue] = useState<Card[]>(sourceCards);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Settings & Toggles
  const [showDefinitionFirst, setShowDefinitionFirst] = useState(false);
  const [activeRecallEnabled, setActiveRecallEnabled] = useState(false);
  const [cardRecallMode, setCardRecallMode] = useState(false); // ON: Yes/No memory check active. OFF: Yes/No disabled, just click Next

  // Interaction states
  const [userGuess, setUserGuess] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  // Differentiates between vertical upward 3D flip vs smooth instantaneous card next
  const [transitionType, setTransitionType] = useState<'flip' | 'next'>('flip');

  if (queue.length === 0) {
    const isRhetoric = sourceCards[0]?.type === 'rhetorical';
    const accentBg = isRhetoric ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-brand-600 hover:bg-brand-500';

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-3xl mx-auto w-full p-8 sm:p-10 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.08] text-center shadow-xl space-y-6"
      >
        <div
          className={`h-16 w-16 mx-auto rounded-2xl flex items-center justify-center ${
            isRhetoric ? 'bg-emerald-500/10 text-emerald-500' : 'bg-brand-500/10 text-brand-500'
          }`}
        >
          <Trophy className="h-8 w-8" />
        </div>

        <div>
          <h3 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">Deck Completed!</h3>
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mt-1">
            100% Mastery · Accuracy: 100 / 100
          </div>
          <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
            You've successfully committed all {sourceCards.length} cards to memory in this review session.
          </p>
        </div>

        <button
          onClick={() => {
            setTransitionType('next');
            setQueue(sourceCards);
            setCurrentIndex(0);
            setIsFlipped(false);
            setUserGuess('');
          }}
          className={`px-6 py-3 text-white font-semibold text-sm rounded-xl transition shadow-md inline-flex items-center gap-2 ${accentBg}`}
        >
          <RotateCcw className="h-4 w-4" /> Restart Deck
        </button>
      </motion.div>
    );
  }

  const currentCard = queue[currentIndex] || queue[0];
  const isRhetoric = currentCard?.type === 'rhetorical';

  // Section theme accents
  const accentText = isRhetoric
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-brand-600 dark:text-brand-400';
  const accentBg = isRhetoric ? 'bg-emerald-600' : 'bg-brand-600';
  const accentBgHover = isRhetoric ? 'hover:bg-emerald-500' : 'hover:bg-brand-500';
  const accentBorder = isRhetoric
    ? 'border-emerald-500/40 dark:border-emerald-500/50'
    : 'border-brand-500/40 dark:border-brand-500/50';
  const focusBorder = isRhetoric
    ? 'focus:border-emerald-500 focus:ring-emerald-500/20'
    : 'focus:border-brand-500 focus:ring-brand-500/20';

  const toggleFlip = () => {
    if (!activeRecallEnabled || isFlipped) {
      setTransitionType('flip');
      setIsFlipped(!isFlipped);
    }
  };

  const handleCheckAndFlip = () => {
    setTransitionType('flip');
    setIsFlipped(true);
  };

  // Yes / No memory rating handler
  const handleNextCard = (remembered: boolean) => {
    setTransitionType('next');
    setIsFlipped(false);
    setUserGuess('');

    let updatedQueue = [...queue];

    if (!remembered) {
      // If "No", move card ~4 positions back in queue
      const currentCardObj = updatedQueue.splice(currentIndex, 1)[0];
      const reinsertIndex = Math.min(currentIndex + 4, updatedQueue.length);
      updatedQueue.splice(reinsertIndex, 0, currentCardObj);
      setQueue(updatedQueue);
      setCurrentIndex((prev) => (prev >= updatedQueue.length ? 0 : prev));
    } else {
      // If "Yes", remove card from active queue
      updatedQueue.splice(currentIndex, 1);
      setQueue(updatedQueue);
      if (updatedQueue.length === 0 && onComplete) {
        onComplete();
      }
      setCurrentIndex((prev) => (prev >= updatedQueue.length ? 0 : prev));
    }
  };

  // Simple next / prev handler (direct navigation)
  const handleSimpleNext = useCallback(() => {
    setTransitionType('next');
    setIsFlipped(false);
    setUserGuess('');
    setCurrentIndex((prev) => {
      if (prev + 1 >= queue.length) {
        if (onComplete) onComplete();
        return 0;
      }
      return prev + 1;
    });
  }, [queue.length, onComplete]);

  const handleSimplePrev = useCallback(() => {
    setTransitionType('next');
    setIsFlipped(false);
    setUserGuess('');
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  // Keyboard navigation: Space to flip, Left/Right arrow keys for prev/next term
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger shortcuts when user is focused inside an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setTransitionType('flip');
        setIsFlipped((prev) => !prev);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSimpleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSimplePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSimpleNext, handleSimplePrev]);

  const toggleCardRecallMode = () => {
    const nextState = !cardRecallMode;
    setCardRecallMode(nextState);
    if (!nextState) {
      setQueue(sourceCards);
    }
    setTransitionType('next');
    setIsFlipped(false);
    setUserGuess('');
  };

  const cardDefinition = currentCard.definition || currentCard.answer || currentCard.prompt || '';
  const isTermShowing = (!showDefinitionFirst && !isFlipped) || (showDefinitionFirst && isFlipped);
  const tipText = currentCard.mnemonicTip || currentCard.hint;

  return (
    <div
      className={`max-w-3xl mx-auto w-full p-6 sm:p-8 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.08] rounded-3xl shadow-lg shadow-zinc-900/5 dark:shadow-2xl dark:shadow-black/60 transition-colors ${className}`}
    >
      {/* Top Bar: Progress & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium">
            {cardRecallMode ? (
              <>Card {currentIndex + 1} of {queue.length} left</>
            ) : (
              <>Card {currentIndex + 1} of {queue.length}</>
            )}
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">•</span>
          <span className="inline-flex items-center gap-1 font-semibold text-zinc-600 dark:text-zinc-300">
            {isRhetoric ? (
              <>
                <Feather className="h-3.5 w-3.5 text-emerald-500" /> Rhetorical
              </>
            ) : (
              <>
                <BookOpen className="h-3.5 w-3.5 text-brand-500" /> Vocabulary
              </>
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle: Card Recall Mode */}
          <button
            type="button"
            onClick={toggleCardRecallMode}
            title={cardRecallMode ? 'Card Recall: ON (Yes/No memory check enabled)' : 'Card Recall: OFF (Yes/No disabled, direct Next enabled)'}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition inline-flex items-center gap-1.5 ${
              cardRecallMode
                ? `${accentBg} text-white border-transparent shadow-sm`
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Card Recall: {cardRecallMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Toggle: Term -> Def vs Def -> Term */}
          <button
            type="button"
            onClick={() => {
              setTransitionType('next');
              setShowDefinitionFirst(!showDefinitionFirst);
              setIsFlipped(false);
              setUserGuess('');
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 transition inline-flex items-center gap-1.5"
          >
            <Repeat className="h-3.5 w-3.5" />
            <span>{showDefinitionFirst ? 'Def → Term' : 'Term → Def'}</span>
          </button>

          {/* Toggle: Active Recall Typing */}
          <button
            type="button"
            onClick={() => {
              setActiveRecallEnabled(!activeRecallEnabled);
              setIsFlipped(false);
              setUserGuess('');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition inline-flex items-center gap-1.5 ${
              activeRecallEnabled
                ? `${accentBg} text-white border-transparent shadow-sm`
                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Keyboard className="h-3.5 w-3.5" />
            <span>Type Recall: {activeRecallEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* 3D Perspective Flashcard Container with X-axis upward reflection flip */}
      <div style={{ perspective: 1400 }} className="w-full">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${currentCard.id}-${isFlipped ? 'back' : 'front'}`}
            initial={
              transitionType === 'flip'
                ? { rotateX: isFlipped ? 80 : -80, opacity: 0.6 }
                : { opacity: 0.9, rotateX: 0 }
            }
            animate={{
              rotateX: 0,
              opacity: 1,
              transition: {
                duration: transitionType === 'flip' ? 0.2 : 0.08,
                ease: transitionType === 'flip' ? [0.22, 1, 0.36, 1] : 'easeOut',
              },
            }}
            exit={
              transitionType === 'flip'
                ? {
                    rotateX: isFlipped ? -80 : 80,
                    opacity: 0.6,
                    transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] },
                  }
                : { opacity: 0.9, rotateX: 0, transition: { duration: 0.06 } }
            }
            style={{ transformStyle: 'preserve-3d', transformOrigin: 'center center' }}
            onClick={toggleFlip}
            className={`min-h-[380px] sm:min-h-[420px] p-6 sm:p-10 rounded-3xl border flex flex-col justify-between transition-all select-none ${
              isFlipped
                ? `${accentBorder} bg-zinc-50/90 dark:bg-zinc-900/90 shadow-md`
                : 'border-zinc-200 dark:border-zinc-800/90 bg-zinc-50/50 dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700'
            } ${!activeRecallEnabled || isFlipped ? 'cursor-pointer' : ''}`}
          >
            {/* Top metadata tag */}
            <div className="flex items-center justify-between w-full mb-3">
              <span
                className={`text-[11px] uppercase tracking-widest font-bold ${
                  isFlipped ? accentText : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {isFlipped
                  ? 'Answer & Details'
                  : showDefinitionFirst
                  ? 'Definition Prompt'
                  : 'Target Term'}
              </span>

              <span className="text-[10px] text-zinc-400 font-mono uppercase px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800">
                {isFlipped ? 'Back' : 'Front'}
              </span>
            </div>

            {/* Centered Main Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center text-center my-4 w-full">
              {isTermShowing ? (
                <div className="py-6 sm:py-8">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
                    {currentCard.term}
                  </h2>
                </div>
              ) : (
                <div className="space-y-4 max-w-xl mx-auto py-2">
                  {isFlipped && (
                    <div className="inline-block px-4 py-1.5 rounded-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm mb-1">
                      <span className={`text-base sm:text-lg font-extrabold tracking-tight ${accentText}`}>
                        {currentCard.term}
                      </span>
                    </div>
                  )}
                  <p className="text-base sm:text-lg text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed whitespace-pre-line">
                    {cardDefinition}
                  </p>

                  {/* Synonyms & Antonyms (for vocabulary words) */}
                  {(currentCard.synonyms || currentCard.antonyms) && (
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-4 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 text-xs w-full max-w-lg">
                      {currentCard.synonyms && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                          <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Syn:
                          </span>
                          <span className="font-medium">{currentCard.synonyms}</span>
                        </div>
                      )}
                      {currentCard.antonyms && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300">
                          <span className="font-bold text-[10px] uppercase tracking-wider text-rose-600 dark:text-rose-400">
                            Ant:
                          </span>
                          <span className="font-medium">{currentCard.antonyms}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Memorization Tip shown on back */}
              {isFlipped && tipText && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 leading-relaxed text-left w-full max-w-xl"
                >
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-amber-700 dark:text-amber-400 mb-1">
                    <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                    <span>Memory Tip / Mnemonic:</span>
                  </div>
                  <span>{tipText}</span>
                </motion.div>
              )}
            </div>

            {/* Active Recall Input (If enabled and not flipped) */}
            {!isFlipped && activeRecallEnabled && (
              <div
                className="mt-4 space-y-2.5 w-full max-w-lg mx-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={userGuess}
                  onChange={(e) => setUserGuess(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCheckAndFlip();
                    }
                  }}
                  placeholder="Type the exact term before flipping..."
                  className={`w-full px-4 py-2.5 rounded-xl text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 transition-all ${focusBorder}`}
                />
                <button
                  type="button"
                  onClick={handleCheckAndFlip}
                  className={`w-full py-2.5 rounded-xl text-white font-semibold text-xs tracking-wide uppercase transition shadow-sm inline-flex items-center justify-center gap-2 ${accentBg} ${accentBgHover}`}
                >
                  <span>Check & Flip</span>
                </button>
              </div>
            )}

            {!isFlipped && !activeRecallEnabled && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500 text-center mt-2 font-medium flex items-center justify-center gap-2">
                <span>Click or <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300">Space</kbd> to flip</span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span><kbd className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300">←</kbd> <kbd className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300">→</kbd> to navigate</span>
              </span>
            )}

            {isFlipped && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500 text-center mt-2 font-medium flex items-center justify-center gap-2">
                <span>Click or <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300">Space</kbd> to flip back</span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span><kbd className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300">←</kbd> <kbd className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300">→</kbd> to navigate</span>
              </span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Controls Section */}
      {!cardRecallMode ? (
        /* CARD RECALL OFF: Yes/No disabled, smooth direct Next / Prev buttons */
        <div className="flex items-center gap-3 mt-5">
          <button
            type="button"
            onClick={handleSimplePrev}
            disabled={currentIndex === 0}
            className="py-3 px-5 rounded-xl text-sm font-semibold border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Prev
          </button>
          <button
            type="button"
            onClick={handleSimpleNext}
            className={`flex-1 py-3 px-5 rounded-xl text-sm font-semibold text-white transition shadow-md inline-flex items-center justify-center gap-2 ${accentBg} ${accentBgHover}`}
          >
            <span>{currentIndex + 1 < queue.length ? 'Next Card' : 'Restart Deck'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        /* CARD RECALL ON: Yes / No Memory Response Buttons (Only when flipped) */
        isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 space-y-2"
          >
            <p className="text-xs text-center text-zinc-500 dark:text-zinc-400 font-medium">
              Did you remember this card?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleNextCard(false)}
                className="py-3 px-4 rounded-xl text-sm font-semibold transition border bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60 dark:hover:bg-rose-900/50 dark:text-rose-300 inline-flex items-center justify-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                <span>No (Review Again)</span>
              </button>
              <button
                type="button"
                onClick={() => handleNextCard(true)}
                className="py-3 px-4 rounded-xl text-sm font-semibold transition border bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:hover:bg-emerald-900/50 dark:text-emerald-300 inline-flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Yes (Got It)</span>
              </button>
            </div>
          </motion.div>
        )
      )}
    </div>
  );
};
