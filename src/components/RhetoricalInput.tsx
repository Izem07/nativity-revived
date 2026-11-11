import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles,
  KeyRound,
  X,
  ShieldCheck,
  Feather,
  Database,
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  BookOpen,
  Info
} from 'lucide-react';
import { generateRhetoricalContent, RhetoricalGenerationResult, getStoredAPIKey } from '../services/geminiService';
import { getCachedRhetoricalResult, setCachedRhetoricalResult } from '../services/cacheService';
import { KeyStatusPanel } from './KeyStatusPanel';
import { useHasApiKey } from '../hooks/useHasApiKey';
import { ConfirmDialog } from './ConfirmDialog';
import { beginGeneration, endGeneration, isCancelledError } from '../services/generationControl';
import { RHETORICAL_COURSE_UNITS, RhetoricalCourseUnit } from '../data/rhetoricalCourseData';

interface RhetoricalInputProps {
  onGenerate: (result: RhetoricalGenerationResult, termsList: string[]) => void;
  onLoadingChange: (isLoading: boolean) => void;
  onOpenApiKeyModal?: () => void;
}

export function RhetoricalInput({ onGenerate, onLoadingChange, onOpenApiKeyModal }: RhetoricalInputProps) {
  const hasKey = useHasApiKey();
  // Saved set waiting for the user to confirm loading it
  const [pendingCached, setPendingCached] = useState<ReturnType<typeof getCachedRhetoricalResult>>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [termsList, setTermsList] = useState<string[]>(['']);
  const [difficulty, setDifficulty] = useState<'easy' | 'standard' | 'hard'>('standard');
  const [showCourseNotes, setShowCourseNotes] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [cacheDialogOpen, setCacheDialogOpen] = useState(false);
  const [pendingTerms, setPendingTerms] = useState<string[]>([]);
  const [confirmGenerateOpen, setConfirmGenerateOpen] = useState(false);

  const [inputMode, setInputMode] = useState<'list' | 'paragraph'>('list');
  const [paragraphText, setParagraphText] = useState('');

  const activeUnit = useMemo(() => {
    return RHETORICAL_COURSE_UNITS.find((u) => u.id === selectedUnitId) || null;
  }, [selectedUnitId]);

  const filledCount = useMemo(() => termsList.filter((term) => term.trim() !== '').length, [termsList]);

  const handleSelectUnit = (unit: RhetoricalCourseUnit) => {
    setSelectedUnitId(unit.id);
    setTermsList([...unit.terms]);
    setError(null);
  };

  const handleClearToEmpty = () => {
    setSelectedUnitId(null);
    setTermsList(['']);
    setParagraphText('');
    setShowCourseNotes(false);
    setError(null);
  };

  const handleAddTerm = () => setTermsList((prev) => [...prev, '']);

  const handleRemoveTerm = (index: number) => {
    setTermsList((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleTermChange = (index: number, value: string) => {
    setTermsList((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text');
    const terms = pasted
      .split(/[,\n]/)
      .map((term) => term.trim())
      .filter(Boolean);

    if (terms.length > 1) {
      event.preventDefault();
      setTermsList(terms.slice(0, 30));
    }
  };

  const handleProcessParagraph = () => {
    if (!paragraphText.trim()) return;
    const terms = paragraphText
      .split(/[,\n.;]+/)
      .map((term) => term.trim())
      .filter((term) => term.length > 0);

    if (terms.length > 0) {
      setTermsList(terms.slice(0, 30));
      setInputMode('list');
      setParagraphText('');
      setError(null);
    } else {
      setError('Could not extract rhetorical devices from the text.');
    }
  };

  const handleCheckCache = () => {
    const normalized = termsList.map((t) => t.trim()).filter(Boolean);
    const cached = getCachedRhetoricalResult(normalized.length >= 2 ? normalized : undefined);
    if (cached) {
      setError(null);
      setPendingCached(cached);
    } else {
      setError('No cached rhetorical study set found in local storage. Generate one first!');
    }
  };

  const handleGenerateClick = () => {
    const normalized = termsList.map((t) => t.trim()).filter(Boolean);
    if (normalized.length < 2) {
      setError('Please provide at least 2 rhetorical devices.');
      return;
    }
    setPendingTerms(normalized);
    setConfirmGenerateOpen(true);
  };

  const handleConfirmGenerate = () => {
    setConfirmGenerateOpen(false);
    runGenerate(pendingTerms);
  };

  const handleUseCached = () => {
    setCacheDialogOpen(false);
    const cached = getCachedRhetoricalResult(pendingTerms);
    if (cached) {
      onGenerate(cached.data, cached.terms);
      onLoadingChange(false);
    }
    setPendingTerms([]);
  };

  const runGenerate = async (normalized: string[]) => {
    setError(null);
    setIsGenerating(true);
    onLoadingChange(true);

    const signal = beginGeneration();
    try {
      const result = await generateRhetoricalContent(normalized, difficulty);
      if (signal.aborted) return;
      setCachedRhetoricalResult(normalized, result);
      onGenerate(result, normalized);
    } catch (generateError) {
      if (signal.aborted || isCancelledError(generateError)) {
        // Cancelled by the user: back to the setup screen quietly
        onLoadingChange(false);
        return;
      }
      setError(
        generateError instanceof Error
          ? generateError.message
          : 'Failed to generate rhetorical study packet. Please check your API key.',
      );
      onLoadingChange(false);
    } finally {
      endGeneration(signal);
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-8">
      {/* Editorial Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold tracking-wide uppercase">
          <Feather className="h-3.5 w-3.5" />
          <span>AP Lang Rhetorical Analysis</span>
        </div>
        <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Rhetorical Devices & Syntax
        </h2>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Master devices by identifying syntactic patterns in authentic sentences, studying famous historical orations, and taking AP-tier analytical quizzes.
        </p>
      </div>

      {/* Main Workspace Card */}
      <div className="card-glass rounded-3xl p-6 sm:p-10 relative overflow-hidden transition-all">
        {/* Top Control Bar: List Entry vs Extract from Text */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-zinc-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setInputMode('list')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                inputMode === 'list'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-white/[0.04]'
              }`}
            >
              List Entry
            </button>
            <button
              onClick={() => setInputMode('paragraph')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                inputMode === 'paragraph'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-white/[0.04]'
              }`}
            >
              Extract from Text
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{filledCount}</strong> devices added
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">•</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Goal: 2–30</span>
          </div>
        </div>

        {/* Input Mode Content */}
        {inputMode === 'paragraph' ? (
          <div className="space-y-4 mb-6">
            <textarea
              rows={8}
              value={paragraphText}
              onChange={(e) => setParagraphText(e.target.value)}
              placeholder="Paste reading passages, speech excerpts, rhetorical handouts, or PPT notes here. Rhetorical devices will be extracted automatically..."
              className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-white/[0.08] text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono"
            />
            <button
              onClick={handleProcessParagraph}
              disabled={!paragraphText.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer shadow-md"
            >
              <Sparkles className="h-4 w-4" />
              <span>Parse Rhetorical Devices From Text</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Course Units Selector */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-500 dark:text-zinc-400 font-semibold">
                  Course Units
                </span>
                {activeUnit && (
                  <button
                    onClick={() => setShowCourseNotes(!showCourseNotes)}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    {showCourseNotes ? 'Hide Definitions' : 'View Definitions'}
                    {showCourseNotes ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {/* Empty / Clear Placeholder Card (Default Selection) */}
                <button
                  onClick={handleClearToEmpty}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedUnitId === null
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 shadow-sm font-semibold'
                      : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-100 dark:bg-white/[0.03] text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/20'
                  }`}
                >
                  <X className="h-3 w-3 text-zinc-400" />
                  <span>Clear (Empty)</span>
                </button>

                {RHETORICAL_COURSE_UNITS.map((unit) => {
                  const isSelected = unit.id === selectedUnitId;
                  return (
                    <button
                      key={unit.id}
                      onClick={() => handleSelectUnit(unit)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 shadow-sm font-semibold'
                          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                      }`}
                    >
                      <span>{unit.unitTitle}</span>
                      <span className="text-[10px] opacity-70">({unit.terms.length})</span>
                    </button>
                  );
                })}
              </div>

              {/* Collapsible Course Notes */}
              <AnimatePresence>
                {showCourseNotes && activeUnit && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-950/60 border border-zinc-200 dark:border-white/[0.08] space-y-3"
                  >
                    <div className="font-serif text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex flex-wrap items-baseline gap-2">
                      <span>{activeUnit.unitTitle} — Teacher PPT Notes</span>
                      {activeUnit.description && (
                        <span className="text-xs font-sans font-normal text-zinc-500 dark:text-zinc-400">({activeUnit.description})</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {activeUnit.termsDetailed.map((td) => (
                        <div key={td.term} className="p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.06]">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 block">{td.term}</span>
                          <p className="text-zinc-600 dark:text-zinc-400 text-[11px] mt-0.5">{td.definition}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Active Devices Section */}
            <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-white/[0.08]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-500 dark:text-zinc-400 font-semibold">
                  Active Devices to Study ({filledCount})
                </span>
                <button
                  onClick={handleAddTerm}
                  className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Device
                </button>
              </div>

              {/* Terms Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {termsList.map((term, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-white/[0.08]"
                    >
                      <input
                        type="text"
                        value={term}
                        onChange={(e) => handleTermChange(index, e.target.value)}
                        onPaste={index === 0 ? handlePaste : undefined}
                        placeholder={index === 0 ? 'Type or paste device list...' : 'Rhetorical Device'}
                        className="flex-1 px-2.5 py-1.5 bg-transparent text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none font-medium"
                      />
                      {termsList.length > 1 && (
                        <button
                          onClick={() => handleRemoveTerm(index)}
                          className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Action Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-200 dark:border-white/[0.08]">
              <button
                onClick={handleCheckCache}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold tracking-wide transition-all cursor-pointer"
                title="Load any previously stored rhetorical study set without using API credits"
              >
                <Database className="h-3.5 w-3.5" />
                <span>Load Cached Set</span>
              </button>

              {/* Difficulty Mode Selector */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
                <span className="text-[10px] font-semibold uppercase text-zinc-400 px-2 tracking-wider">Mode:</span>
                {(['easy', 'standard', 'hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all cursor-pointer ${
                      difficulty === diff
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    {diff === 'standard' ? 'Standard' : diff}
                  </button>
                ))}
              </div>

              <button
                onClick={hasKey ? handleGenerateClick : onOpenApiKeyModal}
                disabled={hasKey && (isGenerating || filledCount < 2)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-semibold text-xs tracking-wide uppercase shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 cursor-pointer"
              >
                {hasKey ? <Sparkles className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                <span>{!hasKey ? 'Add API key to generate' : isGenerating ? 'Synthesizing...' : 'Generate Sentence Game & Quiz'}</span>
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

        <KeyStatusPanel theme="rhetoric" onOpenApiKeyModal={onOpenApiKeyModal} className="mt-8" />
      </div>

      <ConfirmDialog
        isOpen={pendingCached !== null}
        theme="rhetoric"
        title="Load your saved study set?"
        message={
          pendingCached && (
            <>
              Opens the study set you saved for {pendingCached.terms.length} terms:{' '}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {pendingCached.terms.slice(0, 5).join(', ')}
                {pendingCached.terms.length > 5 ? ', …' : ''}
              </span>
              . It loads instantly and doesn't use any API credits.
            </>
          )
        }
        confirmLabel="Load saved study set"
        onCancel={() => setPendingCached(null)}
        onConfirm={() => {
          if (pendingCached) {
            onGenerate(pendingCached.data, pendingCached.terms);
            onLoadingChange(false);
          }
          setPendingCached(null);
        }}
      />

      {/* Confirmation Modal */}
      {confirmGenerateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-md">
          <div className="card-glass rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-luxury">
            <h3 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-50">Generate Rhetorical Packet?</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              This calls Gemini AI to build sentence guessing games, flashcards, and an AP-tier rhetorical analysis quiz for {pendingTerms.length} devices.
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
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors"
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
            <h3 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-50">Saved Packet Found</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              A pre-generated study packet was found for this exact set of rhetorical terms. Load it immediately?
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
