import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Sparkles,
  BookOpen,
  Feather,
  Trophy,
  Check,
  Plus,
  ArrowRight,
  ArrowLeft,
  Loader2,
  SlidersHorizontal,
  HelpCircle,
} from 'lucide-react';

export interface ParagraphSegment {
  id: string;
  text: string; // Plain sentence text or snippet with exactly one ______
  targetKey: string; // The correct Vocab word or Rhetorical device that matches
}

export interface ParagraphReviewData {
  title: string;
  type: 'vocab' | 'rhetorical';
  segments: ParagraphSegment[];
  availableTerms: string[]; // List of selectable terms
}

export interface ParagraphReviewProps {
  data: ParagraphReviewData;
  onComplete?: (score: number, total: number) => void;
  onRegenerateDifficulty?: (difficulty: 'easy' | 'standard' | 'hard') => Promise<void> | void;
  className?: string;
}

const PAGE_SIZE = 6;

export const ParagraphReview: React.FC<ParagraphReviewProps> = ({
  data,
  onComplete,
  onRegenerateDifficulty,
  className = '',
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [userMatches, setUserMatches] = useState<Record<string, string>>({});
  const [submittedPages, setSubmittedPages] = useState<Record<number, boolean>>({});
  const [showFinalSummary, setShowFinalSummary] = useState(false);

  // Difficulty Mode
  const [difficulty, setDifficulty] = useState<'easy' | 'standard' | 'hard'>('standard');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const segments = data?.segments || [];
  const totalPages = Math.max(1, Math.ceil(segments.length / PAGE_SIZE));
  const currentPageIndex = Math.min(pageIndex, totalPages - 1);

  // Segments for current page (max 6 sentences)
  const currentPageSegments = useMemo(() => {
    const start = currentPageIndex * PAGE_SIZE;
    return segments.slice(start, start + PAGE_SIZE);
  }, [segments, currentPageIndex]);

  // Check if current page is submitted
  const isCurrentPageSubmitted = Boolean(submittedPages[currentPageIndex]);

  // Words used in PREVIOUS completed pages
  const previouslyUsedTerms = useMemo(() => {
    const used = new Set<string>();
    for (let p = 0; p < totalPages; p++) {
      if (p !== currentPageIndex && submittedPages[p]) {
        const pageSegs = segments.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
        pageSegs.forEach((seg) => {
          if (userMatches[seg.id]) {
            used.add(userMatches[seg.id].trim().toLowerCase());
          }
        });
      }
    }
    return used;
  }, [submittedPages, currentPageIndex, totalPages, segments, userMatches]);

  // Target terms for this page
  const currentPageTargetKeys = useMemo(() => {
    return currentPageSegments.map((s) => s.targetKey);
  }, [currentPageSegments]);

  // Available words for this page:
  // Shows current page target terms, plus any terms from availableTerms that haven't been completed on previous pages
  const displayTerms = useMemo(() => {
    const pool = new Set<string>();
    // Add all target keys for this page
    currentPageTargetKeys.forEach((k) => pool.add(k));

    // Add remaining words from availableTerms that weren't completed on previous pages
    (data.availableTerms || []).forEach((t) => {
      if (!previouslyUsedTerms.has(t.trim().toLowerCase())) {
        pool.add(t);
      }
    });

    return Array.from(pool);
  }, [currentPageTargetKeys, data.availableTerms, previouslyUsedTerms]);

  if (!data || !data.segments || data.segments.length === 0) {
    return (
      <div className="max-w-5xl mx-auto w-full p-8 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.08] text-center shadow-lg">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">No Paragraph Data Available</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Generate matching exercises to review context and rhetorical moves.
        </p>
      </div>
    );
  }

  const isRhetoric = data.type === 'rhetorical';

  // Theme accents
  const accentText = isRhetoric
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-brand-600 dark:text-brand-400';
  const accentBg = isRhetoric ? 'bg-emerald-600' : 'bg-brand-600';
  const accentBgHover = isRhetoric ? 'hover:bg-emerald-500' : 'hover:bg-brand-500';
  const badgeStyle = isRhetoric
    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
    : 'bg-brand-500/10 text-brand-700 dark:text-brand-300 border-brand-500/25';

  const handleAssignTerm = (segmentId: string) => {
    if (isCurrentPageSubmitted) return;

    if (!selectedTerm) {
      if (userMatches[segmentId]) {
        setUserMatches((prev) => {
          const next = { ...prev };
          delete next[segmentId];
          return next;
        });
      }
      return;
    }

    setUserMatches((prev) => ({ ...prev, [segmentId]: selectedTerm }));
    setSelectedTerm(null);
  };

  const handleCheckCurrentPage = () => {
    setSubmittedPages((prev) => ({ ...prev, [currentPageIndex]: true }));
    setSelectedTerm(null);
  };

  const calculatePageScore = (pIndex: number) => {
    const pageSegs = segments.slice(pIndex * PAGE_SIZE, (pIndex + 1) * PAGE_SIZE);
    let correct = 0;
    pageSegs.forEach((seg) => {
      if (userMatches[seg.id]?.trim().toLowerCase() === seg.targetKey.trim().toLowerCase()) {
        correct++;
      }
    });
    return correct;
  };

  const calculateTotalScore = () => {
    let totalCorrect = 0;
    segments.forEach((seg) => {
      if (userMatches[seg.id]?.trim().toLowerCase() === seg.targetKey.trim().toLowerCase()) {
        totalCorrect++;
      }
    });
    return totalCorrect;
  };

  const handleNextPage = () => {
    if (currentPageIndex + 1 < totalPages) {
      setPageIndex(currentPageIndex + 1);
      setSelectedTerm(null);
    } else {
      setShowFinalSummary(true);
      if (onComplete) {
        onComplete(calculateTotalScore(), segments.length);
      }
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setPageIndex(currentPageIndex - 1);
      setSelectedTerm(null);
    }
  };

  const handleResetSession = () => {
    setUserMatches({});
    setSubmittedPages({});
    setPageIndex(0);
    setSelectedTerm(null);
    setShowFinalSummary(false);
  };

  const handleRegenerate = async (targetDiff: 'easy' | 'standard' | 'hard') => {
    if (!onRegenerateDifficulty || isRegenerating) return;
    setDifficulty(targetDiff);
    setIsRegenerating(true);
    try {
      await onRegenerateDifficulty(targetDiff);
      handleResetSession();
    } finally {
      setIsRegenerating(false);
    }
  };

  const pageScore = calculatePageScore(currentPageIndex);
  const totalScore = calculateTotalScore();
  const pageAssignedCount = currentPageSegments.filter((seg) => userMatches[seg.id]).length;

  // Final Summary Screen
  if (showFinalSummary) {
    const total = segments.length || 1;
    const percentage = Math.min(100, Math.max(0, Math.round((totalScore / total) * 100)));
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-5xl mx-auto w-full p-8 sm:p-12 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.08] shadow-2xl text-center space-y-6"
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
            Paragraph Context Review Complete
          </span>
          <h2 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
            {percentage >= 85 ? 'Mastery Achieved!' : percentage >= 65 ? 'Well Done!' : 'Review & Practice'}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            You accurately matched {totalScore} out of {segments.length} contextual blanks ({percentage}% Accuracy · 100 Scale)
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-md mx-auto bg-zinc-100 dark:bg-zinc-900 rounded-full h-3 overflow-hidden border border-zinc-200 dark:border-zinc-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isRhetoric ? 'bg-emerald-500' : 'bg-brand-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Page by Page Score Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto pt-2">
          {Array.from({ length: totalPages }).map((_, pIdx) => {
            const pSc = calculatePageScore(pIdx);
            const pTotal = segments.slice(pIdx * PAGE_SIZE, (pIdx + 1) * PAGE_SIZE).length;
            return (
              <div
                key={pIdx}
                className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 text-center"
              >
                <div className="text-[11px] font-mono text-zinc-400 uppercase">Part {pIdx + 1}</div>
                <div className="text-base font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                  {pSc} / {pTotal}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <button
            onClick={handleResetSession}
            className={`px-6 py-2.5 rounded-xl text-white font-semibold text-xs transition-all shadow-md inline-flex items-center gap-2 ${accentBg} ${accentBgHover}`}
          >
            <RotateCcw className="h-4 w-4" /> Restart Review
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div
      className={`max-w-5xl mx-auto w-full p-6 sm:p-9 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.08] rounded-3xl shadow-lg shadow-zinc-900/5 dark:shadow-2xl dark:shadow-black/60 transition-colors ${className}`}
    >
      {/* Top Header & Difficulty Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-zinc-200 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold uppercase tracking-wider ${badgeStyle}`}
            >
              {isRhetoric ? (
                <Feather className="h-3 w-3 text-emerald-500" />
              ) : (
                <BookOpen className="h-3 w-3 text-brand-500" />
              )}
              {isRhetoric ? 'Rhetorical Context Review' : 'Vocabulary Context Review'}
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              Part {currentPageIndex + 1} of {totalPages}
            </span>
          </div>
          <h2 className={`text-xl sm:text-2xl font-bold mt-1.5 ${accentText}`}>{data.title}</h2>
        </div>

        {/* Difficulty Controls & Generation */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
            {(['easy', 'standard', 'hard'] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => handleRegenerate(diff)}
                disabled={isRegenerating}
                className={`px-3 py-1 rounded-lg font-semibold capitalize transition-all cursor-pointer ${
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
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 font-medium transition cursor-pointer"
              title="Regenerate context review sentences with selected difficulty"
            >
              {isRegenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>Regenerate</span>
            </button>
          )}

          <button
            onClick={handleResetSession}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 font-medium transition cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Progress & Pagination Bar */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          Passage Part {currentPageIndex + 1} of {totalPages} • Blanks {currentPageIndex * PAGE_SIZE + 1}–
          {Math.min((currentPageIndex + 1) * PAGE_SIZE, segments.length)} of {segments.length}
        </span>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPageIndex(idx);
                setSelectedTerm(null);
              }}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                currentPageIndex === idx
                  ? `w-8 ${isRhetoric ? 'bg-emerald-500' : 'bg-brand-500'}`
                  : submittedPages[idx]
                  ? 'w-2.5 bg-emerald-400/60 dark:bg-emerald-600/60'
                  : 'w-2.5 bg-zinc-300 dark:bg-zinc-700'
              }`}
              title={`Jump to Part ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Available Terms Selection Bar (Word Bank for this page) */}
      <div className="p-4 sm:p-5 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase font-bold text-zinc-600 dark:text-zinc-300 tracking-wider">
            1. Select a {data.type === 'vocab' ? 'Vocabulary Word' : 'Rhetorical Term'} to place:
          </span>
          {selectedTerm && (
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 animate-pulse">
              Selected: <strong className={accentText}>{selectedTerm}</strong> (click any blank in the passage)
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {displayTerms.map((term) => {
            const isSelected = selectedTerm === term;
            // Count times placed on CURRENT page
            const timesUsedOnThisPage = currentPageSegments.filter(
              (seg) => userMatches[seg.id]?.trim().toLowerCase() === term.trim().toLowerCase()
            ).length;

            return (
              <button
                key={term}
                type="button"
                onClick={() => setSelectedTerm(isSelected ? null : term)}
                disabled={isCurrentPageSubmitted}
                className={`px-3 py-1.5 border rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer ${
                  isSelected
                    ? `${accentBg} text-white border-transparent shadow-md scale-105 ring-2 ring-brand-500/30`
                    : timesUsedOnThisPage > 0
                    ? 'bg-zinc-100 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 line-through'
                    : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-600 hover:scale-[1.02]'
                }`}
              >
                <span>{term}</span>
                {timesUsedOnThisPage > 0 && !isSelected && (
                  <span className="text-[10px] px-1 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 no-underline">
                    Placed
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Unified Connected Prose Paragraph Display */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase font-bold text-zinc-600 dark:text-zinc-300 tracking-wider">
            2. Read the passage and click the blanks to place your words:
          </span>
          <span className="text-[11px] text-zinc-400">
            {pageAssignedCount} of {currentPageSegments.length} blanks placed
          </span>
        </div>

        <div className="p-6 sm:p-8 rounded-2xl bg-zinc-50/90 dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/[0.08] text-base sm:text-lg leading-[2.3] sm:leading-[2.4] text-zinc-800 dark:text-zinc-200 transition-all select-text shadow-inner">
          {currentPageSegments.map((seg, idx) => {
            const globalIdx = currentPageIndex * PAGE_SIZE + idx;
            const matched = userMatches[seg.id];
            const isCorrect =
              isCurrentPageSubmitted &&
              matched?.trim().toLowerCase() === seg.targetKey.trim().toLowerCase();
            const isWrong =
              isCurrentPageSubmitted &&
              (!matched || matched.trim().toLowerCase() !== seg.targetKey.trim().toLowerCase());

            const hasBlank = seg.text.includes('______');
            const [before, after] = hasBlank ? seg.text.split('______') : [seg.text, ''];

            return (
              <span key={seg.id} className="inline">
                <span className="select-text">{before}</span>
                <button
                  type="button"
                  onClick={() => handleAssignTerm(seg.id)}
                  disabled={isCurrentPageSubmitted}
                  className={`inline-flex items-center align-baseline mx-1 px-3 py-0.5 rounded-xl text-xs sm:text-sm font-bold transition-all border shadow-sm cursor-pointer select-none ${
                    matched
                      ? isCurrentPageSubmitted
                        ? isCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold ring-1 ring-emerald-500/30'
                          : 'bg-rose-50 dark:bg-rose-950/70 border-rose-500 text-rose-800 dark:text-rose-300 font-bold ring-1 ring-rose-500/30'
                        : `${badgeStyle} font-bold shadow-sm hover:scale-105 active:scale-95`
                      : selectedTerm
                      ? 'bg-amber-500/15 dark:bg-amber-500/25 border-dashed border-amber-500 text-amber-700 dark:text-amber-300 animate-pulse hover:bg-amber-500/30 hover:scale-105'
                      : 'bg-white dark:bg-zinc-950 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:border-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                  title={
                    matched
                      ? isCurrentPageSubmitted
                        ? isCorrect
                          ? 'Correct match!'
                          : `Your answer: ${matched}. Correct: ${seg.targetKey}`
                        : `Assigned: ${matched}. Click to remove.`
                      : selectedTerm
                      ? `Click to place "${selectedTerm}" into Blank ${globalIdx + 1}`
                      : `Blank ${globalIdx + 1}: Select a word above, then click here`
                  }
                >
                  {matched ? (
                    <>
                      {isCurrentPageSubmitted && (
                        isCorrect ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mr-1 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 mr-1 shrink-0" />
                        )
                      )}
                      <span>{matched}</span>
                    </>
                  ) : (
                    <span className="font-mono text-xs font-semibold opacity-75">
                      [ Blank {globalIdx + 1} ]
                    </span>
                  )}
                </button>
                <span className="select-text">{after}</span>
                {' '}
              </span>
            );
          })}
        </div>

        {/* Detailed Solutions & Explanations Key (appears after checking) */}
        {isCurrentPageSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2.5"
          >
            <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2">
              <span className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Part {currentPageIndex + 1} Context Key & Breakdown:
              </span>
              <span className="font-mono font-bold text-xs text-zinc-500">
                {pageScore} of {currentPageSegments.length} Correct
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {currentPageSegments.map((seg, idx) => {
                const globalIdx = currentPageIndex * PAGE_SIZE + idx;
                const matched = userMatches[seg.id];
                const isCorrect =
                  matched?.trim().toLowerCase() === seg.targetKey.trim().toLowerCase();

                return (
                  <div
                    key={seg.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-zinc-950/70 border border-zinc-200/70 dark:border-zinc-800/60 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-mono text-[11px] font-bold text-zinc-400">
                        Blank {globalIdx + 1}:
                      </span>
                      {isCorrect ? (
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 truncate">
                          <Check className="h-3 w-3 shrink-0" />
                          {matched}
                        </span>
                      ) : (
                        <span className="font-semibold text-rose-600 dark:text-rose-400 line-through truncate">
                          {matched || '(unassigned)'}
                        </span>
                      )}
                    </div>

                    {!isCorrect && (
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0 text-[11px] bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                        Key: {seg.targetKey}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Submission & Pagination Control Bar */}
      {!isCurrentPageSubmitted ? (
        <div className="flex items-center gap-3">
          {currentPageIndex > 0 && (
            <button
              type="button"
              onClick={handlePrevPage}
              className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Previous Part
            </button>
          )}

          <button
            type="button"
            onClick={handleCheckCurrentPage}
            disabled={pageAssignedCount === 0}
            className={`flex-1 py-3.5 rounded-xl text-white font-semibold text-sm transition-all shadow-md inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${accentBg} ${accentBgHover}`}
          >
            <Sparkles className="h-4 w-4" /> Check Part {currentPageIndex + 1} Blanks
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                pageScore === currentPageSegments.length
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-amber-500/10 text-amber-500'
              }`}
            >
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Part {currentPageIndex + 1} Score: {pageScore} of {currentPageSegments.length} correct
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {pageScore === currentPageSegments.length
                  ? 'Flawless contextual analysis on this part!'
                  : 'Review the context solutions above before moving forward.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {currentPageIndex > 0 && (
              <button
                onClick={handlePrevPage}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Previous Part
              </button>
            )}

            <button
              onClick={handleNextPage}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-white font-semibold text-xs shadow-md transition-all inline-flex items-center justify-center gap-2 cursor-pointer ${accentBg} ${accentBgHover}`}
            >
              <span>
                {currentPageIndex + 1 < totalPages
                  ? `Continue to Part ${currentPageIndex + 2} (${segments.length - (currentPageIndex + 1) * PAGE_SIZE} words remaining)`
                  : 'View Overall Results'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
