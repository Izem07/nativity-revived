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
import { RHETORICAL_COURSE_UNITS, RhetoricalCourseUnit } from '../data/rhetoricalCourseData';

interface RhetoricalInputProps {
  onGenerate: (result: RhetoricalGenerationResult, termsList: string[]) => void;
  onLoadingChange: (isLoading: boolean) => void;
  onOpenApiKeyModal?: () => void;
}

export function RhetoricalInput({ onGenerate, onLoadingChange, onOpenApiKeyModal }: RhetoricalInputProps) {
  const [selectedUnitId, setSelectedUnitId] = useState<string>(RHETORICAL_COURSE_UNITS[0].id);
  const [termsList, setTermsList] = useState<string[]>([...RHETORICAL_COURSE_UNITS[0].terms]);
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
      onGenerate(cached.data, cached.terms);
      onLoadingChange(false);
      setError(null);
    } else {
      setError('No cached rhetorical study packet found in local storage. Generate one first!');
    }
  };

  const handleGenerateClick = () => {
    const normalized = termsList.map((t) => t.trim()).filter(Boolean);
    if (normalized.length < 2) {
      setError('Please provide at least 2 rhetorical devices.');
      return;
    }
    // Check if this exact set already has cached data to save API credits
    const cached = getCachedRhetoricalResult(normalized);
    if (cached) {
      onGenerate(cached.data, normalized);
      onLoadingChange(false);
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

    try {
      const result = await generateRhetoricalContent(normalized);
      setCachedRhetoricalResult(normalized, result);
      onGenerate(result, normalized);
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : 'Failed to generate rhetorical study packet. Please check your API key.',
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
        {/* Course Units Selector */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-500 dark:text-zinc-400 font-semibold">
              Canonical Course Curriculum (Tests 1–10)
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

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {RHETORICAL_COURSE_UNITS.map((unit) => {
              const isSelected = unit.id === selectedUnitId;
              return (
                <button
                  key={unit.id}
                  onClick={() => handleSelectUnit(unit)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 shadow-sm'
                      : 'border-zinc-200 dark:border-white/[0.06] bg-zinc-50 dark:bg-white/[0.02] text-zinc-700 dark:text-zinc-300 hover:border-emerald-500/40'
                  }`}
                >
                  <div className="text-xs font-semibold truncate">{unit.unitTitle}</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {unit.terms.length} devices
                  </div>
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
                <div className="font-serif text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {activeUnit.unitTitle} — Teacher PPT Notes
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

        {/* Input Mode Content */}
        <div className="space-y-6 pt-4 border-t border-zinc-200 dark:border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-500 dark:text-zinc-400 font-semibold">
              Active Devices to Study ({filledCount})
            </span>
            <button
              onClick={handleAddTerm}
              className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
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
                    placeholder="Rhetorical Device"
                    className="flex-1 px-2.5 py-1.5 bg-transparent text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none font-medium"
                  />
                  {termsList.length > 1 && (
                    <button
                      onClick={() => handleRemoveTerm(index)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-200 dark:border-white/[0.08]">
            <button
              onClick={handleCheckCache}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold tracking-wide transition-all"
              title="Load any previously stored rhetorical study packet without using API credits"
            >
              <Database className="h-3.5 w-3.5" />
              <span>Load Cached Packet</span>
            </button>

            <button
              onClick={handleGenerateClick}
              disabled={isGenerating || filledCount < 2}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-semibold text-xs tracking-wide uppercase shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isGenerating ? 'Synthesizing...' : 'Generate Sentence Game & Quiz'}</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

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
