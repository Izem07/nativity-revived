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
  Plus,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  FileText
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
import { RHETORICAL_COURSE_UNITS, RhetoricalCourseUnit } from '../data/rhetoricalCourseData';

interface RhetoricalInputProps {
  onGenerate: (result: RhetoricalGenerationResult, termsList: string[]) => void;
  onLoadingChange: (isLoading: boolean) => void;
  onOpenApiKeyModal?: () => void;
}

const MIN_TERM_NUMBER_DIGITS = 2;
const TERM_NUMBER_BADGE_BASE_WIDTH = 28;
const TERM_NUMBER_BADGE_WIDTH_PER_DIGIT = 8;

export function RhetoricalInput({ onGenerate, onLoadingChange, onOpenApiKeyModal }: RhetoricalInputProps) {
  // Initialize with Unit 1 (Test 1) from the Course PPT
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
  const termNumberDigits = Math.max(MIN_TERM_NUMBER_DIGITS, String(Math.max(termsList.length, 1)).length);
  const termNumberMinWidth = TERM_NUMBER_BADGE_BASE_WIDTH + termNumberDigits * TERM_NUMBER_BADGE_WIDTH_PER_DIGIT;

  const formatTermNumber = (position: number) => String(position).padStart(termNumberDigits, '0');

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
    <Box sx={{ mx: 'auto', width: '100%', maxWidth: 960, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header Banner */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
          <Chip
            icon={<GraduationCap className="h-4 w-4 text-emerald-400" />}
            label="AP Language & Composition Curriculum"
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
            fontFamily: 'serif',
          }}
        >
          Rhetorical Terms: Course Material
        </Typography>

        <Typography variant="body1" align="center" sx={{ mt: 1, color: 'text.secondary', maxWidth: 740, mx: 'auto' }}>
          Select your class unit to study exact terms, definitions, and examples from the AP Lang course PPT.
          Test your mastery with <strong>Sentence Guessing, Flashcards, Quizzes</strong>, and <strong>Passage Practice</strong>.
        </Typography>
      </motion.header>

      {/* Main Container Paper */}
      <Paper elevation={6} sx={{ p: 3, border: '1px solid rgba(16, 185, 129, 0.2)', bgcolor: 'rgba(15, 23, 42, 0.85)' }}>
        {/* Course Units Selector - Tab Grid */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BookOpen className="h-4 w-4 text-emerald-400" />
              Course Units (Tests 1–10 from Class Material)
            </Typography>
            <span className="text-xs text-emerald-300/80 font-mono">
              {RHETORICAL_COURSE_UNITS.length} Units Configured
            </span>
          </Box>

          {/* Unit Pills Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {RHETORICAL_COURSE_UNITS.map((unit) => {
              const isSelected = selectedUnitId === unit.id;
              return (
                <button
                  key={unit.id}
                  onClick={() => handleSelectUnit(unit)}
                  className={`p-2.5 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-950/60 border-emerald-400 text-white shadow-md shadow-emerald-500/10 ring-1 ring-emerald-400'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-emerald-500/40'
                  }`}
                >
                  <div className="font-bold text-emerald-400 truncate mb-1">
                    {typeof unit.testNumber === 'number' ? `Test ${unit.testNumber}` : unit.testNumber}
                  </div>
                  <div className="text-[11px] text-slate-200 truncate">{unit.unitTitle.split(':')[1]?.trim() || unit.unitTitle}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{unit.terms.length} Terms</div>
                </button>
              );
            })}
          </div>

          {/* Active Unit Description Banner */}
          {activeUnit && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: 'rgba(6, 78, 59, 0.25)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                  <span className="text-emerald-400 font-bold">{activeUnit.unitTitle}: </span>
                  {activeUnit.description}
                </Typography>

                {activeUnit.termsDetailed.length > 0 && (
                  <Button
                    size="small"
                    onClick={() => setShowCourseNotes((prev) => !prev)}
                    sx={{ color: '#34d399', textTransform: 'none', fontSize: '0.75rem' }}
                    endIcon={showCourseNotes ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  >
                    {showCourseNotes ? 'Hide PPT Notes' : 'View Course PPT Definitions & Examples'}
                  </Button>
                )}
              </Box>

              {/* Course PPT Notes Collapse */}
              <Collapse in={showCourseNotes}>
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {activeUnit.termsDetailed.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 space-y-1">
                        <span className="font-bold text-emerald-300 block text-xs">{item.term}</span>
                        <p className="text-slate-300 leading-relaxed text-[11px]">{item.definition}</p>
                        {item.example && (
                          <p className="text-amber-200/90 italic font-serif text-[11px] pt-0.5">
                            Ex: “{item.example}”
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Box>
              </Collapse>
            </Box>
          )}
        </Box>

        {/* Input Controls Bar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div>
            <Typography variant="subtitle2" sx={{ color: 'white' }}>
              Terms to Study ({filledCount} Loaded)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {inputMode === 'list'
                ? 'Terms pre-populated from course unit. You can add or modify terms as needed.'
                : 'Paste a syllabus or notes text to extract devices.'}
            </Typography>
          </div>

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

        {/* Mode: List Entry */}
        {inputMode === 'list' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ maxHeight: '380px', overflowY: 'auto', pr: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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
                    placeholder="Enter device name..."
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

        {/* Action Buttons */}
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            size="small"
            startIcon={<KeyRound className="h-4 w-4 text-emerald-400" />}
            onClick={onOpenApiKeyModal}
            sx={{ color: getStoredAPIKey() ? '#34d399' : 'text.secondary' }}
          >
            {getStoredAPIKey() ? '✓ Gemini API Key Pool Ready' : 'Connect Gemini API Key (Free)'}
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
              {isGenerating ? 'Generating Materials...' : `Study ${activeUnit ? activeUnit.unitTitle.split(':')[0] : 'Selected Terms'}`}
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Confirmation to Generate Dialog */}
      <Dialog open={confirmGenerateOpen} onClose={() => setConfirmGenerateOpen(false)}>
        <DialogTitle sx={{ bgcolor: '#0f172a', color: 'white' }}>Generate Study Materials?</DialogTitle>
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
            We found previously generated study materials for this unit. You can load them instantly
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
