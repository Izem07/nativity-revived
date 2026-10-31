import React, { useState, useEffect, useRef } from 'react';
import {
  KeyRound,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ClipboardPaste,
  Eye,
  EyeOff,
  Trash2,
  X,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { testAPIKey } from '../services/geminiService';
import { globalKeyPool } from '../services/keyPoolService';

export type ApiKeyModalTheme = 'home' | 'vocab' | 'analogy' | 'rhetoric' | 'passage';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: (key: string) => void;
  // Accent color follows the section the dialog was opened from
  theme?: ApiKeyModalTheme;
}

// Full class strings per section so Tailwind can see them at build time
const THEMES: Record<
  ApiKeyModalTheme,
  { stripe: string; iconTile: string; link: string; step: string; inputFocus: string; button: string }
> = {
  home: {
    stripe: 'from-rose-500 via-red-500 to-rose-600',
    iconTile: 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400',
    link: 'text-rose-700 dark:text-rose-400',
    step: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
    inputFocus: 'focus:border-rose-500',
    button: 'text-white bg-rose-600 hover:bg-rose-500 shadow-rose-600/25 disabled:hover:bg-rose-600'
  },
  vocab: {
    stripe: 'from-brand-500 via-brand-600 to-sky-500',
    iconTile: 'bg-brand-500/10 border-brand-500/25 text-brand-600 dark:text-brand-400',
    link: 'text-brand-700 dark:text-brand-300',
    step: 'bg-brand-500/10 text-brand-700 dark:text-brand-300 border-brand-500/20',
    inputFocus: 'focus:border-brand-500',
    button: 'text-white bg-brand-600 hover:bg-brand-500 shadow-brand-600/25 disabled:hover:bg-brand-600'
  },
  analogy: {
    stripe: 'from-violet-500 via-fuchsia-500 to-violet-600',
    iconTile: 'bg-violet-500/10 border-violet-500/25 text-violet-600 dark:text-violet-400',
    link: 'text-violet-700 dark:text-violet-300',
    step: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20',
    inputFocus: 'focus:border-violet-500',
    button: 'text-white bg-violet-600 hover:bg-violet-500 shadow-violet-600/25 disabled:hover:bg-violet-600'
  },
  rhetoric: {
    stripe: 'from-emerald-400 via-emerald-500 to-teal-500',
    iconTile: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
    link: 'text-emerald-700 dark:text-emerald-400',
    step: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    inputFocus: 'focus:border-emerald-500',
    button: 'text-white bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25 disabled:hover:bg-emerald-600'
  },
  passage: {
    stripe: 'from-amber-400 via-amber-500 to-yellow-500',
    iconTile: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
    link: 'text-amber-700 dark:text-amber-400',
    step: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25',
    inputFocus: 'focus:border-amber-500',
    button: 'text-zinc-950 bg-amber-500 hover:bg-amber-400 shadow-amber-500/25 disabled:hover:bg-amber-500'
  }
};

type Status = { kind: 'idle' } | { kind: 'success'; message: string } | { kind: 'error'; message: string };

const maskKey = (k: string) => `${k.slice(0, 6)}••••••${k.slice(-4)}`;

