import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  XCircle,
  ClipboardPaste,
  Eye,
  EyeOff,
  Sparkles,
  Trash2,
  X,
  Loader2,
  Plus,
  RefreshCw
} from 'lucide-react';
import { testAPIKey } from '../services/geminiService';
import { globalKeyPool } from '../services/keyPoolService';
import { Button } from './ui/Button';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: (key: string) => void;
}

export function ApiKeyModal({ isOpen, onClose, onKeySaved }: ApiKeyModalProps) {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [poolKeys, setPoolKeys] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      const keys = globalKeyPool.getKeys();
      setPoolKeys(keys);
      setKeyInput('');
      setVerifyStatus('idle');
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePaste = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setKeyInput(text.trim());
          setVerifyStatus('idle');
          setErrorMessage('');
        }
      }
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const handleVerifyAndAdd = async () => {
    const raw = keyInput.trim();
    if (!raw) {
      setErrorMessage('Please enter an API key.');
      setVerifyStatus('error');
      return;
    }

    // Support comma or newline separated batch entry
    const candidates = raw.split(/[\n,]+/).map((k) => k.trim()).filter(Boolean);

    setIsVerifying(true);
    setVerifyStatus('idle');
    setErrorMessage('');

    try {
      // Verify first key as verification test
      const testResult = await testAPIKey(candidates[0]);
      if (testResult.valid) {
        for (const candidate of candidates) {
          globalKeyPool.addKey(candidate);
        }
        const updated = globalKeyPool.getKeys();
        setPoolKeys(updated);
        setKeyInput('');
        setVerifyStatus('success');
        onKeySaved?.(candidates[0]);
      } else {
        setVerifyStatus('error');
        setErrorMessage(testResult.error || 'API Key verification failed. Please check your key.');
      }
    } catch (err: any) {
      setVerifyStatus('error');
      setErrorMessage(err?.message || 'Verification failed. Please check your network and API key.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveKey = (idx: number) => {
    globalKeyPool.removeKey(idx);
    const updated = globalKeyPool.getKeys();
    setPoolKeys(updated);
    if (updated.length === 0) {
      onKeySaved?.('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] p-6 sm:p-8 shadow-2xl space-y-6 text-zinc-900 dark:text-white overflow-hidden max-h-[90vh] overflow-y-auto transition-colors"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/5 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 dark:bg-gradient-to-br dark:from-amber-400/20 dark:to-yellow-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              Gemini API Key Pool
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Auto-Failover
              </span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-slate-400">
              Rotates across your free keys automatically when rate limits (429) are reached.
            </p>
          </div>
        </div>

        {/* Free API Key Banner & Guide */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" /> Get 100% Free Gemini API Keys
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 underline"
            >
              Google AI Studio <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="text-[11px] text-zinc-600 dark:text-slate-400 leading-relaxed">
            Create 1, 2, or more free keys. When you add multiple keys, Nativity rotates between them automatically to prevent rate limits!
          </p>
        </div>

        {/* Existing Key Pool List */}
        {poolKeys.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-slate-400 px-1">
              <span className="font-semibold text-zinc-700 dark:text-slate-300">
                Active Key Pool ({poolKeys.length} {poolKeys.length === 1 ? 'Key' : 'Keys'} Configured)
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                <RefreshCw className="h-3 w-3" /> Auto-Failover Ready
              </span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {poolKeys.map((k, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-white/10 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-zinc-700 dark:text-slate-300 font-mono text-[11px]">
                      Key #{idx + 1}: {k.slice(0, 6)}••••••••{k.slice(-4)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveKey(idx)}
                    className="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 p-1 rounded-md transition-colors"
                    title="Remove Key"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Field with Quick Actions */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-700 dark:text-slate-300 block">
            {poolKeys.length === 0 ? 'Enter Gemini API Key' : 'Add Another Key to Pool'}
          </label>
          <div className="relative flex items-center">
            <input
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value);
                setVerifyStatus('idle');
                setErrorMessage('');
              }}
              placeholder="AIzaSy... (Paste one or more keys)"
              className="w-full bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-300 dark:border-slate-700 focus:border-amber-500 dark:focus:border-amber-400 rounded-2xl py-3 pl-4 pr-24 text-sm text-zinc-900 dark:text-slate-100 placeholder-zinc-400 dark:placeholder-slate-500 focus:outline-none transition-colors font-mono"
            />
            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={handlePaste}
                title="Paste from clipboard"
                className="p-1.5 rounded-lg bg-zinc-200 dark:bg-slate-800 text-zinc-700 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-300 dark:hover:bg-slate-700 transition-colors text-xs flex items-center gap-1"
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Status / Error Message */}
        <AnimatePresence>
          {verifyStatus === 'error' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs"
            >
              <XCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {verifyStatus === 'success' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-xs"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>Key verified and added to the pool successfully!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Button onClick={onClose} variant="ghost" size="small" className="text-slate-400">
            {poolKeys.length > 0 ? 'Done' : 'Cancel'}
          </Button>

          <Button
            onClick={handleVerifyAndAdd}
            disabled={isVerifying || !keyInput.trim()}
            variant="primary"
            className="bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold px-5"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
              </>
            ) : (
              <>
                <Plus className="mr-1.5 h-4 w-4" /> Verify & Add to Pool
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default ApiKeyModal;
