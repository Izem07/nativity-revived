import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export type ConfirmTheme = 'vocab' | 'analogy' | 'rhetoric' | 'passage' | 'danger';

// Full class strings per theme so Tailwind can see them at build time
const CONFIRM_BUTTON: Record<ConfirmTheme, string> = {
  vocab: 'bg-brand-600 hover:bg-brand-500 text-white',
  analogy: 'bg-violet-600 hover:bg-violet-500 text-white',
  rhetoric: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  passage: 'bg-amber-500 hover:bg-amber-400 text-zinc-950',
  danger: 'bg-rose-600 hover:bg-rose-500 text-white'
};

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  theme: ConfirmTheme;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  theme,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  // Focus starts on the safe choice so a stray Enter never confirms
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancelRef.current();
      }
    };
    window.addEventListener('keydown', onKey, true);
    cancelButtonRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen]);

  if (!isOpen) return null;

  // Rendered on <body> so a parent with a blur/transform can't trap the overlay inside itself
  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      className="animate-fade-in fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/60 dark:bg-black/80"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="animate-modal-in w-full max-w-sm rounded-3xl p-6 text-left bg-white dark:bg-zinc-925 border border-zinc-200 dark:border-white/[0.08] shadow-2xl space-y-4"
      >
        <h3 id="confirm-title" className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h3>
        <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{message}</div>
        <div className="flex gap-2 pt-2">
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-white/[0.1] text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${CONFIRM_BUTTON[theme]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
