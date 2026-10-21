import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Flame,
  Award,
  Layers,
  ChevronRight,
  RefreshCw,
  Lightbulb,
  BookA,
  X,
  Gauge,
  SlidersHorizontal,
  Database,
  Library,
  Check
} from 'lucide-react';
import {
  AnalogyQuestion,
  AnalogySet,
  AnalogyIntensity,
  generateAnalogies,
  getCachedAnalogies,
  lookupWordDefinition,
  bulkPreloadDefinitions,
  WordDefinitionResult
} from '../services/analogyService';

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  DEGREE: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    text: 'text-rose-600 dark:text-rose-300'
  },
  FUNCTION: {
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    text: 'text-sky-600 dark:text-sky-300'
  },
  CAUSE_EFFECT: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-600 dark:text-amber-300'
  },
  CHARACTERISTIC: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    text: 'text-purple-600 dark:text-purple-300'
  },
  PART_WHOLE: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-300'
  },
  SYNONYM_INTENSITY: {
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/20',
    text: 'text-fuchsia-600 dark:text-fuchsia-300'
  }
};

const DEFAULT_COLOR = {
  bg: 'bg-violet-500/10',
  border: 'border-violet-500/20',
  text: 'text-violet-600 dark:text-violet-300'
};

const INTENSITIES: AnalogyIntensity[] = ['Easy', 'Standard', 'Challenging', 'Advanced'];

interface AnalogyQuizProps {
  onOpenApiKeyModal: () => void;
}

