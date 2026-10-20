import { useCallback, useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Volume2,
  Shuffle,
  Lightbulb,
  CheckCircle,
  BookOpen,
  AlertCircle,
  Filter,
  Feather,
  History,
  Target
} from 'lucide-react';
import { RhetoricalFlashcardItem } from '../services/geminiService';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';

type ConfidenceLevel = 'know' | 'learning' | 'need-help' | null;
type FilterMode = 'all' | 'learning' | 'need-help';

interface RhetoricalFlashcardsProps {
  flashcards: RhetoricalFlashcardItem[];
}

const cardVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 120 : -120,
    opacity: 0,
    rotateY: direction > 0 ? 15 : -15,
    scale: 0.95,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    rotateY: 0,
    scale: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 120 : -120,
    opacity: 0,
    rotateY: direction < 0 ? 15 : -15,
    scale: 0.95,
  }),
};

export function RhetoricalFlashcards({ flashcards }: RhetoricalFlashcardsProps) {
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState(0);
  const [shuffledCards, setShuffledCards] = useState<RhetoricalFlashcardItem[]>(flashcards);
  const [isShuffled, setIsShuffled] = useState(false);
  const [confidenceRatings, setConfidenceRatings] = useState<Record<string, ConfidenceLevel>>({});
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('rhetorical-confidence-ratings');
      if (saved) setConfidenceRatings(JSON.parse(saved));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const saveConfidence = (term: string, level: ConfidenceLevel) => {
    const updated = { ...confidenceRatings, [term]: level };
    setConfidenceRatings(updated);
    try {
      localStorage.setItem('rhetorical-confidence-ratings', JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  const filteredCards = useMemo(() => {
    if (filterMode === 'all') return shuffledCards;
    return shuffledCards.filter((card) => {
      const rating = confidenceRatings[card.term];
      if (filterMode === 'learning') return rating === 'learning';
      if (filterMode === 'need-help') return rating === 'need-help' || !rating;
      return true;
    });
  }, [shuffledCards, filterMode, confidenceRatings]);

  const currentCard = filteredCards[index] ?? null;

  const stats = useMemo(() => {
    const total = flashcards.length;
    const know = Object.values(confidenceRatings).filter((r) => r === 'know').length;
    const learning = Object.values(confidenceRatings).filter((r) => r === 'learning').length;
    const needHelp = Object.values(confidenceRatings).filter((r) => r === 'need-help').length;
    return { total, know, learning, needHelp, unrated: total - know - learning - needHelp };
  }, [flashcards.length, confidenceRatings]);

  const goNext = useCallback(() => {
    if (!filteredCards.length) return;
    setDirection(1);
    setIsFlipped(false);
    setIndex((prev) => (prev + 1) % filteredCards.length);
  }, [filteredCards.length]);

  const goPrev = useCallback(() => {
    if (!filteredCards.length) return;
    setDirection(-1);
    setIsFlipped(false);
    setIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
  }, [filteredCards.length]);

  const toggleFlip = () => setIsFlipped((prev) => !prev);

  const toggleShuffle = () => {
    if (isShuffled) {
      setShuffledCards(flashcards);
      setIsShuffled(false);
    } else {
      const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
      setShuffledCards(shuffled);
      setIsShuffled(true);
    }
    setIndex(0);
    setIsFlipped(false);
  };

  const resetStudyProgress = () => {
    setConfidenceRatings({});
    try {
      localStorage.removeItem('rhetorical-confidence-ratings');
    } catch {
      // Ignore
    }
  };

  const speakTerm = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggleFlip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  if (!filteredCards.length) {
    return (
      <Card className="max-w-2xl mx-auto p-8 text-center bg-slate-900/80 border-slate-800">
        <Filter className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-white mb-2">No Devices Match This Filter</h3>
        <p className="text-slate-400 mb-6 text-sm">
          No rhetorical terms currently match the "{filterMode}" filter.
        </p>
        <Button onClick={() => setFilterMode('all')} variant="primary" className="bg-emerald-500 text-slate-950 font-bold">
          View All Devices
        </Button>
      </Card>
    );
  }

  const currentConfidence = currentCard ? confidenceRatings[currentCard.term] : null;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Header Controls & Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 backdrop-blur p-4 rounded-2xl border border-emerald-500/20">
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Card {index + 1} of {filteredCards.length}
          </Badge>
          {isShuffled && (
            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Shuffled
            </Badge>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/5 text-xs">
          <button
            onClick={() => {
              setFilterMode('all');
              setIndex(0);
            }}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filterMode === 'all' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => {
              setFilterMode('learning');
              setIndex(0);
            }}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filterMode === 'learning' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Learning ({stats.learning})
          </button>
          <button
            onClick={() => {
              setFilterMode('need-help');
              setIndex(0);
            }}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filterMode === 'need-help' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Need Help ({stats.needHelp})
          </button>
        </div>

        {/* Shuffle & Reset */}
        <div className="flex items-center gap-1.5">
          <Button onClick={toggleShuffle} variant="ghost" size="small" className="text-xs">
            <Shuffle className={`h-3.5 w-3.5 mr-1 ${isShuffled ? 'text-amber-400' : ''}`} />
            Shuffle
          </Button>
          <Button onClick={resetStudyProgress} variant="ghost" size="small" className="text-xs text-slate-400">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* 3D Flip Card Container */}
      <div className="relative min-h-[420px] cursor-pointer perspective-1000" onClick={toggleFlip}>
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentCard?.term + (isFlipped ? '-back' : '-front')}
            custom={direction}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className={`w-full min-h-[420px] rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl transition-all border ${
              isFlipped
                ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-emerald-500/40 shadow-emerald-500/10'
                : 'bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 border-emerald-500/20 hover:border-emerald-500/40'
            }`}
          >
            {/* Top Bar on Card */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px]">
                  {isFlipped ? 'Rhetorical Analysis' : 'AP Lang Rhetorical Device'}
                </Badge>
                {currentCard?.etymology && (
                  <span className="text-xs text-slate-400 italic">
                    {currentCard.etymology}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => speakTerm(e, currentCard?.term || '')}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 transition-colors"
                  title="Pronounce Device"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Front of Card */}
            {!isFlipped ? (
              <div className="my-auto text-center space-y-4 py-8">
                <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2">
                  <Feather className="h-8 w-8" />
                </div>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-200 tracking-wide font-serif">
                  {currentCard?.term}
                </h2>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click anywhere or press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Space</kbd> to reveal definition, rhetorical function & examples
                </p>
              </div>
            ) : (
              /* Back of Card */
              <div className="space-y-4 my-auto text-left py-2">
                {/* Definition */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
                    <BookOpen className="h-3.5 w-3.5" /> Definition
                  </h4>
                  <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
                    {currentCard?.definition}
                  </p>
                </div>

                {/* Rhetorical Effect */}
                {currentCard?.rhetoricalEffect && (
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5 mb-1">
                      <Target className="h-3.5 w-3.5" /> Rhetorical Function & Effect
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {currentCard.rhetoricalEffect}
                    </p>
                  </div>
                )}

                {/* Historic / Literary Example */}
                {currentCard?.historicExample && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5 mb-1">
                      <History className="h-3.5 w-3.5" /> Historic / Literary Example
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-200 italic font-serif">
                      “{currentCard.historicExample}”
                    </p>
                  </div>
                )}

                {/* Example Sentence */}
                {currentCard?.exampleSentence && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Illustrative Sentence
                    </h4>
                    <p className="text-xs text-slate-300 italic font-serif">
                      “{currentCard.exampleSentence}”
                    </p>
                  </div>
                )}

                {/* Mnemonic */}
                {currentCard?.mnemonic && (
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                    <Lightbulb className="h-4 w-4 flex-shrink-0 text-amber-400 mt-0.5" />
                    <div>
                      <span className="font-semibold text-amber-300">Memory Hook: </span>
                      {currentCard.mnemonic}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Card Footer: Confidence Buttons */}
            <div
              className="flex items-center justify-between pt-4 border-t border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[11px] text-slate-400">Rate your mastery:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => currentCard && saveConfidence(currentCard.term, 'need-help')}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                    currentConfidence === 'need-help'
                      ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                  }`}
                >
                  Need Help
                </button>
                <button
                  onClick={() => currentCard && saveConfidence(currentCard.term, 'learning')}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                    currentConfidence === 'learning'
                      ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                  }`}
                >
                  Learning
                </button>
                <button
                  onClick={() => currentCard && saveConfidence(currentCard.term, 'know')}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                    currentConfidence === 'know'
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                  }`}
                >
                  Mastered
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between px-2">
        <Button onClick={goPrev} variant="outline" className="border-slate-800 hover:bg-slate-800">
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <span className="text-xs text-slate-400">
          Use <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">←</kbd> and{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">→</kbd> to navigate
        </span>
        <Button onClick={goNext} variant="outline" className="border-slate-800 hover:bg-slate-800">
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

export default RhetoricalFlashcards;
