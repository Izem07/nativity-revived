import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, RotateCcw, Trophy, XCircle, Plus, Sparkles, Feather } from 'lucide-react';
import TextField from '@mui/material/TextField';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card, CardContent } from './ui/Card';
import { RhetoricalQuizQuestion, generateMoreRhetoricalQuizQuestions } from '../services/geminiService';

interface RhetoricalQuizProps {
  questions: RhetoricalQuizQuestion[];
  rhetoricalTerms?: string[];
}

export function RhetoricalQuiz({ questions: initialQuestions, rhetoricalTerms = [] }: RhetoricalQuizProps) {
  const [questions, setQuestions] = useState<RhetoricalQuizQuestion[]>(initialQuestions);
  const [index, setIndex] = useState(0);
  const [selection, setSelection] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [showGeneratePanel, setShowGeneratePanel] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'custom'>('medium');
  const [customTopic, setCustomTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const currentQuestion = questions[index];
  const progress = useMemo(() => ((index + 1) / questions.length) * 100, [index, questions.length]);

  const selectAnswer = (optionIndex: number) => {
    if (selection !== null || !currentQuestion) return;
    setSelection(optionIndex);
    if (optionIndex === currentQuestion.correct) {
      setScore((prev) => prev + 1);
    }
  };

  const goNext = () => {
    if (index + 1 < questions.length) {
      setIndex((prev) => prev + 1);
      setSelection(null);
    } else {
      setShowResults(true);
    }
  };

  const restart = () => {
    setIndex(0);
    setSelection(null);
    setScore(0);
    setShowResults(false);
  };

  const handleGenerateMore = async () => {
    if (!rhetoricalTerms.length) return;
    setIsGenerating(true);
    try {
      const newQuestions = await generateMoreRhetoricalQuizQuestions(rhetoricalTerms, difficulty, customTopic);
      if (newQuestions.length > 0) {
        setQuestions((prev) => [...prev, ...newQuestions]);
        setShowGeneratePanel(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!questions.length) {
    return (
      <Card className="max-w-2xl mx-auto p-8 text-center bg-slate-900 border-slate-800">
        <Feather className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-white mb-2">No Quiz Questions Available</h3>
        <p className="text-slate-400 text-sm">
          Generate study materials to take an AP Lang rhetorical analysis quiz.
        </p>
      </Card>
    );
  }

  if (showResults) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto p-8 rounded-3xl bg-slate-900/90 border border-emerald-500/30 text-center space-y-6 shadow-2xl backdrop-blur"
      >
        <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Trophy className="h-10 w-10 text-amber-400" />
        </div>

        <div>
          <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
            Quiz Completed
          </Badge>
          <h2 className="text-3xl font-extrabold text-white">Rhetorical Quiz Results</h2>
          <p className="text-slate-400 text-sm mt-1">
            You scored {score} out of {questions.length} questions ({percentage}%)
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 max-w-sm mx-auto">
          <div className="text-3xl font-extrabold text-emerald-400">{percentage}%</div>
          <div className="text-xs text-slate-400 mt-1">
            {percentage >= 80 ? 'Mastery demonstrated in rhetorical devices!' : 'Good practice! Review the missed devices.'}
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Button onClick={restart} variant="primary" className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400">
            <RotateCcw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header & Progress */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-400">
        <div>
          Question <span className="font-bold text-white">{index + 1}</span> of {questions.length}
        </div>
        <div className="flex items-center gap-2">
          {currentQuestion?.term && (
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Focus: {currentQuestion.term}
            </Badge>
          )}
          <span className="text-emerald-400 font-bold">Score: {score}</span>
        </div>
      </div>

      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Question Card */}
      <Card className="p-6 sm:p-8 bg-slate-900/90 border-emerald-500/20 shadow-xl">
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> AP Lang Rhetorical Analysis
            </span>
            <h3 className="text-lg sm:text-xl font-medium text-slate-100 leading-relaxed font-serif">
              {currentQuestion?.question}
            </h3>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-3">
            {currentQuestion?.options.map((option, optIdx) => {
              const isSelected = selection === optIdx;
              const isCorrectAnswer = optIdx === currentQuestion.correct;
              const hasAnswered = selection !== null;

              let style = 'bg-slate-950/60 border-slate-800 hover:border-emerald-500/40 hover:bg-slate-850';
              if (hasAnswered) {
                if (isCorrectAnswer) {
                  style = 'bg-emerald-950/40 border-emerald-500/80 text-emerald-200 shadow-md shadow-emerald-500/10';
                } else if (isSelected) {
                  style = 'bg-rose-950/40 border-rose-500/80 text-rose-200';
                } else {
                  style = 'opacity-40 bg-slate-950/40 border-slate-900';
                }
              }

              return (
                <div
                  key={optIdx}
                  onClick={() => selectAnswer(optIdx)}
                  className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${style}`}
                >
                  <span className="text-sm sm:text-base font-medium">{option}</span>
                  {hasAnswered && isCorrectAnswer && <CheckCircle2 className="h-5 w-5 text-emerald-400 ml-2" />}
                  {hasAnswered && isSelected && !isCorrectAnswer && <XCircle className="h-5 w-5 text-rose-400 ml-2" />}
                </div>
              );
            })}
          </div>

          {/* Explanation Banner */}
          {selection !== null && currentQuestion?.explanation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 text-xs sm:text-sm text-slate-300 leading-relaxed"
            >
              <strong className="text-emerald-300 block mb-1">Explanation & Context:</strong>
              {currentQuestion.explanation}
            </motion.div>
          )}

          {/* Next Button */}
          {selection !== null && (
            <div className="flex justify-end pt-2">
              <Button onClick={goNext} variant="primary" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6">
                {index + 1 < questions.length ? 'Next Question' : 'View Results'}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Generate More Questions Drawer */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
        <button
          onClick={() => setShowGeneratePanel((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-white"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <Plus className="h-3.5 w-3.5 text-emerald-400" /> Need more practice questions?
          </span>
          <span className="text-emerald-400 font-semibold">{showGeneratePanel ? 'Hide Options' : 'Configure & Generate'}</span>
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
              onClick={handleGenerateMore}
              disabled={isGenerating}
              variant="outline"
              className="w-full border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-300 text-xs font-semibold"
            >
              {isGenerating ? 'Generating 5 Questions...' : 'Generate 5 More Questions'}
            </Button>
          </div>
        </Collapse>
      </div>
    </div>
  );
}

export default RhetoricalQuiz;