export const AnalogyQuiz: React.FC<AnalogyQuizProps> = ({ onOpenApiKeyModal }) => {
  const [selectedIntensity, setSelectedIntensity] = useState<AnalogyIntensity>('Standard');
  const [analogySet, setAnalogySet] = useState<AnalogySet | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Refresh with difficulty picker dropdown/popover state
  const [showRefreshMenu, setShowRefreshMenu] = useState(false);

  // Word Dictionary Modal State
  const [dictWord, setDictWord] = useState<string | null>(null);
  const [dictResult, setDictResult] = useState<WordDefinitionResult | null>(null);
  const [dictLoading, setDictLoading] = useState(false);

  // Bulk Dictionary Preloader & Vocabulary Drawer State
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [showVocabDrawer, setShowVocabDrawer] = useState(false);
  const [bulkDefinitions, setBulkDefinitions] = useState<Record<string, WordDefinitionResult>>({});

  // Load from cache on mount only if valid
  useEffect(() => {
    try {
      const cached = getCachedAnalogies(selectedIntensity);
      if (
        cached &&
        Array.isArray(cached.questions) &&
        cached.questions.length > 0 &&
        cached.questions[0]?.pair &&
        Array.isArray(cached.questions[0]?.choices)
      ) {
        setAnalogySet(cached);
      } else {
        setAnalogySet(null);
      }
    } catch {
      setAnalogySet(null);
    }
  }, [selectedIntensity]);

  const handleFetchAnalogies = async (overrideIntensity?: AnalogyIntensity) => {
    const intensityToUse = overrideIntensity || selectedIntensity;
    setShowRefreshMenu(false);
    setIsLoading(true);
    setError(null);
    try {
      const data = await generateAnalogies(8, intensityToUse);
      setSelectedIntensity(intensityToUse);
      setAnalogySet(data);
      setCurrentIndex(0);
      setSelectedChoice(null);
      setIsAnswerSubmitted(false);
      setShowExplanation(false);
    } catch (err: any) {
      console.error(err);
      if (String(err?.message || '').includes('API key')) {
        setError('Please configure your Gemini API Key first.');
        onOpenApiKeyModal();
      } else {
        setError(err?.message || 'Failed to generate analogies. Please check your connection or quota.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Extract all unique words across the current analogy set
  const getAllSetWords = (): string[] => {
    if (!analogySet || !Array.isArray(analogySet.questions)) return [];
    const set = new Set<string>();
    for (const q of analogySet.questions) {
      if (Array.isArray(q.pair)) {
        if (q.pair[0]) set.add(q.pair[0]);
        if (q.pair[1]) set.add(q.pair[1]);
      }
      if (Array.isArray(q.choices)) {
        for (const c of q.choices) {
          if (Array.isArray(c)) {
            if (c[0]) set.add(c[0]);
            if (c[1]) set.add(c[1]);
          }
        }
      }
    }
    return Array.from(set);
  };

  // Extract words for only the current question (saving network calls and AI credits)
  const getCurrentQuestionWords = (): string[] => {
    if (!currentQ) return [];
    const set = new Set<string>();
    if (Array.isArray(currentQ.pair)) {
      if (currentQ.pair[0]) set.add(currentQ.pair[0]);
      if (currentQ.pair[1]) set.add(currentQ.pair[1]);
    }
    if (Array.isArray(currentQ.choices)) {
      for (const c of currentQ.choices) {
        if (Array.isArray(c)) {
          if (c[0]) set.add(c[0]);
          if (c[1]) set.add(c[1]);
        }
      }
    }
    return Array.from(set);
  };

  const handleBulkPreloadQuestion = async () => {
    const qWords = getCurrentQuestionWords();
    if (qWords.length === 0) return;

    setIsBulkLoading(true);
    setBulkProgress({ loaded: 0, total: qWords.length });
    try {
      const defs = await bulkPreloadDefinitions(qWords, (loaded, total) => {
        setBulkProgress({ loaded, total });
      });
      setBulkDefinitions((prev) => ({ ...prev, ...defs }));
      setShowVocabDrawer(true);
    } catch (e) {
      console.error('Failed preload question:', e);
    } finally {
      setIsBulkLoading(false);
      setBulkProgress(null);
    }
  };

  const handleBulkPreload = async () => {
    const allWords = getAllSetWords();
    if (allWords.length === 0) return;

    setIsBulkLoading(true);
    setBulkProgress({ loaded: 0, total: allWords.length });
    try {
      const defs = await bulkPreloadDefinitions(allWords, (loaded, total) => {
        setBulkProgress({ loaded, total });
      });
      setBulkDefinitions(defs);
      setShowVocabDrawer(true);
    } catch (e) {
      console.error('Failed bulk preload:', e);
    } finally {
      setIsBulkLoading(false);
      setBulkProgress(null);
    }
  };

  const handleLookupWord = async (word: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const cleanWord = word.replace(/[^a-zA-Z-]/g, '').trim();
    if (!cleanWord) return;

    setDictWord(cleanWord);
    setDictResult(null);
    setDictLoading(true);

    try {
      const result = await lookupWordDefinition(cleanWord);
      setDictResult(result);
    } catch {
      setDictResult({
        word: cleanWord,
        partOfSpeech: '',
        definition: 'Could not load dictionary definition. Please try again.'
      });
    } finally {
      setDictLoading(false);
    }
  };

  const currentQ: AnalogyQuestion | undefined = analogySet?.questions[currentIndex];

  const handleSelectChoice = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedChoice(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedChoice === null || isAnswerSubmitted || !currentQ) return;
    setIsAnswerSubmitted(true);
    const isCorrect = selectedChoice === currentQ.correctIndex;
    if (isCorrect) {
      setScore((s) => s + 1);
      setStreak((st) => {
        const next = st + 1;
        if (next > bestStreak) setBestStreak(next);
        return next;
      });
    } else {
      setStreak(0);
    }
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (!analogySet) return;
    if (currentIndex + 1 < analogySet.questions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedChoice(null);
      setIsAnswerSubmitted(false);
      setShowExplanation(false);
    } else {
      setCurrentIndex(analogySet.questions.length);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedChoice(null);
    setIsAnswerSubmitted(false);
    setShowExplanation(false);
    setScore(0);
    setStreak(0);
  };

  const categoryStyle = currentQ ? CATEGORY_COLORS[currentQ.category] || DEFAULT_COLOR : DEFAULT_COLOR;

  // Ensure currentQ is valid, otherwise show empty start screen
  if (!analogySet || !currentQ || !Array.isArray(currentQ.choices) || currentQ.choices.length < 2) {
    return (
      <div className="card-glass p-8 sm:p-12 text-center max-w-xl mx-auto rounded-3xl relative overflow-hidden transition-all">
        <div className="inline-flex p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-300 mb-6 shadow-sm">
          <Layers className="h-8 w-8" />
        </div>
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
          Analogies
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-8 max-w-md mx-auto">
          Drill relational vocabulary reasoning across subtle intensity differences, functional relationships, and characteristic actions.
        </p>

        {/* Intensity Mode Selector - Locked while loading */}
        <div className="mb-8">
          <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-500 dark:text-zinc-400 font-semibold block mb-2.5">
            Select Difficulty Mode
          </span>
          <div className="p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-white/[0.08] inline-flex flex-wrap justify-center gap-1">
            {INTENSITIES.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedIntensity(lvl)}
                disabled={isLoading}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  selectedIntensity === lvl
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs text-left">
            {error}
          </div>
        )}

        <div className="flex items-center justify-center gap-3 flex-wrap">
          {/* Explicit Load Cached Button */}
          <button
            onClick={() => {
              const cached = getCachedAnalogies(selectedIntensity);
              if (cached && Array.isArray(cached.questions) && cached.questions.length > 0 && cached.questions[0]?.pair) {
                setAnalogySet(cached);
                setCurrentIndex(0);
                setSelectedChoice(null);
                setIsAnswerSubmitted(false);
                setShowExplanation(false);
                setError(null);
              } else {
                setError(`No cached test found for ${selectedIntensity} mode yet. Generate a new set first!`);
              }
            }}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold text-xs tracking-wide uppercase transition-all duration-200 disabled:opacity-40"
          >
            <Database className="h-4 w-4" />
            <span>Load Cached Set</span>
          </button>

          <button
            onClick={() => handleFetchAnalogies()}
            disabled={isLoading}
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 text-white font-semibold text-xs tracking-wide uppercase shadow-md shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Synthesizing {selectedIntensity} Set...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Generate New Set</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Set Complete Screen
  if (currentIndex >= analogySet.questions.length) {
    const total = analogySet.questions.length;
    const pct = Math.round((score / total) * 100);

    return (
      <div className="card-glass p-8 sm:p-12 text-center max-w-lg mx-auto rounded-3xl relative overflow-hidden transition-all">
        <div className="inline-flex p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-300 mb-4 shadow-sm">
          <Award className="h-10 w-10" />
        </div>
        <h2 className="font-serif text-3xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight mb-1">Review Completed!</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-8 font-mono tracking-wide">{analogySet.intensity} Mode Mastered</p>

        <div className="grid grid-cols-2 gap-4 w-full mb-8">
          <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.06]">
            <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-500 dark:text-zinc-400">Score</span>
            <div className="font-serif text-3xl font-bold text-zinc-900 dark:text-white mt-1">
              {score} <span className="text-lg text-zinc-400 font-sans font-normal">/ {total}</span>
            </div>
            <span className="text-[11px] text-violet-600 dark:text-violet-400 font-medium">{pct}% Accuracy</span>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.06]">
            <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-500 dark:text-zinc-400">Best Streak</span>
            <div className="font-serif text-3xl font-bold text-amber-500 dark:text-amber-300 mt-1 flex items-center justify-center gap-1.5">
              <Flame className="h-6 w-6 fill-amber-500 dark:fill-amber-300 text-amber-500 dark:text-amber-300" />
              {bestStreak}
            </div>
            <span className="text-[11px] text-zinc-500">Consecutive correct</span>
          </div>
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={handleRestart}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-zinc-100 dark:bg-white/[0.05] hover:bg-zinc-200 dark:hover:bg-white/[0.09] text-zinc-800 dark:text-white text-xs font-semibold tracking-wide transition-all border border-zinc-200 dark:border-white/[0.08]"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Replay Set
          </button>
          <button
            onClick={() => {
              const cached = getCachedAnalogies(selectedIntensity);
              if (cached && cached.questions.length > 0) {
                setAnalogySet(cached);
                setCurrentIndex(0);
                setSelectedChoice(null);
                setIsAnswerSubmitted(false);
                setShowExplanation(false);
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold tracking-wide transition-all"
          >
            <Database className="h-3.5 w-3.5" /> Load Cached
          </button>
          <button
            onClick={() => handleFetchAnalogies()}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-semibold tracking-wide shadow-md shadow-violet-500/25 hover:shadow-violet-500/40 transition-all disabled:opacity-50"
          >
            {isLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {isLoading ? 'Synthesizing...' : 'Generate New'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Top Breadcrumb & Status */}
      <div className="flex items-center justify-between px-2 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
            {String(currentIndex + 1).padStart(2, '0')} <span className="text-zinc-400 dark:text-zinc-600">/</span> {String(analogySet.questions.length).padStart(2, '0')}
          </span>

          {/* Locked Active Intensity Pill */}
          <span className="text-[10px] font-mono tracking-wider uppercase font-semibold px-2.5 py-0.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300 flex items-center gap-1">
            <Gauge className="h-3 w-3" />
            {analogySet.intensity || selectedIntensity} Mode
          </span>

          {/* Hidden category badge revealed only AFTER question is answered */}
          {currentQ && isAnswerSubmitted && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`text-[10px] font-mono tracking-wider uppercase font-semibold px-2.5 py-0.5 rounded-full border ${categoryStyle.bg} ${categoryStyle.border} ${categoryStyle.text}`}
            >
              {currentQ.category.replace('_', ' ')}
            </motion.span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-300 text-xs font-semibold mr-1">
            <Flame className="h-4 w-4 fill-amber-500 dark:fill-amber-300 text-amber-500 dark:text-amber-300" />
            <span className="font-mono">{streak} Streak</span>
          </div>

          {/* Question-Level Quick Define / Bulk Load Button */}
          <button
            onClick={handleBulkPreloadQuestion}
            disabled={isBulkLoading}
            className="text-xs text-rose-700 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all font-semibold active:scale-95 disabled:opacity-50"
            title="Load definitions only for current question to conserve API credits"
          >
            <BookA className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            <span className="hidden sm:inline">Define Question</span>
            <span className="sm:hidden">Q-Dict</span>
          </button>

          {/* Mass Load All Dictionary / Vocabulary Index Button */}
          <button
            onClick={handleBulkPreload}
            disabled={isBulkLoading}
            className="text-xs text-violet-700 dark:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all font-semibold active:scale-95 disabled:opacity-50"
            title="Mass-load all definitions for this set into memory and open dictionary view"
          >
            {isBulkLoading ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin text-violet-500" />
                <span className="font-mono text-[11px]">
                  {bulkProgress ? `${bulkProgress.loaded}/${bulkProgress.total}` : 'Loading...'}
                </span>
              </>
            ) : (
              <>
                <Library className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                <span className="hidden sm:inline">Mass Load Dict</span>
                <span className="sm:hidden">All Dict</span>
              </>
            )}
          </button>

          {/* Refresh Control with Dropdown for Difficulty Choice */}
          <div className="relative">
            <button
              onClick={() => setShowRefreshMenu(!showRefreshMenu)}
              disabled={isLoading}
              className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-100 dark:bg-zinc-900/60 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all font-medium"
              title="Refresh quiz with difficulty options"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Quiz</span>
            </button>

            {/* Refresh Difficulty Picker Popover */}
            {showRefreshMenu && (
              <div className="absolute right-0 mt-2 w-48 card-glass rounded-2xl p-2 shadow-xl z-30 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-2 py-1 block font-semibold">
                  Refresh at Difficulty:
                </span>
                {INTENSITIES.map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => handleFetchAnalogies(lvl)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                      selectedIntensity === lvl
                        ? 'bg-violet-600 text-white'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <span>{lvl}</span>
                    {selectedIntensity === lvl && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Luxury Question Card */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="card-glass p-6 sm:p-10 rounded-3xl relative overflow-hidden shadow-sm"
      >
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 opacity-70" />

        {/* Stem Pair Display */}
        <div className="text-center py-7 px-4 mb-7 rounded-2xl bg-zinc-100/70 dark:bg-zinc-950/60 border border-zinc-200 dark:border-white/[0.06]">
          <span className="text-[10px] font-mono tracking-[0.2em] text-zinc-500 dark:text-zinc-400 uppercase font-semibold block mb-3">
            Premise Pair • Click any word for definition
          </span>
          <div className="font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-baseline justify-center gap-3 flex-wrap">
            <button
              onClick={(e) => currentQ && handleLookupWord(currentQ.pair[0], e)}
              className="text-violet-700 dark:text-violet-200 hover:underline decoration-violet-500/50 underline-offset-4 cursor-pointer transition-all hover:scale-[1.01] inline-block whitespace-normal break-words"
              title="Click for dictionary definition"
            >
              {currentQ?.pair[0]}
            </button>
            <span className="text-zinc-400 dark:text-zinc-600 font-sans text-xl font-light select-none">:</span>
            <button
              onClick={(e) => currentQ && handleLookupWord(currentQ.pair[1], e)}
              className="text-fuchsia-700 dark:text-fuchsia-200 hover:underline decoration-fuchsia-500/50 underline-offset-4 cursor-pointer transition-all hover:scale-[1.01] inline-block whitespace-normal break-words"
              title="Click for dictionary definition"
            >
              {currentQ?.pair[1]}
            </button>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-mono tracking-wider">is to ... as</p>
        </div>

        {/* 4 Choices */}
        <div className="grid grid-cols-1 gap-3 mb-7">
          {currentQ?.choices.map((choice, idx) => {
            const isSelected = selectedChoice === idx;
            const isCorrect = idx === currentQ.correctIndex;

            let borderStyle = 'border-zinc-200 dark:border-white/[0.08] hover:border-violet-500/50 bg-white/50 dark:bg-white/[0.02] hover:bg-zinc-100/60 dark:hover:bg-white/[0.05]';
            if (isSelected) {
              borderStyle = 'border-violet-500 bg-violet-500/10 dark:bg-violet-500/15 ring-2 ring-violet-500/30';
            }
            if (isAnswerSubmitted) {
              if (isCorrect) {
                borderStyle = 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/30';
              } else if (isSelected && !isCorrect) {
                borderStyle = 'border-rose-500 bg-rose-500/15 text-rose-800 dark:text-rose-200 ring-2 ring-rose-500/30';
              } else {
                borderStyle = 'border-zinc-200/50 dark:border-white/[0.04] opacity-40';
              }
            }

            return (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectChoice(idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectChoice(idx);
                  }
                }}
                className={`group flex items-center justify-between p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer select-none ${borderStyle}`}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <span className={`h-6 w-6 flex-shrink-0 rounded-full flex items-center justify-center font-mono text-[11px] font-semibold border transition-colors ${
                    isSelected
                      ? 'bg-violet-600 text-white border-violet-500'
                      : 'bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/[0.08] group-hover:text-zinc-900 dark:group-hover:text-white'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <div className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-1.5 flex-wrap min-w-0">
                    <button
                      type="button"
                      onClick={(e) => handleLookupWord(choice[0], e)}
                      className="whitespace-normal break-words font-semibold hover:underline hover:text-violet-600 dark:hover:text-violet-300 text-left transition-colors cursor-pointer"
                      title={`Click to define "${choice[0]}"`}
                    >
                      {choice[0]}
                    </button>
                    <span className="text-zinc-400 dark:text-zinc-600 font-light select-none">:</span>
                    <button
                      type="button"
                      onClick={(e) => handleLookupWord(choice[1], e)}
                      className="whitespace-normal break-words font-semibold hover:underline hover:text-fuchsia-600 dark:hover:text-fuchsia-300 text-left transition-colors cursor-pointer"
                      title={`Click to define "${choice[1]}"`}
                    >
                      {choice[1]}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={(e) => handleLookupWord(choice[0], e)}
                    className="opacity-60 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-400 hover:text-violet-600 dark:hover:text-violet-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-all"
                    title={`Define "${choice[0]}"`}
                  >
                    <BookA className="h-4 w-4" />
                  </button>

                  {isAnswerSubmitted && isCorrect && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                  )}
                  {isAnswerSubmitted && isSelected && !isCorrect && (
                    <XCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-white/[0.08]">
          <span className="text-[11px] text-zinc-400 font-mono">
            {!isAnswerSubmitted ? 'Select pair & submit' : 'Category & rationale revealed'}
          </span>

          {!isAnswerSubmitted ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={selectedChoice === null}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 text-white font-semibold text-xs tracking-wider uppercase shadow-md shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirm Selection
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-xs tracking-wider uppercase shadow-md shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span>Next Pair</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Analytical Bridge Accordion */}
        <AnimatePresence>
          {showExplanation && currentQ && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-6 border-t border-zinc-200 dark:border-white/[0.08] space-y-3"
            >
              <div className="p-5 rounded-2xl bg-violet-500/[0.08] border border-violet-500/20">
                <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 text-xs font-semibold mb-2">
                  <Lightbulb className="h-4 w-4" />
                  <span className="font-mono tracking-wider uppercase text-[10px]">
                    Logical Bridge ({currentQ.category.replace('_', ' ')})
                  </span>
                </div>
                <p className="font-serif italic text-sm text-zinc-900 dark:text-violet-100 leading-relaxed">
                  "{currentQ.bridge}"
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.06]">
                <span className="font-mono text-[10px] uppercase font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider block mb-1.5">
                  Distractor Elimination & Rationale
                </span>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {currentQ.rationale}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Dictionary Definition Popover Modal */}
      {dictWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-glass rounded-3xl p-6 max-w-sm w-full space-y-3 shadow-xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <BookA className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                <h3 className="font-serif text-lg font-bold capitalize text-zinc-900 dark:text-white">
                  {dictWord}
                </h3>
              </div>
              <button
                onClick={() => setDictWord(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {dictLoading ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs">
                <RefreshCw className="h-4 w-4 animate-spin text-violet-500" />
                <span>Looking up definition...</span>
              </div>
            ) : dictResult ? (
              <div className="space-y-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                {dictResult.partOfSpeech && (
                  <span className="font-mono text-[10px] italic text-zinc-500 dark:text-zinc-400">
                    ({dictResult.partOfSpeech})
                  </span>
                )}
                <p className="leading-relaxed font-sans">{dictResult.definition}</p>
                {dictResult.example && (
                  <p className="text-zinc-500 dark:text-zinc-400 italic text-[11px] pt-1 border-t border-zinc-200/50 dark:border-white/[0.04]">
                    "{dictResult.example}"
                  </p>
                )}
              </div>
            ) : null}

            <div className="pt-2">
              <button
                onClick={() => setDictWord(null)}
                className="w-full py-2 rounded-xl bg-zinc-100 dark:bg-white/[0.05] hover:bg-zinc-200 dark:hover:bg-white/[0.1] text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Mass Vocabulary / Dictionary Overview Drawer Modal */}
      {showVocabDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-glass rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-zinc-200 dark:border-white/10"
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-300">
                  <Library className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-zinc-900 dark:text-white">
                    Analogy Vocabulary Index
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    {Object.keys(bulkDefinitions).length} Words Preloaded & Ready Offline
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVocabDrawer(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1 scrollbar-thin">
              {Object.keys(bulkDefinitions).length === 0 ? (
                <div className="text-center py-10 text-zinc-400 text-xs font-mono">
                  No vocabulary loaded yet. Click "Mass Load Dict" to pre-load all words.
                </div>
              ) : (
                Object.entries(bulkDefinitions).map(([wordKey, def]) => (
                  <div
                    key={wordKey}
                    className="p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/[0.05] hover:border-violet-500/30 transition-all"
                  >
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-serif font-bold text-base capitalize text-zinc-900 dark:text-zinc-100">
                        {def.word || wordKey}
                      </span>
                      {def.partOfSpeech && (
                        <span className="text-[10px] font-mono italic text-violet-600 dark:text-violet-400">
                          ({def.partOfSpeech})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
                      {def.definition}
                    </p>
                    {def.example && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic mt-1.5 pt-1.5 border-t border-zinc-200/40 dark:border-white/[0.03]">
                        "{def.example}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-white/[0.08] flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 font-mono">
                Clicking any word in the quiz will now open instantly.
              </span>
              <button
                onClick={() => setShowVocabDrawer(false)}
                className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold tracking-wide transition-all shadow-sm"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
