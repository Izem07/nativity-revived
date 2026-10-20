import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  Flame,
  ArrowRight,
  HelpCircle,
  BookOpen,
  LayoutGrid,
  Target,
  Shuffle,
  Feather,
  Info
} from 'lucide-react';
import { RhetoricalSentenceItem, RhetoricalDistractorSentence } from '../services/geminiService';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';

interface RhetoricalSentenceGameProps {
  sentenceMatches: RhetoricalSentenceItem[];
  rhetoricalTerms?: string[];
  onBackToMenu?: () => void;
}

interface SentenceOption {
  id: string;
  sentence: string;
  isCorrect: boolean;
  deviceOrReason?: string;
}

export function RhetoricalSentenceGame({
  sentenceMatches,
  rhetoricalTerms = [],
  onBackToMenu,
}: RhetoricalSentenceGameProps) {
  const [gameMode, setGameMode] = useState<'guess' | 'board'>('guess');

  // Filter valid items
  const validItems = useMemo(() => {
    return sentenceMatches.filter(
      (item) => item && item.term && item.targetSentence && Array.isArray(item.distractorSentences)
    );
  }, [sentenceMatches]);

  if (!validItems.length) {
    return (
      <Card className="max-w-2xl mx-auto p-8 text-center bg-slate-900/80 border-slate-800">
        <Feather className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No Sentence Match Data Available</h3>
        <p className="text-slate-400 mb-6">
          Generate rhetorical devices to unlock the interactive sentence guessing challenge.
        </p>
        {onBackToMenu && (
          <Button onClick={onBackToMenu} variant="outline">
            Return to Study Overview
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/70 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/20 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
            <Target className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
              Rhetorical Sentence Challenge
            </h2>
            <p className="text-xs text-slate-400">
              Guess and match which sentence exhibits each target rhetorical device.
            </p>
          </div>
        </div>

        {/* View Mode Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-white/10">
          <button
            onClick={() => setGameMode('guess')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              gameMode === 'guess'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            Guess Sentence
          </button>
          <button
            onClick={() => setGameMode('board')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              gameMode === 'board'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Match Board
          </button>
        </div>
      </div>

      {/* Main Game Mode Body */}
      {gameMode === 'guess' ? (
        <GuessSentenceChallenge items={validItems} />
      ) : (
        <SentenceMatchBoard items={validItems} />
      )}
    </div>
  );
}

// ==========================================
// MODE 1: GUESS THE SENTENCE CHALLENGE
// ==========================================
function GuessSentenceChallenge({ items }: { items: RhetoricalSentenceItem[] }) {
  const [shuffledItems, setShuffledItems] = useState<RhetoricalSentenceItem[]>(() => [...items]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [disabledOptionIds, setDisabledOptionIds] = useState<Set<string>>(new Set());
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentItem = shuffledItems[currentIndex];

  // Prepare 4 randomized sentence options (1 target, 3 distractors)
  const currentOptions: SentenceOption[] = useMemo(() => {
    if (!currentItem) return [];
    const correctOption: SentenceOption = {
      id: `target-${currentItem.term}`,
      sentence: currentItem.targetSentence,
      isCorrect: true,
      deviceOrReason: currentItem.explanation,
    };

    const distractorOptions: SentenceOption[] = (currentItem.distractorSentences || []).slice(0, 3).map((d, i) => ({
      id: `distractor-${i}`,
      sentence: d.sentence,
      isCorrect: false,
      deviceOrReason: d.deviceOrReason || 'This sentence does not demonstrate the target device.',
    }));

    const all = [correctOption, ...distractorOptions];
    // Deterministic shuffle per round
    return all
      .map((opt) => ({ opt, sort: Math.sin(currentItem.term.length + opt.sentence.length * 13) }))
      .sort((a, b) => a.sort - b.sort)
      .map((x) => x.opt);
  }, [currentItem]);

  // Reset round state when index changes
  useEffect(() => {
    setSelectedOptionId(null);
    setIsCorrect(null);
    setDisabledOptionIds(new Set());
    setFeedbackMessage(null);
    setShowHint(false);
  }, [currentIndex]);

  const handleSelectOption = (option: SentenceOption) => {
    if (isCorrect === true || disabledOptionIds.has(option.id)) return;

    setSelectedOptionId(option.id);

    if (option.isCorrect) {
      setIsCorrect(true);
      const newScore = score + (disabledOptionIds.size === 0 ? 1 : 0.5);
      setScore(newScore);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);
      setFeedbackMessage('Correct! You identified the sentence with accuracy!');
    } else {
      setIsCorrect(false);
      setStreak(0);
      setDisabledOptionIds((prev) => new Set(prev).add(option.id));
      setFeedbackMessage(
        option.deviceOrReason
          ? `Not quite: ${option.deviceOrReason} Try another sentence!`
          : 'Incorrect. Try another sentence!'
      );
    }
  };

  const handleNext = () => {
    if (currentIndex < shuffledItems.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    // Shuffle items
    const reshuffled = [...items].sort(() => Math.random() - 0.5);
    setShuffledItems(reshuffled);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setIsCompleted(false);
    setSelectedOptionId(null);
    setIsCorrect(null);
    setDisabledOptionIds(new Set());
  };

  // Completion Screen
  if (isCompleted) {
    const accuracy = Math.round((score / shuffledItems.length) * 100);
    let title = 'Rhetorical Apprentice';
    let badgeColor = 'from-teal-400 to-emerald-500';
    if (accuracy >= 90) {
      title = 'AP Lang Rhetorical Virtuoso';
      badgeColor = 'from-amber-400 to-yellow-500';
    } else if (accuracy >= 75) {
      title = 'Master Rhetorician';
      badgeColor = 'from-emerald-400 to-teal-400';
    }

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-8 text-center space-y-6 backdrop-blur shadow-2xl"
      >
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
          <Trophy className="h-12 w-12 text-amber-400 animate-bounce" />
        </div>

        <div className="space-y-2">
          <Badge className={`bg-gradient-to-r ${badgeColor} text-slate-950 font-bold px-3 py-1 text-sm`}>
            {title}
          </Badge>
          <h2 className="text-3xl font-extrabold text-white">Challenge Completed!</h2>
          <p className="text-slate-400 max-w-md mx-auto text-sm">
            You tested your rhetorical identification across {shuffledItems.length} rhetorical devices.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5">
            <div className="text-2xl font-bold text-emerald-400">{score.toFixed(1)}</div>
            <div className="text-xs text-slate-400">Total Score</div>
          </div>
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5">
            <div className="text-2xl font-bold text-teal-400">{accuracy}%</div>
            <div className="text-xs text-slate-400">Accuracy</div>
          </div>
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5">
            <div className="text-2xl font-bold text-amber-400 flex items-center justify-center gap-1">
              <Flame className="h-5 w-5 fill-amber-400" />
              {maxStreak}
            </div>
            <div className="text-xs text-slate-400">Best Streak</div>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleRestart} variant="primary" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold">
            <RotateCcw className="mr-2 h-4 w-4" /> Play Again
          </Button>
        </div>
      </motion.div>
    );
  }

  const progressPercent = ((currentIndex + 1) / shuffledItems.length) * 100;

  return (
    <div className="space-y-6">
      {/* Round Status Bar */}
      <div className="flex items-center justify-between px-2 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">Term {currentIndex + 1}</span> of{' '}
          {shuffledItems.length}
        </div>

        <div className="flex items-center gap-4">
          {streak > 1 && (
            <div className="flex items-center gap-1 text-amber-400 font-bold text-xs bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
              <Flame className="h-3.5 w-3.5 fill-amber-400" />
              {streak} Streak!
            </div>
          )}
          <div className="text-emerald-400 font-medium text-xs">
            Score: <span className="font-bold text-white">{score.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Target Rhetorical Device Card */}
      <motion.div
        key={`card-${currentItem.term}`}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 p-6 sm:p-8 border border-emerald-500/30 shadow-xl"
      >
        <div className="absolute top-0 right-0 p-8 pointer-events-none opacity-5">
          <Feather className="h-48 w-48 text-emerald-400" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center space-y-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 text-xs">
              Target Rhetorical Device
            </Badge>
            <button
              onClick={() => setShowHint((prev) => !prev)}
              className="text-xs text-slate-400 hover:text-emerald-300 flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-white/5"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              {showHint ? 'Hide Clue' : 'Need a Clue?'}
            </button>
          </div>

          <h3 className="text-3xl sm:text-4xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-200">
            {currentItem.term}
          </h3>

          <AnimatePresence>
            {showHint && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-teal-300/90 bg-teal-950/40 border border-teal-500/20 px-4 py-2 rounded-xl max-w-lg mx-auto"
              >
                <span className="font-semibold text-teal-200">Key Feature to Look For: </span>
                {currentItem.keyFeature || 'Look for characteristic syntax, repetition, or figurative structure.'}
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-slate-300 text-sm sm:text-base font-medium max-w-xl">
            Which of the following sentences exemplifies{' '}
            <strong className="text-emerald-400 font-bold">{currentItem.term}</strong>?
          </p>
        </div>
      </motion.div>

      {/* 4 Sentence Choices Grid */}
      <div className="grid grid-cols-1 gap-3.5">
        {currentOptions.map((option, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isSelected = selectedOptionId === option.id;
          const isDisabled = disabledOptionIds.has(option.id);
          const isTargetCorrect = isCorrect === true && option.isCorrect;

          let cardStyle =
            'bg-slate-900/80 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 hover:shadow-emerald-500/5';
          let letterBg = 'bg-slate-800 text-slate-300';

          if (isTargetCorrect) {
            cardStyle = 'bg-emerald-950/40 border-emerald-500/80 shadow-lg shadow-emerald-500/10';
            letterBg = 'bg-emerald-500 text-slate-950 font-bold';
          } else if (isDisabled) {
            cardStyle = 'bg-slate-950/40 border-rose-900/40 opacity-40 cursor-not-allowed';
            letterBg = 'bg-rose-900/40 text-rose-300';
          }

          return (
            <motion.div
              key={option.id}
              whileHover={!isDisabled && isCorrect !== true ? { scale: 1.01 } : {}}
              whileTap={!isDisabled && isCorrect !== true ? { scale: 0.99 } : {}}
              transition={{ duration: 0.15 }}
            >
              <div
                onClick={() => handleSelectOption(option)}
                className={`flex items-start gap-4 p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${cardStyle}`}
              >
                <div
                  className={`flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-sm font-semibold transition-all ${letterBg}`}
                >
                  {isTargetCorrect ? <CheckCircle2 className="h-5 w-5" /> : isDisabled ? <XCircle className="h-5 w-5" /> : letter}
                </div>

                <div className="flex-1 text-left space-y-1">
                  <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-serif">
                    “{option.sentence}”
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Dynamic Feedback Banner */}
      <AnimatePresence>
        {feedbackMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl border flex items-start gap-3 ${
              isCorrect
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}
          >
            {isCorrect ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs sm:text-sm">
              <span className="font-semibold block mb-0.5">
                {isCorrect ? 'Spot On!' : 'Incorrect Match'}
              </span>
              <span>{feedbackMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Explanation Box Revealed when Correct */}
      <AnimatePresence>
        {isCorrect && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-3 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <Sparkles className="h-4 w-4" />
                Rhetorical Breakdown & Analysis
              </div>
              {currentItem.keyFeature && (
                <span className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  {currentItem.keyFeature}
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {currentItem.explanation}
            </p>

            <div className="pt-2 flex justify-end">
              <Button
                onClick={handleNext}
                variant="primary"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 shadow-lg shadow-emerald-500/20"
              >
                {currentIndex < shuffledItems.length - 1 ? (
                  <>
                    Next Device <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    View Final Results <Trophy className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// MODE 2: SENTENCE-TO-DEVICE MATCH BOARD
// ==========================================
interface BoardCard {
  id: string;
  type: 'term' | 'sentence';
  content: string;
  pairId: number;
  term: string;
}

function SentenceMatchBoard({ items }: { items: RhetoricalSentenceItem[] }) {
  // Use up to 6 pairs per game board for ideal UX
  const subset = useMemo(() => items.slice(0, 6), [items]);

  const [cards, setCards] = useState<BoardCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<BoardCard[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<Set<number>>(new Set());
  const [attempts, setAttempts] = useState(0);

  const initializeBoard = () => {
    const list: BoardCard[] = subset.flatMap((item, idx) => [
      {
        id: `term-${idx}`,
        type: 'term',
        content: item.term,
        pairId: idx,
        term: item.term,
      },
      {
        id: `sentence-${idx}`,
        type: 'sentence',
        content: item.targetSentence,
        pairId: idx,
        term: item.term,
      },
    ]);

    const shuffled = list.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setSelectedCards([]);
    setMatchedPairIds(new Set());
    setAttempts(0);
  };

  useEffect(() => {
    initializeBoard();
  }, [subset]);

  const handleCardClick = (card: BoardCard) => {
    if (matchedPairIds.has(card.pairId)) return;
    if (selectedCards.some((c) => c.id === card.id)) return;
    if (selectedCards.length >= 2) return;

    const nextSelected = [...selectedCards, card];
    setSelectedCards(nextSelected);

    if (nextSelected.length === 2) {
      setAttempts((prev) => prev + 1);
      const [first, second] = nextSelected;

      // Must be one term and one sentence with matching pairId
      if (first.pairId === second.pairId && first.type !== second.type) {
        setTimeout(() => {
          setMatchedPairIds((prev) => new Set(prev).add(first.pairId));
          setSelectedCards([]);
        }, 350);
      } else {
        setTimeout(() => {
          setSelectedCards([]);
        }, 750);
      }
    }
  };

  const isCompleted = matchedPairIds.size === subset.length && subset.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2 text-xs text-slate-400">
        <div>
          Matched: <span className="font-bold text-emerald-400">{matchedPairIds.size}</span> /{' '}
          {subset.length} pairs
        </div>
        <div>
          Attempts: <span className="font-bold text-white">{attempts}</span>
        </div>
        <Button onClick={initializeBoard} variant="ghost" size="small" className="text-xs">
          <RotateCcw className="h-3 w-3 mr-1" /> Reset Board
        </Button>
      </div>

      {isCompleted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-8 text-center space-y-4"
        >
          <Trophy className="h-12 w-12 text-amber-400 mx-auto" />
          <h3 className="text-2xl font-bold text-white">Board Cleared!</h3>
          <p className="text-slate-400 text-sm">
            You successfully matched all {subset.length} rhetorical terms with their illustrative sentences in {attempts} attempts.
          </p>
          <Button onClick={initializeBoard} variant="primary" className="bg-emerald-500 text-slate-950 font-bold">
            Play Again
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {cards.map((card) => {
            const isSelected = selectedCards.some((c) => c.id === card.id);
            const isMatched = matchedPairIds.has(card.pairId);

            let style =
              'bg-slate-900/80 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850';
            if (isSelected) {
              style = 'bg-teal-950/50 border-teal-400 shadow-md shadow-teal-500/10 ring-2 ring-teal-400';
            } else if (isMatched) {
              style = 'bg-emerald-950/30 border-emerald-500/60 opacity-60 pointer-events-none';
            }

            return (
              <motion.div
                key={card.id}
                whileHover={!isMatched ? { y: -2 } : {}}
                whileTap={!isMatched ? { scale: 0.98 } : {}}
                onClick={() => handleCardClick(card)}
                className={`p-4 rounded-2xl border min-h-[110px] flex flex-col justify-between cursor-pointer transition-all ${style}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      card.type === 'term'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {card.type === 'term' ? 'Device' : 'Sentence'}
                  </span>
                  {isMatched && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                </div>

                <div
                  className={`text-sm ${
                    card.type === 'term'
                      ? 'font-bold text-white text-base'
                      : 'font-serif text-slate-300 italic text-xs leading-relaxed'
                  }`}
                >
                  {card.type === 'term' ? card.content : `“${card.content}”`}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RhetoricalSentenceGame;
