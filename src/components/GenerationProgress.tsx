import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

export type GenerationTheme = 'vocab' | 'analogy' | 'rhetoric' | 'passage';

// Full class strings per section so Tailwind can see them at build time
const THEMES: Record<GenerationTheme, { spinner: string; icon: string; bar: string; step: string }> = {
  vocab: {
    spinner: 'border-t-brand-600 dark:border-t-brand-500',
    icon: 'text-brand-500',
    bar: 'from-brand-500 to-sky-500',
    step: 'text-brand-700 dark:text-brand-300'
  },
  analogy: {
    spinner: 'border-t-violet-600 dark:border-t-violet-500',
    icon: 'text-violet-500',
    bar: 'from-violet-500 to-fuchsia-500',
    step: 'text-violet-700 dark:text-violet-300'
  },
  rhetoric: {
    spinner: 'border-t-emerald-600 dark:border-t-emerald-500',
    icon: 'text-emerald-500',
    bar: 'from-emerald-500 to-teal-500',
    step: 'text-emerald-700 dark:text-emerald-300'
  },
  passage: {
    spinner: 'border-t-amber-500 dark:border-t-amber-400',
    icon: 'text-amber-500',
    bar: 'from-amber-400 to-yellow-500',
    step: 'text-amber-700 dark:text-amber-300'
  }
};

interface GenerationProgressProps {
  theme: GenerationTheme;
  title: string;
  steps: string[];
  // Typical time for this generation; the bar reaches ~85% around this point
  expectedSeconds: number;
  // Shows a Cancel button (with confirmation) that stops the request
  onCancel?: () => void;
}

/**
 * Progress for a single Gemini request. The API doesn't report real progress, so the bar is
 * time-based: it eases toward 95% and never claims to be finished until the result arrives
 * (the parent unmounts this). Steps advance with elapsed time to show what's being built.
 */
export function GenerationProgress({ theme, title, steps, expectedSeconds, onCancel }: GenerationProgressProps) {
  const t = THEMES[theme];
  const [elapsed, setElapsed] = useState(0);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => setElapsed((performance.now() - start) / 1000), 250);
    return () => clearInterval(id);
  }, []);

  const percent = Math.round(95 * (1 - Math.exp(-elapsed / (expectedSeconds / 2))));
  const stepIndex = Math.min(steps.length - 1, Math.floor((percent / 95) * steps.length));
  const slow = elapsed > expectedSeconds * 1.5;

  return (
    <div className="flex flex-col items-center gap-5 text-center w-full max-w-sm mx-auto">
      <div className="relative">
        <div className={`h-14 w-14 rounded-full border-2 border-zinc-300 dark:border-white/10 animate-spin ${t.spinner}`} />
        <Sparkles className={`h-6 w-6 absolute inset-0 m-auto ${t.icon}`} />
      </div>

      <div className="space-y-1">
        <h3 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
        <p className={`text-xs font-medium ${t.step}`}>{steps[stepIndex]}</p>
      </div>

      <div className="w-full space-y-2">
        <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-white/[0.08] overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-300 ease-out ${t.bar}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
          <span>
            Step {stepIndex + 1} of {steps.length}
          </span>
          <span>
            {percent}% · {Math.floor(elapsed)}s
          </span>
        </div>
      </div>

      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
        {slow
          ? 'Gemini is busier than usual. Hang tight, this can take up to a minute.'
          : `Usually takes about ${expectedSeconds} seconds.`}
      </p>

      {onCancel && (
        <button
          onClick={() => setConfirmCancel(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 dark:border-white/[0.1] text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors"
        >
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
      )}

      <ConfirmDialog
        isOpen={confirmCancel}
        theme="danger"
        title="Stop generating?"
        message="Gemini is still working on this. If you stop now, nothing is saved and you'll go back to the setup screen."
        cancelLabel="Keep going"
        confirmLabel="Stop generating"
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => {
          setConfirmCancel(false);
          onCancel?.();
        }}
      />
    </div>
  );
}
