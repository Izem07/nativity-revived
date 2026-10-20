import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles,
  KeyRound,
  X,
  ShieldCheck,
  ClipboardPaste,
  Feather,
  BookOpen,
  Database,
  ArrowRight,
  HelpCircle,
  Plus
} from 'lucide-react';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { generateRhetoricalContent, RhetoricalGenerationResult, getStoredAPIKey } from '../services/geminiService';
import { getCachedRhetoricalResult, setCachedRhetoricalResult } from '../services/cacheService';

interface RhetoricalInputProps {
  onGenerate: (result: RhetoricalGenerationResult, termsList: string[]) => void;
  onLoadingChange: (isLoading: boolean) => void;
  onOpenApiKeyModal?: () => void;
}

const MIN_TERM_NUMBER_DIGITS = 2;
const TERM_NUMBER_BADGE_BASE_WIDTH = 28;
const TERM_NUMBER_BADGE_WIDTH_PER_DIGIT = 8;

const PRE_FILLED_RHETORICAL_LISTS = [
  {
    label: 'AP Lang Essential Rhetorical Devices (18 Devices)',
    terms: [
      'Anaphora',
      'Antithesis',
      'Chiasmus',
      'Polysyndeton',
      'Asyndeton',
      'Litotes',
      'Metonymy',
      'Synecdoche',
      'Zeugma',
      'Epistrophe',
      'Hypophora',
      'Paradox',
      'Oxymoron',
      'Apostrophe',
      'Euphemism',
      'Hyperbole',
      'Juxtaposition',
      'Understatement',
    ],
  },
  {
    label: 'Master Tropes & Figurative Language (12 Devices)',
    terms: [
      'Metaphor',
      'Metonymy',
      'Synecdoche',
      'Hyperbole',
      'Litotes',
      'Personification',
      'Oxymoron',
      'Paradox',
      'Apostrophe',
      'Euphemism',
      'Allusion',
      'Irony',
    ],
  },
  {
    label: 'Syntactic Schemes & Rhythm (10 Schemes)',
    terms: [
      'Parallelism',
      'Chiasmus',
      'Antithesis',
      'Anaphora',
      'Epistrophe',
      'Polysyndeton',
      'Asyndeton',
      'Isocolon',
      'Zeugma',
      'Anadiplosis',
    ],
  },
] as const;

