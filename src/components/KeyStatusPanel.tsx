import { ShieldCheck } from 'lucide-react';
import { useHasApiKey } from '../hooks/useHasApiKey';

export type KeyStatusTheme = 'vocab' | 'analogy' | 'rhetoric' | 'passage';

// Full class strings per section so Tailwind can see them at build time
const THEMES: Record<KeyStatusTheme, { divider: string; card: string; icon: string; button: string }> = {
  vocab: {
    divider: 'border-zinc-200 dark:border-white/[0.08]',
    card: 'bg-zinc-50 dark:bg-white/[0.02] border-zinc-200 dark:border-white/[0.06]',
    icon: 'text-emerald-500',
    button:
      'border-zinc-300 dark:border-white/[0.1] bg-white dark:bg-white/[0.05] text-zinc-800 dark:text-zinc-200 hover:border-brand-500'
  },
  analogy: {
    divider: 'border-violet-500/15',
    card: 'bg-violet-500/[0.04] dark:bg-violet-500/[0.05] border-violet-500/15',
    icon: 'text-violet-500 dark:text-violet-400',
    button:
      'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/50'
  },
  rhetoric: {
    divider: 'border-emerald-500/15',
    card: 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.05] border-emerald-500/15',
    icon: 'text-emerald-500 dark:text-emerald-400',
    button:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/50'
  },
  passage: {
    divider: 'border-amber-500/20',
    card: 'bg-amber-500/[0.05] dark:bg-amber-500/[0.05] border-amber-500/20',
    icon: 'text-amber-500 dark:text-amber-400',
    button:
      'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/60'
  }
};

interface KeyStatusPanelProps {
  theme: KeyStatusTheme;
  onOpenApiKeyModal?: () => void;
  // Stack the two cards vertically, for narrow containers
  stacked?: boolean;
  className?: string;
}

export function KeyStatusPanel({ theme, onOpenApiKeyModal, stacked = false, className = '' }: KeyStatusPanelProps) {
  const t = THEMES[theme];
  const connected = useHasApiKey();

  return (
    <div
      className={`pt-6 border-t grid grid-cols-1 ${stacked ? 'gap-3' : 'sm:grid-cols-2 gap-4'} text-left ${t.divider} ${className}`}
    >
      <div className={`flex items-start gap-3 p-4 rounded-2xl border ${t.card}`}>
        <ShieldCheck className={`h-5 w-5 flex-shrink-0 mt-0.5 ${t.icon}`} />
        <div>
          <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Private & Local Storage</h4>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            API keys and generated study material are saved only in this browser.
          </p>
        </div>
      </div>

      <div className={`flex items-center justify-between gap-3 p-4 rounded-2xl border ${t.card}`}>
        <div>
          <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Gemini Key Management</h4>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {connected ? 'Key pool active & connected' : 'Connect free Gemini API key'}
          </p>
        </div>
        <button
          onClick={onOpenApiKeyModal}
          className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors flex-shrink-0 ${t.button}`}
        >
          Configure
        </button>
      </div>
    </div>
  );
}
