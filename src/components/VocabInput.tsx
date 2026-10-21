import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  Sparkles,
  KeyRound,
  X,
  ShieldCheck,
  ClipboardPaste,
  Info,
  Database,
  BookOpen,
  ArrowRight,
  Layers
} from 'lucide-react';
import { generateQuizContent, QuizGenerationResult, getStoredAPIKey } from '../services/geminiService';
import { getCachedResult, setCachedResult } from '../services/cacheService';

interface VocabInputProps {
  onGenerate: (result: QuizGenerationResult, vocabList: string[]) => void;
  onLoadingChange: (isLoading: boolean) => void;
  onOpenApiKeyModal?: () => void;
}

const PRE_FILLED_LISTS = [
  {
    label: 'Vocab List 2 (18 Words)',
    words: [
      'Candid',
      'Inevitable',
      'Lethargy',
      'Morose',
      'Novice',
      'Obscure',
      'Ostentatious',
      'Precocious',
      'Prevaricate',
      'Querulous',
      'Quiescent',
      'Repose',
      'Repudiate',
      'Soporific',
      'Spontaneous',
      'Squander',
      'Theoretical',
      'Virulent',
    ],
  },
  {
    label: 'Vocab List 3 (18 Words)',
    words: [
      'Apathy',
      'Disdain',
      'Diverse',
      'Enigma',
      'Futile',
      'Gratuitous',
      'Hackneyed',
      'Incessant',
      'Insidious',
      'Integrity',
      'Jocular',
      'Kindle',
      'Ludicrous',
      'Provocative',
      'Recluse',
      'Reverence',
      'Scrutinize',
      'Superficial',
    ],
  },
] as const;