export function RhetoricalInput({ onGenerate, onLoadingChange, onOpenApiKeyModal }: RhetoricalInputProps) {
  const [termsList, setTermsList] = useState<string[]>(['']);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('GEMINI_API_KEY') ?? '');
  const [showApiPanel, setShowApiPanel] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [cacheDialogOpen, setCacheDialogOpen] = useState(false);
  const [pendingTerms, setPendingTerms] = useState<string[]>([]);
  const [confirmGenerateOpen, setConfirmGenerateOpen] = useState(false);

  const [inputMode, setInputMode] = useState<'list' | 'paragraph'>('list');
  const [paragraphText, setParagraphText] = useState('');

  const filledCount = useMemo(() => termsList.filter((term) => term.trim() !== '').length, [termsList]);
  const termNumberDigits = Math.max(MIN_TERM_NUMBER_DIGITS, String(Math.max(termsList.length, 1)).length);
  const termNumberMinWidth = TERM_NUMBER_BADGE_BASE_WIDTH + termNumberDigits * TERM_NUMBER_BADGE_WIDTH_PER_DIGIT;

  const formatTermNumber = (position: number) => String(position).padStart(termNumberDigits, '0');

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
      .map((t) => t.trim())
      .filter(Boolean);

    if (terms.length > 1) {
      event.preventDefault();
      setTermsList(terms.slice(0, 50));
    }
  };

  const handleProcessParagraph = () => {
    if (!paragraphText.trim()) return;
    const extracted = paragraphText
      .split(/[,\n.;]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (extracted.length > 0) {
      setTermsList(extracted.slice(0, 50));
      setInputMode('list');
      setParagraphText('');
      setError(null);
    } else {
      setError('Could not extract any rhetorical devices from the text.');
    }
  };

  const handleApplyPreFilledList = (terms: readonly string[]) => {
    setTermsList([...terms]);
    setError(null);
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setApiKeySaved(false);
  };

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
      setApiKeySaved(true);
    }
  };

  const handleCheckCache = () => {
    const normalized = termsList.map((t) => t.trim()).filter(Boolean);
    if (normalized.length < 3) {
      setError('Please enter at least 3 rhetorical terms.');
      return;
    }
    const cached = getCachedRhetoricalResult(normalized);
    if (cached) {
      setPendingTerms(normalized);
      setCacheDialogOpen(true);
    } else {
      setError('No cached data found for this rhetorical terms list.');
    }
  };

  const handleGenerate = () => {
    const normalized = termsList.map((t) => t.trim()).filter(Boolean);
    if (normalized.length < 3) {
      setError('Please enter at least 3 rhetorical terms.');
      return;
    }
    if (normalized.length > 50) {
      setError('Please enter no more than 50 rhetorical terms.');
      return;
    }
    if (!getStoredAPIKey()) {
      if (onOpenApiKeyModal) {
        onOpenApiKeyModal();
        return;
      }
    }
    setPendingTerms(normalized);
    setConfirmGenerateOpen(true);
  };

  const handleConfirmGenerate = async () => {
    setConfirmGenerateOpen(false);
    await runGenerate(pendingTerms);
    setPendingTerms([]);
  };

  const handleUseCached = () => {
    setCacheDialogOpen(false);
    const cached = getCachedRhetoricalResult(pendingTerms);
    if (cached) {
      onGenerate(cached, pendingTerms);
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
          : 'Failed to generate rhetorical study materials. Please check your API key and try again.'
      );
      onLoadingChange(false);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Box sx={{ mx: 'auto', width: '100%', maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header Banner */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
          <Chip
            icon={<Feather className="h-4 w-4 text-emerald-400" />}
            label="AP Lang Rhetorical Analysis Companion"
            sx={{
              fontWeight: 700,
              bgcolor: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          />
        </Stack>

        <Typography
          variant="h3"
          align="center"
          sx={{
            fontWeight: 800,
            letterSpacing: 2,
            background: 'linear-gradient(to right, #34d399, #2dd4bf, #fde047)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Master Rhetorical Terms & Devices
        </Typography>

        <Typography variant="body1" align="center" sx={{ mt: 1, color: 'text.secondary', maxWidth: 720, mx: 'auto' }}>
          Add <strong>3–50 rhetorical devices</strong>. We’ll generate AP Lang <strong>flashcards, quizzes</strong>, the interactive <strong>Sentence Guessing Challenge</strong>, and <em>rhetorical passage analysis</em>.
        </Typography>

        <Alert
          severity="info"
          icon={<ShieldCheck className="h-5 w-5" />}
          sx={{ mt: 3, mx: 'auto', maxWidth: 800, bgcolor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
        >
          <Typography variant="caption" sx={{ display: 'block', color: 'text.primary', fontWeight: 500 }}>
            Powered by Google Gemini API & cached locally to minimize token usage.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Study AP Language syntactic schemes (chiasmus, polysyndeton), tropes (metonymy, litotes), and persuasive effects.
          </Typography>
        </Alert>
      </motion.header>

      {/* Main Input Paper */}
      <Paper elevation={6} sx={{ p: 3, border: '1px solid rgba(16, 185, 129, 0.2)', bgcolor: 'rgba(15, 23, 42, 0.8)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Chip icon={<ClipboardPaste className="h-4 w-4" />} label="Quick Entry Supported" variant="outlined" />
            </Stack>
            <Typography variant="h6" sx={{ color: 'white' }}>Rhetorical Devices List</Typography>
            <Typography variant="body2" color="text.secondary">
              {inputMode === 'list'
                ? 'Paste a comma-separated list or enter devices one by one.'
                : "Paste a study guide or syllabus passage and we'll extract the rhetorical terms."}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant={inputMode === 'list' ? 'contained' : 'outlined'}
              onClick={() => setInputMode('list')}
              sx={inputMode === 'list' ? { bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } } : {}}
            >
              List Mode
            </Button>
            <Button
              size="small"
              variant={inputMode === 'paragraph' ? 'contained' : 'outlined'}
              onClick={() => setInputMode('paragraph')}
              sx={inputMode === 'paragraph' ? { bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } } : {}}
            >
              Extract Mode
            </Button>
          </Box>
        </Box>

        {/* Pre-Filled Lists */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontWeight: 600 }}>
            Pre-filled AP Lang Curated Sets:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {PRE_FILLED_RHETORICAL_LISTS.map((list) => (
              <Chip
                key={list.label}
                label={list.label}
                onClick={() => handleApplyPreFilledList(list.terms)}
                clickable
                color="secondary"
                variant="outlined"
                sx={{
                  borderColor: 'rgba(16, 185, 129, 0.4)',
                  color: '#34d399',
                  '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.1)' },
                }}
              />
            ))}
          </Stack>
        </Box>

        {/* Mode: List Entry */}
        {inputMode === 'list' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ maxHeight: '420px', overflowY: 'auto', pr: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {termsList.map((term, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: termNumberMinWidth,
                      height: 28,
                      borderRadius: 1,
                      bgcolor: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {formatTermNumber(index + 1)}
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="e.g. Polysyndeton, Chiasmus, Litotes..."
                    value={term}
                    onChange={(e) => handleTermChange(index, e.target.value)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(2, 6, 23, 0.6)',
                        color: 'white',
                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                        '&:hover fieldset': { borderColor: 'rgba(16, 185, 129, 0.4)' },
                        '&.Mui-focused fieldset': { borderColor: '#10b981' },
                      },
                    }}
                  />
                  {termsList.length > 1 && (
                    <IconButton size="small" onClick={() => handleRemoveTerm(index)} sx={{ color: 'text.secondary' }}>
                      <X className="h-4 w-4" />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
              <Button
                startIcon={<Plus className="h-4 w-4" />}
                onClick={handleAddTerm}
                size="small"
                disabled={termsList.length >= 50}
                sx={{ color: '#34d399' }}
              >
                Add Another Device
              </Button>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {filledCount} of {termsList.length} devices entered (Min: 3, Max: 50)
              </Typography>
            </Box>
          </Box>
        ) : (
          /* Mode: Paragraph Extraction */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              multiline
              rows={5}
              placeholder="Paste a comma-separated or text excerpt containing rhetorical terms..."
              value={paragraphText}
              onChange={(e) => setParagraphText(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(2, 6, 23, 0.6)',
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                  '&.Mui-focused fieldset': { borderColor: '#10b981' },
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleProcessParagraph}
              disabled={!paragraphText.trim()}
              sx={{ alignSelf: 'flex-start', bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
            >
              Extract Devices
            </Button>
          </Box>
        )}

        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* API Key Drawer & Action Buttons */}
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            size="small"
            startIcon={<KeyRound className="h-4 w-4 text-emerald-400" />}
            onClick={onOpenApiKeyModal}
            sx={{ color: getStoredAPIKey() ? '#34d399' : 'text.secondary' }}
          >
            {getStoredAPIKey() ? '✓ Gemini API Key Configured' : 'Connect Gemini API Key (Free)'}
          </Button>

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              onClick={handleCheckCache}
              startIcon={<Database className="h-4 w-4 text-emerald-400" />}
              disabled={isGenerating || filledCount < 3}
              sx={{ borderColor: 'rgba(16, 185, 129, 0.3)', color: '#34d399' }}
            >
              Check Cache
            </Button>
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={isGenerating || filledCount < 3}
              startIcon={<Sparkles className="h-4 w-4" />}
              sx={{ bgcolor: '#10b981', color: '#022c22', fontWeight: 700, '&:hover': { bgcolor: '#34d399' } }}
            >
              {isGenerating ? 'Generating Materials...' : 'Generate Study Materials'}
            </Button>
          </Stack>
        </Box>

        {/* API Key Collapse Panel */}
        
      </Paper>

      {/* Confirmation to Generate Dialog */}
      <Dialog open={confirmGenerateOpen} onClose={() => setConfirmGenerateOpen(false)}>
        <DialogTitle sx={{ bgcolor: '#0f172a', color: 'white' }}>Generate Rhetorical Study Materials?</DialogTitle>
        <DialogContent sx={{ bgcolor: '#0f172a', color: '#94a3b8' }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This will craft customized AP Lang flashcards, quizzes, rhetorical analysis passages, and the interactive{' '}
            <strong>Sentence Guessing Challenge</strong> for {pendingTerms.length} rhetorical devices.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#0f172a', p: 2 }}>
          <Button onClick={() => setConfirmGenerateOpen(false)} sx={{ color: '#94a3b8' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmGenerate}
            sx={{ bgcolor: '#10b981', color: '#022c22', fontWeight: 700, '&:hover': { bgcolor: '#34d399' } }}
          >
            Start Generation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Use Cache Dialog */}
      <Dialog open={cacheDialogOpen} onClose={() => setCacheDialogOpen(false)}>
        <DialogTitle sx={{ bgcolor: '#0f172a', color: 'white' }}>Cached Materials Found!</DialogTitle>
        <DialogContent sx={{ bgcolor: '#0f172a', color: '#94a3b8' }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            We found previously generated study materials for this list of rhetorical devices. You can load them instantly
            without using Gemini API tokens.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#0f172a', p: 2 }}>
          <Button onClick={handleConfirmGenerate} sx={{ color: '#94a3b8' }}>
            Generate Fresh
          </Button>
          <Button
            variant="contained"
            onClick={handleUseCached}
            sx={{ bgcolor: '#10b981', color: '#022c22', fontWeight: 700, '&:hover': { bgcolor: '#34d399' } }}
          >
            Load from Cache
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default RhetoricalInput;
