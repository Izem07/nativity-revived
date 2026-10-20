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
  Loader2
} from 'lucide-react';
import { testAPIKey, getStoredAPIKey } from '../services/geminiService';
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
  const [existingKey, setExistingKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredAPIKey();
      setExistingKey(stored);
      setKeyInput(stored);
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

  const handleVerifyAndSave = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      setErrorMessage('Please enter an API key.');
      setVerifyStatus('error');
      return;
    }

    setIsVerifying(true);
    setVerifyStatus('idle');
    setErrorMessage('');

    try {
      const testResult = await testAPIKey(trimmed);
      if (testResult.valid) {
        localStorage.setItem('GEMINI_API_KEY', trimmed);
        setExistingKey(trimmed);
        setVerifyStatus('success');
        onKeySaved?.(trimmed);
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setVerifyStatus('error');
        setErrorMessage(
          testResult.error?.includes('API_KEY_INVALID') || testResult.error?.includes('400')
            ? 'Invalid API Key. Please verify the key from Google AI Studio.'
            : testResult.error || 'API Key verification failed. Please check your key.'
        );
      }
    } catch (err: any) {
      setVerifyStatus('error');
      setErrorMessage(err?.message || 'Verification failed. Please check your network and API key.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveKey = () => {
    localStorage.removeItem('GEMINI_API_KEY');
    setExistingKey('');
    setKeyInput('');
    setVerifyStatus('idle');
    setErrorMessage('');
    onKeySaved?.('');
  };

  // Mask key for display
  const maskedKey = existingKey
    ? existingKey.slice(0, 7) + '••••••••••••••••' + existingKey.slice(-4)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 text-white overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border border-amber-500/30 text-amber-400">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Gemini API Key
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Local & Private
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Stored directly in your browser. Never sent to any third party.
            </p>
          </div>
        </div>

        {/* Free API Key Banner & Guide */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Need a free API key?
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 underline"
            >
              Get Free Key from Google <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            1. Open Google AI Studio with your Google account. <br />
            2. Click <strong>"Create API key"</strong>. <br />
            3. Paste it below and click <strong>Verify & Save</strong>.
          </p>
        </div>

        {/* Currently Saved Key Pill if exists */}
        {existingKey && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-slate-300 font-mono text-[11px]">{maskedKey}</span>
            </div>
            <button
              onClick={handleRemoveKey}
              className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px] font-medium transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        )}

        {/* Input Field with Quick Actions */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            {existingKey ? 'Update API Key' : 'Enter API Key'}
          </label>
          <div className="relative flex items-center">
            <input
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value.trim());
                setVerifyStatus('idle');
                setErrorMessage('');
              }}
              placeholder="AIzaSy..."
              className="w-full bg-slate-950/80 border border-slate-700 focus:border-emerald-500 rounded-2xl py-3 pl-4 pr-24 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors font-mono"
            />
            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={handlePaste}
                title="Paste from clipboard"
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors text-xs flex items-center gap-1"
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
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
              <span>API Key verified successfully! Connected and ready.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button onClick={onClose} variant="ghost" size="small" className="text-slate-400">
            Cancel
          </Button>

          <Button
            onClick={handleVerifyAndSave}
            disabled={isVerifying || !keyInput.trim()}
            variant="primary"
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
              </>
            ) : (
              'Verify & Save Key'
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default ApiKeyModal;
