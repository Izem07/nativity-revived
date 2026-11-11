import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  ArrowRight,
  BookOpen,
  Feather,
  Sparkles,
  Loader2,
} from 'lucide-react';

export interface QuizQuestion {
  id: string;
  type: 'rhetorical' | 'vocab';
  mode: 'definition' | 'sentence';
  prompt: string; // Passage, sentence with blank, or definition text
  options: string[]; // 4 multiple choice terms
  correctAnswer: string;
}

export interface QuizModuleProps {
  questions: QuizQuestion[];
  onComplete?: (score: number, total: number) => void;
  onRegenerateDifficulty?: (difficulty: 'easy' | 'standard' | 'hard') => Promise<void> | void;
  className?: string;
}

export const QuizModule: React.FC<QuizModuleProps> = ({
  questions,
  onComplete,
  onRegenerateDifficulty,
  className = '',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  // Difficulty Mode
  const [difficulty, setDifficulty] = useState<'easy' | 'standard' | 'hard'>('standard');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenProgress, setRegenProgress] = useState(15);

  useEffect(() => {
    if (!isRegenerating) {
      setRegenProgress(15);
      return;
    }
    const timer = setInterval(() => {
      setRegenProgress((prev) => {
        if (prev >= 92) return prev;
        const diff = 95 - prev;
        return prev + Math.max(1, Math.round(diff * 0.12));
      });
    }, 140);
    return () => clearInterval(timer);
  }, [isRegenerating]);

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setShowSummary(false);
  };

  const handleRegenerate = async (targetDiff: 'easy' | 'standard' | 'hard') => {
    if (!onRegenerateDifficulty || isRegenerating) return;
    setDifficulty(targetDiff);
    setIsRegenerating(true);
    try {
      await onRegenerateDifficulty(targetDiff);
      handleRestart();
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-8 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.08] text-center shadow-lg">
        <Brain className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">No Quiz Questions Found</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Add or generate terms to practice with the interactive quiz module.
        </p>
      </div>
    );
  }

  const q = questions[currentIndex];
  const isRhetoric = q?.type === 'rhetorical';

  // Section styling tokens
  const accentText = isRhetoric
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-brand-600 dark:text-brand-400';
  const accentBg = isRhetoric ? 'bg-emerald-600' : 'bg-brand-600';
  const accentBgHover = isRhetoric ? 'hover:bg-emerald-500' : 'hover:bg-brand-500';
  const badgeStyle = isRhetoric
    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
    : 'bg-brand-500/10 text-brand-700 dark:text-brand-300 border-brand-500/25';
  const hoverBorder = isRhetoric
    ? 'hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
    : 'hover:border-brand-500/50 hover:bg-brand-50/50 dark:hover:bg-brand-950/20';

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);
    if (option.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setShowSummary(true);
      if (onComplete) {
        onComplete(score + (selectedOption?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase() ? 0 : 0), questions.length);
      }
      return;
    }
    setSelectedOption(null);
    setIsAnswered(false);
    setCurrentIndex((prev) => prev + 1);
  };

  if (showSummary) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto p-8 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.08] shadow-xl text-center space-y-6"
      >
        <div
          className={`h-16 w-16 mx-auto rounded-2xl flex items-center justify-center ${
            isRhetoric ? 'bg-emerald-500/10 text-emerald-500' : 'bg-brand-500/10 text-brand-500'
          }`}
        >
          <Trophy className="h-8 w-8" />
        </div>

        <div>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${badgeStyle} mb-2`}>
            Quiz Complete
          </span>
          <h2 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
            {percentage >= 80 ? 'Mastery Achieved!' : percentage >= 60 ? 'Great Effort!' : 'Keep Practicing!'}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            You scored {score} out of {questions.length} ({percentage}%)
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-sm mx-auto bg-zinc-100 dark:bg-zinc-900 rounded-full h-2.5 overflow-hidden border border-zinc-200 dark:border-zinc-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isRhetoric ? 'bg-emerald-500' : 'bg-brand-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={handleRestart}
            className={`px-6 py-2.5 rounded-xl text-white font-semibold text-xs transition-all shadow-md inline-flex items-center gap-2 ${accentBg} ${accentBgHover}`}
          >
            <RotateCcw className="h-4 w-4" /> Try Again
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div
      className={`max-w-2xl mx-auto p-6 sm:p-7 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.08] rounded-3xl shadow-lg shadow-zinc-900/5 dark:shadow-2xl dark:shadow-black/60 transition-colors ${className}`}
    >
      {/* Top Header & Difficulty Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs mb-5 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
        <div className="flex items-center gap-2">
          <span className="font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">•</span>
          <span className="font-semibold text-zinc-600 dark:text-zinc-300">
            Score: {score}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Difficulty Pill Switcher */}
          <div className="inline-flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px]">
            {(['easy', 'standard', 'hard'] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => handleRegenerate(diff)}
                disabled={isRegenerating}
                className={`px-2.5 py-0.5 rounded-lg font-semibold capitalize transition-all cursor-pointer ${
                  difficulty === diff
                    ? `${accentBg} text-white shadow-sm`
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>

          {onRegenerateDifficulty && (
            <button
              onClick={() => handleRegenerate(difficulty)}
              disabled={isRegenerating}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-300 font-medium transition"
              title="Regenerate quiz questions with selected difficulty"
            >
              {isRegenerating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              <span>Regenerate</span>
            </button>
          )}

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold tracking-wide uppercase ${badgeStyle}`}
          >
            {isRhetoric ? (
              <Feather className="h-3 w-3 text-emerald-500" />
            ) : (
              <BookOpen className="h-3 w-3 text-brand-500" />
            )}
            {q.type.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Regeneration Progress Bar */}
      {isRegenerating && (
        <div className="p-4 sm:p-5 mb-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] shadow-md space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className={`h-4 w-4 animate-spin ${accentText}`} />
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                Regenerating {difficulty.toUpperCase()} Quiz Questions...
              </span>
            </div>
            <span className={`font-mono font-bold ${accentText}`}>{regenProgress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${
                isRhetoric ? 'from-emerald-500 to-teal-400' : 'from-brand-500 to-sky-400'
              } transition-all duration-200 ease-out`}
              style={{ width: `${regenProgress}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Formulating challenging AP-tier multiple choice questions with calibrated distractors...
          </p>
        </div>
      )}

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="p-5 sm:p-6 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl mb-4"
        >
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${accentText}`}>
            {q.mode === 'definition'
              ? 'Which term best matches this definition?'
              : 'Select the matching word or rhetorical term:'}
          </h3>
          <p className="text-base text-zinc-800 dark:text-zinc-100 font-medium leading-relaxed">
            {q.prompt}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* 4 Multiple Choice Options */}
      <div className="grid grid-cols-1 gap-2.5">
        {q.options.map((option, idx) => {
          let btnStyle = `bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800/90 text-zinc-800 dark:text-zinc-200 ${hoverBorder}`;
          let icon = null;

          if (isAnswered) {
            const isThisCorrect = option.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
            const isThisSelected = option === selectedOption;

            if (isThisCorrect) {
              btnStyle =
                'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500/30';
              icon = <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
            } else if (isThisSelected) {
              btnStyle =
                'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-200 font-semibold ring-1 ring-rose-500/30';
              icon = <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />;
            } else {
              btnStyle =
                'bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-200/60 dark:border-zinc-800/40 text-zinc-400 dark:text-zinc-600 opacity-40';
            }
          }

          return (
            <motion.button
              key={`${q.id}-${option}-${idx}`}
              whileTap={!isAnswered ? { scale: 0.99 } : {}}
              onClick={() => handleSelect(option)}
              disabled={isAnswered}
              className={`p-4 border rounded-xl text-left text-sm font-medium transition-all flex items-center justify-between gap-3 shadow-sm cursor-pointer ${btnStyle}`}
            >
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{option}</span>
              </div>
              {icon}
            </motion.button>
          );
        })}
      </div>

      {/* Next Question Button */}
      {isAnswered && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5"
        >
          <button
            onClick={handleNext}
            className={`w-full py-3 text-white font-semibold text-sm rounded-xl transition-all shadow-md inline-flex items-center justify-center gap-2 cursor-pointer ${accentBg} ${accentBgHover}`}
          >
            <span>{currentIndex + 1 < questions.length ? 'Next Question' : 'View Results'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </div>
  );
};
