import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, RotateCcw, Feather, Sparkles, BookOpenCheck, Plus, Eye, EyeOff } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { RhetoricalPassageData, generateMoreRhetoricalPassage } from '../services/geminiService';
import Collapse from '@mui/material/Collapse';

interface RhetoricalPassagePracticeProps {
  passageData: RhetoricalPassageData | null;
  rhetoricalTerms?: string[];
}

export function RhetoricalPassagePractice({ passageData: initialData, rhetoricalTerms = [] }: RhetoricalPassagePracticeProps) {
  const [passageData, setPassageData] = useState<RhetoricalPassageData | null>(initialData);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [showGeneratePanel, setShowGeneratePanel] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'custom'>('medium');
  const [customTopic, setCustomTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Parse and highlight rhetorical devices in passage
  const formattedPassage = useMemo(() => {
    if (!passageData?.passage) return null;
    const parts = passageData.passage.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const text = part.slice(2, -2);
        return (
          <span
            key={index}
            className="font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20"
          >
            {text}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  }, [passageData]);

  const toggleReveal = (idx: number) => {
    setRevealedAnswers((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleGenerateNew = async () => {
    if (!rhetoricalTerms.length) return;
    setIsGenerating(true);
    try {
      const newPassage = await generateMoreRhetoricalPassage(rhetoricalTerms, difficulty, customTopic);
      if (newPassage) {
        setPassageData(newPassage);
        setUserAnswers({});
        setRevealedAnswers({});
        setShowGeneratePanel(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!passageData) {
    return (
      <Card className="max-w-2xl mx-auto p-8 text-center bg-slate-900 border-slate-800">
        <Feather className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-white mb-2">No Passage Available</h3>
        <p className="text-slate-400 text-sm">
          Generate study materials to analyze a speech or persuasive passage.
        </p>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Passage Showcase Card */}
      <Card className="p-6 sm:p-8 bg-slate-900/90 border-emerald-500/30 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
              <Feather className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Rhetorical Analysis Passage</h2>
              <p className="text-xs text-slate-400">
                Observe the studied rhetorical schemes & devices functioning together in authentic persuasive prose.
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 self-start sm:self-auto">
            AP Lang Synthesis & Analysis
          </Badge>
        </div>

        {/* The Text */}
        <div className="p-6 rounded-2xl bg-slate-950/70 border border-white/5 text-slate-200 text-base sm:text-lg leading-relaxed font-serif whitespace-pre-line shadow-inner">
          {formattedPassage}
        </div>
      </Card>

      {/* Rhetorical Analysis Prompts */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <BookOpenCheck className="h-5 w-5 text-emerald-400" />
          <h3 className="text-lg font-bold text-white">Rhetorical Analysis Prompts</h3>
        </div>

        {passageData.questions?.map((q, idx) => {
          const isRevealed = Boolean(revealedAnswers[idx]);
          return (
            <Card key={idx} className="p-5 sm:p-6 bg-slate-900/80 border-slate-800 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Prompt {idx + 1}
                  </span>
                  <p className="text-slate-100 font-medium text-sm sm:text-base">{q.question}</p>
                </div>

                <Button
                  onClick={() => toggleReveal(idx)}
                  variant="ghost"
                  size="small"
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex-shrink-0"
                >
                  {isRevealed ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5 mr-1" /> Hide Analysis
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5 mr-1" /> View Model Answer
                    </>
                  )}
                </Button>
              </div>

              {/* Student Practice Input */}
              <textarea
                value={userAnswers[idx] || ''}
                onChange={(e) => setUserAnswers({ ...userAnswers, [idx]: e.target.value })}
                placeholder="Draft your rhetorical analysis here (Identify the device, state the effect, connect to purpose)..."
                rows={3}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />

              {/* Model Answer Breakdown */}
              <AnimatePresence>
                {isRevealed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs sm:text-sm text-slate-300 leading-relaxed space-y-1"
                  >
                    <span className="font-bold text-emerald-300 block">AP Lang Model Analytical Response:</span>
                    <p>{q.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>

      {/* Generate New Passage Panel */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
        <button
          onClick={() => setShowGeneratePanel((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-white"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <Plus className="h-3.5 w-3.5 text-emerald-400" /> Want to analyze a different rhetorical passage?
          </span>
          <span className="text-emerald-400 font-semibold">{showGeneratePanel ? 'Hide Options' : 'Generate New Passage'}</span>
        </button>

        <Collapse in={showGeneratePanel}>
          <div className="pt-3 space-y-4 border-t border-white/10">
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                    difficulty === diff ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>

            <Button
              onClick={handleGenerateNew}
              disabled={isGenerating}
              variant="outline"
              className="w-full border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-300 text-xs font-semibold"
            >
              {isGenerating ? 'Generating Passage...' : 'Generate New Rhetorical Passage'}
            </Button>
          </div>
        </Collapse>
      </div>
    </div>
  );
}

export default RhetoricalPassagePractice;
