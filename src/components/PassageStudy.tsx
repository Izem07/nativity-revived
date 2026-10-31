import { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  KeyRound,
  Database,
  FileText
} from 'lucide-react';
import {
  PassageTest,
  PassageType,
  PASSAGE_TYPES,
  PASSAGE_QUESTION_COUNT,
  generatePassageTest,
  getCachedPassageTest
} from '../services/passageStudyService';
import { KeyStatusPanel } from './KeyStatusPanel';
import { GenerationProgress } from './GenerationProgress';
import { useHasApiKey } from '../hooks/useHasApiKey';
import { ConfirmDialog } from './ConfirmDialog';
import { beginGeneration, endGeneration, cancelGeneration, isCancelledError } from '../services/generationControl';

interface PassageStudyProps {
  activeRhetoricalTerms?: string[];
  activeVocabularyWords?: string[];
  onOpenApiKeyModal?: () => void;
  // Lets the app lock navigation while a test is being generated
  onGeneratingChange?: (isGenerating: boolean) => void;
}

const LETTERS = 'ABCDE';

export function PassageStudy({
  activeRhetoricalTerms = [],
  activeVocabularyWords = [],
  onOpenApiKeyModal,
  onGeneratingChange
}: PassageStudyProps) {
  const hasKey = useHasApiKey();
  const [passageType, setPassageType] = useState<PassageType>('Speech');
  const [topic, setTopic] = useState('');
  const [test, setTest] = useState<PassageTest | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Saved test waiting for the user to confirm loading it
  const [pendingCached, setPendingCached] = useState<PassageTest | null>(null);

  const startTest = (t: PassageTest) => {
    setTest(t);
    setAnswers({});
    setSubmitted(false);
    setError(null);
    window.scrollTo({ top: 0 });
  };

  const handleGenerate = async () => {
    if (!hasKey) {
      onOpenApiKeyModal?.();
      return;
    }
    setIsLoading(true);
    onGeneratingChange?.(true);
    setError(null);
    const signal = beginGeneration();
    try {
      const t = await generatePassageTest({
        passageType,
        topic,
        vocabularyHints: [...activeVocabularyWords, ...activeRhetoricalTerms]
      });
      if (signal.aborted) return;
      startTest(t);
    } catch (err: any) {
      // Cancelled by the user: back to the setup screen quietly
      if (signal.aborted || isCancelledError(err)) return;
      const message = String(err?.message || '');
      if (message.includes('API key')) onOpenApiKeyModal?.();
      setError(message || 'Failed to generate a test. Check your connection or quota and try again.');
    } finally {
      endGeneration(signal);
      setIsLoading(false);
      onGeneratingChange?.(false);
    }
  };

  const handleLoadCached = () => {
    const cached = getCachedPassageTest();
    if (cached) setPendingCached(cached);
    else setError('No saved test yet. Generate one first!');
  };

  const handleSubmit = () => {
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ---------- Loading ----------
  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto p-8 sm:p-12 rounded-3xl bg-white dark:bg-zinc-925 border border-amber-500/30 shadow-xl">
        <GenerationProgress
          theme="passage"
          title={`Writing your ${passageType.toLowerCase()} and test`}
          steps={[
            'Choosing the rhetorical situation',
            'Writing the passage',
            'Writing rhetorical situation questions',
            'Writing reasoning and style questions',
            'Writing answer explanations'
          ]}
          expectedSeconds={35}
          onCancel={cancelGeneration}
        />
      </div>
    );
  }

  // ---------- Setup ----------
  if (!test) {
    return (
      <div className="max-w-2xl mx-auto rounded-3xl p-6 sm:p-10 bg-white dark:bg-zinc-925 border border-amber-500/30 shadow-xl">
        <div className="text-center">
          <div className="inline-flex p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 mb-5">
            <BookOpen className="h-8 w-8" />
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
            Passage Practice Test
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md mx-auto">
            A new nonfiction passage with {PASSAGE_QUESTION_COUNT} AP Lang Section I style multiple-choice questions on
            rhetorical situation, claims, reasoning and style.
          </p>
        </div>

        <div className="mt-8 space-y-5">
          <div>
            <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-500 dark:text-zinc-400 font-semibold block mb-2">
              Passage type
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PASSAGE_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setPassageType(type)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    passageType === type
                      ? 'bg-amber-500 border-amber-500 text-zinc-950'
                      : 'border-zinc-200 dark:border-white/[0.08] text-zinc-600 dark:text-zinc-300 hover:border-amber-500/50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="passage-topic"
              className="text-[11px] font-mono tracking-wider uppercase text-zinc-500 dark:text-zinc-400 font-semibold block mb-2"
            >
              Topic <span className="normal-case tracking-normal font-sans font-normal">(optional)</span>
            </label>
            <input
              id="passage-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="e.g. public libraries, child labor, space exploration"
              className="w-full rounded-xl py-3 px-4 text-base sm:text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-white/[0.1] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-800 dark:text-rose-200 text-xs">
              {error}
            </div>
          )}

          <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
            <button
              onClick={handleLoadCached}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold text-xs tracking-wide transition-colors"
            >
              <Database className="h-4 w-4" />
              Load Last Test
            </button>
            <button
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs tracking-wide shadow-md shadow-amber-500/25 transition-colors"
            >
              {hasKey ? <Sparkles className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
              {hasKey ? 'Generate Passage & Test' : 'Add API key to generate'}
            </button>
          </div>
        </div>

        <KeyStatusPanel theme="passage" onOpenApiKeyModal={onOpenApiKeyModal} className="mt-8" />

        <ConfirmDialog
          isOpen={pendingCached !== null}
          theme="passage"
          title="Load your last test?"
          message={
            pendingCached && (
              <>
                Opens <span className="font-semibold text-zinc-800 dark:text-zinc-200">{pendingCached.title}</span>{' '}
                ({pendingCached.passageType.toLowerCase()}, {pendingCached.questions.length} questions) with fresh
                answers. It doesn't use any API credits.
              </>
            )
          }
          confirmLabel="Load test"
          onCancel={() => setPendingCached(null)}
          onConfirm={() => {
            if (pendingCached) startTest(pendingCached);
            setPendingCached(null);
          }}
        />
      </div>
    );
  }

  // ---------- Test & Results ----------
  const total = test.questions.length;
  const answeredCount = Object.keys(answers).length;
  const score = test.questions.filter((q, i) => answers[i] === q.correctIndex).length;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {submitted && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-zinc-925 border border-amber-500/30 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="font-serif text-4xl font-bold text-zinc-900 dark:text-white">
              {score}
              <span className="text-xl text-zinc-400 font-sans font-normal"> / {total}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {Math.round((score / total) * 100)}% correct
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Explanations are shown under each question.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => startTest(test)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/[0.1] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05] text-xs font-semibold transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Retake
            </button>
            <button
              onClick={() => setTest(null)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" /> New Passage
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Passage */}
        <article className="lg:sticky lg:top-24 rounded-3xl bg-white dark:bg-zinc-925 border border-amber-500/25 shadow-lg overflow-hidden">
          <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-zinc-200 dark:border-white/[0.06]">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold mb-2">
              <FileText className="h-3.5 w-3.5" /> {test.passageType}
            </div>
            <h2 className="font-serif text-2xl font-semibold text-zinc-900 dark:text-zinc-50 leading-tight">{test.title}</h2>
            {test.author && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{test.author}</p>}
            {test.context && (
              <p className="text-xs italic text-zinc-600 dark:text-zinc-400 mt-3 leading-relaxed">{test.context}</p>
            )}
          </div>
          <div className="px-6 sm:px-8 py-5 space-y-4 lg:max-h-[calc(100vh-14rem)] overflow-y-auto">
            {test.paragraphs.map((p, i) => (
              <div key={i} className="flex gap-3">
                <span className="w-5 flex-shrink-0 pt-1 text-right font-mono text-[10px] text-amber-600/80 dark:text-amber-400/70 select-none">
                  {i + 1}
                </span>
                <p className="font-serif text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">{p}</p>
              </div>
            ))}
          </div>
        </article>

        {/* Questions */}
        <div className="space-y-4">
          {test.questions.map((q, qi) => {
            const chosen = answers[qi];
            const isRight = chosen === q.correctIndex;
            return (
              <div
                key={qi}
                className="p-5 rounded-2xl bg-white dark:bg-zinc-925 border border-zinc-200 dark:border-white/[0.08] shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
                    <span className="font-mono text-amber-700 dark:text-amber-400 mr-1.5">{qi + 1}.</span>
                    {q.question}
                  </p>
                  {submitted && (
                    isRight ? (
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 flex-shrink-0 text-rose-500" />
                    )
                  )}
                </div>

                <div className="space-y-1.5">
                  {q.choices.map((choice, ci) => {
                    const selected = chosen === ci;
                    let style =
                      'border-zinc-200 dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:border-amber-500/50 hover:bg-amber-500/[0.04]';
                    if (selected && !submitted) {
                      style = 'border-amber-500 bg-amber-500/10 text-zinc-900 dark:text-zinc-50';
                    }
                    if (submitted) {
                      if (ci === q.correctIndex) {
                        style = 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100';
                      } else if (selected) {
                        style = 'border-rose-500 bg-rose-500/10 text-rose-900 dark:text-rose-100';
                      } else {
                        style = 'border-zinc-200 dark:border-white/[0.04] text-zinc-500 dark:text-zinc-500';
                      }
                    }
                    return (
                      <button
                        key={ci}
                        disabled={submitted}
                        onClick={() => setAnswers((prev) => ({ ...prev, [qi]: ci }))}
                        className={`w-full flex items-start gap-3 text-left px-3.5 py-2.5 rounded-xl border text-sm transition-colors disabled:cursor-default ${style}`}
                      >
                        <span className="font-mono text-xs font-semibold pt-0.5">{LETTERS[ci] ?? ci + 1}</span>
                        <span className="leading-relaxed">{choice}</span>
                      </button>
                    );
                  })}
                </div>

                {submitted && (
                  <div className="mt-3 p-3 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.06]">
                    <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-400">
                      {q.skill} · Answer {LETTERS[q.correctIndex]}
                      {chosen === undefined && ' · Skipped'}
                    </span>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed mt-1">{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}

          {!submitted && (
            <div className="sticky bottom-4 flex items-center justify-between gap-3 p-4 rounded-2xl bg-white/95 dark:bg-zinc-925/95 border border-amber-500/30 shadow-xl backdrop-blur">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                {answeredCount} of {total} answered
                {answeredCount < total && answeredCount > 0 && ' · blanks count as wrong'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setTest(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors"
                >
                  Exit
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={answeredCount === 0}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Submit Test
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PassageStudy;