export function ApiKeyModal({ isOpen, onClose, onKeySaved, theme = 'home' }: ApiKeyModalProps) {
  const t = THEMES[theme];
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [poolKeys, setPoolKeys] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  // Only close on a click that both starts and ends on the backdrop, so dragging a
  // text selection out of the input doesn't dismiss the dialog
  const pressedBackdrop = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setPoolKeys(globalKeyPool.getKeys());
      setKeyInput('');
      setStatus({ kind: 'idle' });
    }
  }, [isOpen]);

  // Kept in a ref so the open/close effect below doesn't re-run every time the parent re-renders
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);

    // Stop the page behind from scrolling while the dialog is open. Pad by the scrollbar's
    // width so hiding it doesn't shift the page sideways.
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 50);

    return () => {
      window.removeEventListener('keydown', onKey);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
      clearTimeout(focusTimer);
    };
  }, [isOpen]);

  const updateInput = (value: string) => {
    setKeyInput(value);
    setStatus({ kind: 'idle' });
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard?.readText();
      if (text) updateInput(text.trim());
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const handleVerifyAndAdd = async () => {
    // Support comma or newline separated batch entry
    const candidates = Array.from(new Set(keyInput.split(/[\n,\s]+/).map((k) => k.trim()).filter(Boolean)));
    if (candidates.length === 0) {
      setStatus({ kind: 'error', message: 'Paste a Gemini API key first.' });
      return;
    }

    setIsVerifying(true);
    setStatus({ kind: 'idle' });

    // Verify every key in parallel; each check is a single fast request
    const results = await Promise.all(candidates.map((key) => testAPIKey(key)));
    const valid = candidates.filter((_, i) => results[i].valid);
    const invalidCount = candidates.length - valid.length;

    for (const key of valid) globalKeyPool.addKey(key);
    setPoolKeys(globalKeyPool.getKeys());
    setIsVerifying(false);

    if (valid.length === 0) {
      setStatus({ kind: 'error', message: results[0].error || 'That key could not be verified.' });
      return;
    }

    setKeyInput('');
    onKeySaved?.(valid[0]);
    setStatus({
      kind: invalidCount > 0 ? 'error' : 'success',
      message:
        invalidCount > 0
          ? `Added ${valid.length} key${valid.length === 1 ? '' : 's'}. ${invalidCount} couldn't be verified and ${invalidCount === 1 ? 'was' : 'were'} skipped.`
          : valid.length === 1
            ? 'Key verified and added.'
            : `${valid.length} keys verified and added.`
    });
  };

  const handleRemoveKey = (idx: number) => {
    globalKeyPool.removeKey(idx);
    const updated = globalKeyPool.getKeys();
    setPoolKeys(updated);
    setStatus({ kind: 'idle' });
    if (updated.length === 0) onKeySaved?.('');
  };

  if (!isOpen) return null;

  const hasKeys = poolKeys.length > 0;

  return (
    <div
      onMouseDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (pressedBackdrop.current && e.target === e.currentTarget) onClose();
        pressedBackdrop.current = false;
      }}
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 dark:bg-black/80"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-key-title"
        // Plain CSS fade-in: framer-motion's opacity animation blinked to 0 for a frame on finish
        className="animate-modal-in relative w-full max-w-md rounded-3xl overflow-hidden max-h-[90vh] flex flex-col bg-white dark:bg-zinc-925 border border-zinc-200 dark:border-white/[0.08] shadow-2xl text-zinc-900 dark:text-zinc-100"
      >
        <div className={`h-[3px] bg-gradient-to-r ${t.stripe}`} />

        {/* Header */}
        <div className="flex items-start gap-3.5 px-6 sm:px-7 pt-6 pb-5">
          <div className={`p-2.5 rounded-xl border ${t.iconTile}`}>
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="api-key-title" className="font-serif text-2xl font-semibold tracking-tight leading-tight">
              Gemini API keys
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Nativity uses your free Gemini keys to generate study material. Add more than one and it switches
              automatically when a key hits its limit.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 sm:px-7 pb-6 space-y-5 overflow-y-auto">
          {/* Key list */}
          {hasKeys ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono tracking-wider uppercase font-semibold text-zinc-500 dark:text-zinc-400">
                  Connected · {poolKeys.length}
                </span>
                {poolKeys.length > 1 && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                    <RefreshCw className="h-3 w-3" /> Auto-switching on
                  </span>
                )}
              </div>
              <ul className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] divide-y divide-zinc-200 dark:divide-white/[0.06] max-h-40 overflow-y-auto">
                {poolKeys.map((k, idx) => (
                  <li key={k} className="group flex items-center gap-3 px-3.5 py-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981] flex-shrink-0" />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 w-10 flex-shrink-0">Key {idx + 1}</span>
                    <span className="font-mono text-xs text-zinc-800 dark:text-zinc-200 flex-1 truncate">
                      {maskKey(k)}
                    </span>
                    <button
                      onClick={() => handleRemoveKey(idx)}
                      aria-label={`Remove key ${idx + 1}`}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 opacity-60 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ol className="rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.06] p-4 space-y-2.5 text-xs text-zinc-600 dark:text-zinc-300">
              {[
                <>
                  Open{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-0.5 font-semibold hover:underline underline-offset-2 ${t.link}`}
                  >
                    Google AI Studio <ExternalLink className="h-3 w-3" />
                  </a>{' '}
                  and sign in.
                </>,
                <>Click <span className="font-semibold text-zinc-900 dark:text-white">Create API key</span>. It's free.</>,
                <>Paste it below.</>
              ].map((step, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className={`h-5 w-5 rounded-full flex-shrink-0 flex items-center justify-center font-mono text-[10px] font-semibold border ${t.step}`}>
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isVerifying && keyInput.trim()) handleVerifyAndAdd();
            }}
            className="space-y-3"
          >
            <label htmlFor="api-key-input" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
              {hasKeys ? 'Add another key' : 'Your API key'}
            </label>
            <div className="relative">
              <input
                id="api-key-input"
                ref={inputRef}
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => updateInput(e.target.value)}
                placeholder="AIzaSy…"
                autoComplete="off"
                spellCheck={false}
                disabled={isVerifying}
                className={`w-full rounded-xl py-3 pl-4 pr-20 font-mono text-base sm:text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-white/[0.1] placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none disabled:opacity-60 ${t.inputFocus}`}
              />
              <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handlePaste}
                  aria-label="Paste from clipboard"
                  title="Paste"
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
                >
                  <ClipboardPaste className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowKey((prev) => !prev)}
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                  title={showKey ? 'Hide' : 'Show'}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
              Separate multiple keys with commas. Keys are stored only in this browser.
            </p>

            {status.kind !== 'idle' && (
              <div role="status">
                <div
                  className={`flex items-start gap-2 p-3 rounded-xl text-xs border ${
                    status.kind === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-500/10 border-rose-500/25 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {status.kind === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
                  )}
                  <span className="leading-relaxed">{status.message}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
              >
                {hasKeys ? 'Done' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isVerifying || !keyInput.trim()}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${t.button}`}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…
                  </>
                ) : (
                  'Verify & add'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ApiKeyModal;