export function VocabInput({ onGenerate, onLoadingChange, onOpenApiKeyModal }: VocabInputProps) {
  const [vocabList, setVocabList] = useState<string[]>(['']);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cacheDialogOpen, setCacheDialogOpen] = useState(false);
  const [pendingWords, setPendingWords] = useState<string[]>([]);
  const [confirmGenerateOpen, setConfirmGenerateOpen] = useState(false);

  const [inputMode, setInputMode] = useState<'list' | 'paragraph'>('list');
  const [paragraphText, setParagraphText] = useState('');

  const [selectedPresetLabel, setSelectedPresetLabel] = useState<string>('Custom (Empty)');

  const filledCount = useMemo(() => vocabList.filter((word) => word.trim() !== '').length, [vocabList]);

  const handleAddWord = () => setVocabList((prev) => [...prev, '']);

  const handleRemoveWord = (index: number) => {
    setVocabList((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleWordChange = (index: number, value: string) => {
    setVocabList((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text');
    const words = pasted
      .split(/[,\n]/)
      .map((word) => word.trim())
      .filter(Boolean);

    if (words.length > 1) {
      event.preventDefault();
      setVocabList(words.slice(0, 50));
    }
  };

  const handleProcessParagraph = () => {
    if (!paragraphText.trim()) return;
    const words = paragraphText
      .split(/[,\n.;]+/)
      .map((word) => word.trim())
      .filter((word) => word.length > 0);

    if (words.length > 0) {
      setVocabList(words.slice(0, 50));
      setInputMode('list');
      setParagraphText('');
      setError(null);
    } else {
      setError('Could not extract any words from the text.');
    }
  };

  const handleApplyPreFilledList = (label: string, words: readonly string[]) => {
    setSelectedPresetLabel(label);
    setVocabList([...words]);
    setError(null);
  };

  const handleClearToEmpty = () => {
    setSelectedPresetLabel('Custom (Empty)');
    setVocabList(['']);
    setParagraphText('');
    setError(null);
  };

  const handleCheckCache = () => {
    const normalized = vocabList.map((word) => word.trim()).filter(Boolean);
    // If specific words entered, check for them; otherwise check if ANY cached vocab set exists
    const cached = getCachedResult(normalized.length >= 3 ? normalized : undefined);
    if (cached) {
      onGenerate(cached.data, cached.words);
      onLoadingChange(false);
      setError(null);
    } else {
      setError('No cached study set found in local storage. Generate one first!');
    }
  };

  const handleGenerateClick = () => {
    const normalized = vocabList.map((word) => word.trim()).filter(Boolean);
    if (normalized.length < 3) {
      setError('Please provide at least 3 vocabulary words.');
      return;
    }
    // Check if this exact list already has cached data to save API credits
    const cached = getCachedResult(normalized);
    if (cached) {
      onGenerate(cached.data, normalized);
      onLoadingChange(false);
      return;
    }
    setPendingWords(normalized);
    setConfirmGenerateOpen(true);
  };

  const handleConfirmGenerate = () => {
    setConfirmGenerateOpen(false);
    runGenerate(pendingWords);
  };

  const handleUseCached = () => {
    setCacheDialogOpen(false);
    const cached = getCachedResult(pendingWords);
    if (cached) {
      onGenerate(cached.data, cached.words);
      onLoadingChange(false);
    }
    setPendingWords([]);
  };

  const runGenerate = async (normalized: string[]) => {
    setError(null);
    setIsGenerating(true);
    onLoadingChange(true);

    try {
      const result = await generateQuizContent(normalized);
      setCachedResult(normalized, result);
      onGenerate(result, normalized);
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : 'Failed to generate study materials. Please check your API key.',
      );
      onLoadingChange(false);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-8">
      {/* Editorial Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-300 text-xs font-semibold tracking-wide uppercase">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Academic Study Engine</span>
        </div>
        <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Vocabulary Master Suite
        </h2>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Provide 3 to 50 target vocabulary words to generate contextual flashcards, multiple-choice quizzes, interactive games, and analytical synthesis passages.
        </p>
      </div>

      {/* Main Workspace Card */}
      <div className="card-glass rounded-3xl p-6 sm:p-10 relative overflow-hidden transition-all">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-zinc-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setInputMode('list')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                inputMode === 'list'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-white/[0.04]'
              }`}
            >
              List Entry
            </button>
            <button
              onClick={() => setInputMode('paragraph')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                inputMode === 'paragraph'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-white/[0.04]'
              }`}
            >
              Extract from Text
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{filledCount}</strong> words added
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">•</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Goal: 3–50</span>
          </div>
        </div>

        {/* Input Mode Content */}
        {inputMode === 'paragraph' ? (
          <div className="space-y-4">
            <textarea
              rows={8}
              value={paragraphText}
              onChange={(e) => setParagraphText(e.target.value)}
              placeholder="Paste reading passages, study guides, or teacher notes here. Words will be parsed automatically..."
              className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-white/[0.08] text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all font-mono"
            />
            <button
              onClick={handleProcessParagraph}
              disabled={!paragraphText.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" />
              <span>Parse Vocabulary From Text</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Presets */}
            <div>
              <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-500 dark:text-zinc-400 block mb-2 font-semibold">
                Course Presets
              </span>
              <div className="flex flex-wrap gap-2">
                {/* Empty / Clear Placeholder Preset (Default State) */}
                <button
                  onClick={handleClearToEmpty}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
                    selectedPresetLabel === 'Custom (Empty)'
                      ? 'border-brand-500 bg-brand-500/20 text-brand-700 dark:text-brand-300 shadow-sm font-semibold'
                      : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-100 dark:bg-white/[0.03] text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/20'
                  }`}
                >
                  <X className="h-3 w-3" />
                  <span>Clear (Empty)</span>
                </button>

                {PRE_FILLED_LISTS.map((preset) => {
                  const isSelected = selectedPresetLabel === preset.label;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => handleApplyPreFilledList(preset.label, preset.words)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        isSelected
                          ? 'border-brand-500 bg-brand-500/20 text-brand-700 dark:text-brand-300 shadow-sm font-semibold'
                          : 'border-brand-500/30 bg-brand-500/10 text-brand-700 dark:text-brand-300 hover:bg-brand-500/20'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Word Grid Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {vocabList.map((word, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2 group"
                  >
                    <span className="h-9 w-9 flex-shrink-0 rounded-xl bg-zinc-100 dark:bg-white/[0.05] border border-zinc-200 dark:border-white/[0.08] flex items-center justify-center font-mono text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <input
                      type="text"
                      value={word}
                      onChange={(e) => handleWordChange(index, e.target.value)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      placeholder={index === 0 ? 'Type or paste word list...' : 'Vocabulary word'}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-white/[0.08] text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all font-medium"
                    />
                    {vocabList.length > 1 && (
                      <button
                        onClick={() => handleRemoveWord(index)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Remove word"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-200 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddWord}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-100 dark:bg-white/[0.03] hover:bg-zinc-200 dark:hover:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 text-xs font-semibold tracking-wide transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Word</span>
                </button>
                <button
                  onClick={handleCheckCache}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold tracking-wide transition-all"
                  title="Load any previously stored vocabulary study set without using API credits"
                >
                  <Database className="h-3.5 w-3.5" />
                  <span>Load Cached Set</span>
                </button>
              </div>

              <button
                onClick={handleGenerateClick}
                disabled={isGenerating || filledCount < 3}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-sky-600 text-white font-semibold text-xs tracking-wide uppercase shadow-md shadow-brand-500/25 hover:shadow-brand-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40"
              >
                <Sparkles className="h-4 w-4" />
                <span>{isGenerating ? 'Synthesizing...' : 'Generate Study Materials'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mt-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Bottom Feature Badges */}
        <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.06]">
            <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Private & Local Storage</h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                API credentials and generated flashcards remain encrypted strictly within your browser.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.06]">
            <div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Gemini Key Management</h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                {getStoredAPIKey() ? 'Key pool active & connected' : 'Connect free Gemini API key'}
              </p>
            </div>
            <button
              onClick={onOpenApiKeyModal}
              className="px-3.5 py-1.5 rounded-xl border border-zinc-300 dark:border-white/[0.1] bg-white dark:bg-white/[0.05] text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:border-brand-500 transition-colors"
            >
              Configure
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmGenerateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-md">
          <div className="card-glass rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-luxury">
            <h3 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-50">Generate Study Materials?</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              This queries Gemini AI to generate flashcards, quizzes, games, and analytical paragraph context for {pendingWords.length} words.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmGenerateOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-white/[0.1] text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmGenerate}
                className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-500 transition-colors"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cache Dialog Modal */}
      {cacheDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-md">
          <div className="card-glass rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-luxury">
            <h3 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-50">Saved Study Set Found</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Cached study materials already exist for this exact word list. Load them immediately without using API quota?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCacheDialogOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-white/[0.1] text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUseCached}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors"
              >
                Load Cached
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
