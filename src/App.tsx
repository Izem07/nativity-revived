import { useState, useMemo } from 'react';
import {
  BookOpen,
  Brain,
  FileText,
  Feather,
  Target,
  RotateCcw,
  BookMarked,
  KeyRound,
  Scroll,
  Layers,
  Sun,
  Moon,
  Flame
} from 'lucide-react';
import SplashScreen from './components/SplashScreen';
import { Tabs, TabsList, TabsTrigger } from './components/ui/Tabs';
import {
  QuizGenerationResult,
  RhetoricalGenerationResult,
  generateMoreQuizQuestions,
  generateMoreParagraph,
  generateMoreRhetoricalQuizQuestions,
  generateMoreRhetoricalPassage,
} from './services/geminiService';
import { useHasApiKey } from './hooks/useHasApiKey';
import { VocabInput } from './components/VocabInput';
import { RhetoricalInput } from './components/RhetoricalInput';
import { ActiveRecallFlashcards, Card } from './components/ActiveRecallFlashcards';
import { QuizModule, QuizQuestion as DualQuizQuestion } from './components/QuizModule';
import { ParagraphReview, ParagraphReviewData, ParagraphSegment } from './components/ParagraphReview';
import { PassageStudy } from './components/PassageStudy';
import { AnalogyQuiz } from './components/AnalogyQuiz';
import { HomeDashboard } from './components/HomeDashboard';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GenerationProgress } from './components/GenerationProgress';
import { cancelGeneration } from './services/generationControl';
import { useTheme } from './theme/ThemeProvider';

type StudySubject = 'home' | 'vocab' | 'analogy' | 'rhetoric' | 'passage';
type VocabLearningMode = 'input' | 'flashcards' | 'quiz' | 'paragraph';
type RhetoricalLearningMode = 'input' | 'flashcards' | 'quiz' | 'paragraph';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [subject, setSubject] = useState<StudySubject>('home');
  const { resolvedTheme, setTheme } = useTheme();

  // API Key State
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const apiKeyConfigured = useHasApiKey();

  // Vocab State
  const [vocabMode, setVocabMode] = useState<VocabLearningMode>('input');
  const [vocabData, setVocabData] = useState<QuizGenerationResult | null>(null);
  const [vocabularyList, setVocabularyList] = useState<string[]>([]);

  // Rhetorical State
  const [rhetoricalMode, setRhetoricalMode] = useState<RhetoricalLearningMode>('input');
  const [rhetoricalData, setRhetoricalData] = useState<RhetoricalGenerationResult | null>(null);
  const [rhetoricalTermsList, setRhetoricalTermsList] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  // Analogies and Passage Study show their own progress screens but still lock navigation
  const [isSectionGenerating, setIsSectionGenerating] = useState(false);
  const navLocked = isLoading || isSectionGenerating;

  const hasVocabContent = Boolean(vocabData);
  const hasRhetoricalContent = Boolean(rhetoricalData);

  const handleVocabDataGenerated = (data: QuizGenerationResult, vocabList: string[]) => {
    setVocabData(data);
    setVocabularyList(vocabList);
    setVocabMode('flashcards');
    setIsLoading(false);
  };

  const handleRhetoricalDataGenerated = (data: RhetoricalGenerationResult, termsList: string[]) => {
    setRhetoricalData(data);
    setRhetoricalTermsList(termsList);
    setRhetoricalMode('flashcards');
    setIsLoading(false);
  };

  // -------------------------------------------------------------
  // Data Adapters for Modern Active-Recall, Quiz, and Review Hub
  // -------------------------------------------------------------
  const vocabActiveCards: Card[] = useMemo(() => {
    if (!vocabData?.flashcards) return [];
    return vocabData.flashcards.map((f, idx) => {
      let sentenceWithBlank = f.context || f.example;
      if (f.example && f.word) {
        const regex = new RegExp(`\\b${f.word}\\b`, 'gi');
        if (regex.test(f.example)) {
          sentenceWithBlank = f.example.replace(regex, '______');
        }
      }

      return {
        id: `vocab-${idx}-${f.word}`,
        type: 'vocab' as const,
        term: f.word,
        definition: f.definition,
        synonyms: f.synonyms,
        antonyms: f.antonyms,
        mnemonicTip: f.mnemonic || (f.synonyms ? `Synonyms: ${f.synonyms}` : undefined),
        prompt: f.definition,
        sentencePrompt: sentenceWithBlank
          ? `Fill in the missing vocabulary word:\n"${sentenceWithBlank}"`
          : `Provide the vocabulary word matching: "${f.definition}"`,
        answer: `${f.word} — ${f.definition}${f.example ? `\n\nExample: "${f.example}"` : ''}`,
        hint: f.mnemonic ? `Mnemonic: ${f.mnemonic}` : (f.synonyms ? `Synonyms: ${f.synonyms}` : undefined),
      };
    });
  }, [vocabData]);

  const vocabQuizQuestions: DualQuizQuestion[] = useMemo(() => {
    if (!vocabData?.quiz) return [];
    return vocabData.quiz.map((q, idx) => ({
      id: `vocab-q-${idx}`,
      type: 'vocab' as const,
      mode: 'sentence' as const,
      prompt: q.question,
      options: q.options,
      correctAnswer: q.options[q.correct] || q.word,
    }));
  }, [vocabData]);

  const vocabParagraphReviewData: ParagraphReviewData | null = useMemo(() => {
    if (!vocabData?.paragraph?.paragraph) return null;
    const rawParagraph = vocabData.paragraph.paragraph;

    const sentenceMatches = rawParagraph.match(/[^.!?]+[.!?]+(\s+|$)/g) || [rawParagraph];
    const segments: ParagraphSegment[] = [];
    const usedWords = new Set<string>();

    sentenceMatches.forEach((sentence) => {
      // Find all bold occurrences in this sentence
      const allBolds = Array.from(sentence.matchAll(/\*\*(.*?)\*\*/g)).map((m) => m[1].trim());

      if (allBolds.length === 1) {
        // Exactly one bold word: replace it with ______
        const targetWord = allBolds[0];
        const cleanSentence = sentence.replace(/\*\*(.*?)\*\*/g, '______').trim();
        segments.push({
          id: `vocab-seg-${segments.length}`,
          text: cleanSentence,
          targetKey: targetWord,
        });
        usedWords.add(targetWord.toLowerCase());
      } else if (allBolds.length > 1) {
        // If a sentence has multiple bold words, create a segment for each bold word,
        // but ONLY blank out that specific targetWord and keep the other bold words as normal text!
        allBolds.forEach((targetWord) => {
          let cleanSentence = sentence;
          allBolds.forEach((w) => {
            if (w.toLowerCase() === targetWord.toLowerCase()) {
              cleanSentence = cleanSentence.replace(new RegExp(`\\*\\*${w}\\*\\*`, 'g'), '______');
            } else {
              cleanSentence = cleanSentence.replace(new RegExp(`\\*\\*${w}\\*\\*`, 'g'), w);
            }
          });
          segments.push({
            id: `vocab-seg-${segments.length}`,
            text: cleanSentence.trim(),
            targetKey: targetWord,
          });
          usedWords.add(targetWord.toLowerCase());
        });
      }
    });

    // Ensure all vocabulary words from the user's active list are covered with context sentences
    if (vocabData.flashcards) {
      vocabData.flashcards.forEach((f) => {
        if (!usedWords.has(f.word.toLowerCase())) {
          const sText = f.context || f.example;
          if (sText) {
            const regex = new RegExp(`\\b${f.word}\\b`, 'gi');
            const blanked = sText.replace(regex, '______');
            segments.push({
              id: `vocab-seg-${segments.length}`,
              text: blanked,
              targetKey: f.word,
            });
            usedWords.add(f.word.toLowerCase());
          }
        }
      });
    }

    if (segments.length === 0 && vocabularyList.length > 0) {
      vocabularyList.forEach((w, idx) => {
        segments.push({
          id: `vocab-seg-${idx}`,
          text: `The context clearly illustrates the meaning and application of the term ______ in this sentence.`,
          targetKey: w,
        });
      });
    }

    const available = Array.from(
      new Set([
        ...segments.map((s) => s.targetKey),
        ...vocabularyList,
      ])
    );

    return {
      title: 'PARAGRAPH REVIEW',
      type: 'vocab' as const,
      segments,
      availableTerms: available,
    };
  }, [vocabData, vocabularyList]);

  // Handlers for in-module difficulty generation
  const handleRegenerateVocabParagraph = async (diff: 'easy' | 'standard' | 'hard') => {
    if (!vocabularyList || vocabularyList.length === 0) return;
    const newParagraph = await generateMoreParagraph(
      vocabularyList,
      diff === 'standard' ? 'medium' : diff
    );
    if (newParagraph) {
      setVocabData((prev) => (prev ? { ...prev, paragraph: newParagraph } : prev));
    }
  };

  const handleRegenerateVocabQuiz = async (diff: 'easy' | 'standard' | 'hard') => {
    if (!vocabularyList || vocabularyList.length === 0) return;
    const newQuiz = await generateMoreQuizQuestions(
      vocabularyList,
      diff === 'standard' ? 'medium' : diff
    );
    if (newQuiz && newQuiz.length > 0) {
      setVocabData((prev) => (prev ? { ...prev, quiz: newQuiz } : prev));
    }
  };

  const handleRegenerateRhetoricalParagraph = async (diff: 'easy' | 'standard' | 'hard') => {
    if (!rhetoricalTermsList || rhetoricalTermsList.length === 0) return;
    const newPassage = await generateMoreRhetoricalPassage(
      rhetoricalTermsList,
      diff === 'standard' ? 'medium' : diff
    );
    if (newPassage) {
      setRhetoricalData((prev) => (prev ? { ...prev, passage: newPassage } : prev));
    }
  };

  const handleRegenerateRhetoricalQuiz = async (diff: 'easy' | 'standard' | 'hard') => {
    if (!rhetoricalTermsList || rhetoricalTermsList.length === 0) return;
    const newQuiz = await generateMoreRhetoricalQuizQuestions(
      rhetoricalTermsList,
      diff === 'standard' ? 'medium' : diff
    );
    if (newQuiz && newQuiz.length > 0) {
      setRhetoricalData((prev) => (prev ? { ...prev, quiz: newQuiz } : prev));
    }
  };

  const rhetoricalActiveCards: Card[] = useMemo(() => {
    if (!rhetoricalData?.flashcards) return [];
    return rhetoricalData.flashcards.map((f, idx) => ({
      id: `rhetoric-${idx}-${f.term}`,
      type: 'rhetorical' as const,
      term: f.term,
      definition: `${f.definition}\n\nRhetorical Effect: ${f.rhetoricalEffect}`,
      mnemonicTip: f.mnemonic || (f.historicExample ? `Historic Example: "${f.historicExample}"` : undefined),
      prompt: f.definition,
      sentencePrompt: f.historicExample
        ? `Historical Excerpt:\n"${f.historicExample}"\n\nWhich rhetorical device is deployed in this excerpt?`
        : f.exampleSentence
        ? `Passage Excerpt:\n"${f.exampleSentence}"\n\nIdentify the rhetorical move demonstrated above.`
        : `Which rhetorical device is defined as: "${f.definition}"?`,
      answer: `${f.term} — ${f.definition}\n\nRhetorical Function: ${f.rhetoricalEffect}`,
      hint: f.mnemonic ? `Mnemonic: ${f.mnemonic}` : (f.etymology ? `Origin: ${f.etymology}` : undefined),
    }));
  }, [rhetoricalData]);

  const rhetoricalQuizQuestions: DualQuizQuestion[] = useMemo(() => {
    if (!rhetoricalData?.quiz) return [];
    return rhetoricalData.quiz.map((q, idx) => ({
      id: `rhetoric-q-${idx}`,
      type: 'rhetorical' as const,
      mode: (q.question.toLowerCase().includes('definition') ? 'definition' : 'sentence') as 'definition' | 'sentence',
      prompt: q.question,
      options: q.options,
      correctAnswer: q.options[q.correct] || q.term,
    }));
  }, [rhetoricalData]);

  const rhetoricalParagraphReviewData: ParagraphReviewData | null = useMemo(() => {
    if (!rhetoricalData) return null;

    const segments: ParagraphSegment[] = (rhetoricalData.sentenceMatches || []).map((item, idx) => ({
      id: `rhet-seg-${idx}`,
      text: item.targetSentence || item.explanation,
      targetKey: item.term,
    }));

    const available = Array.from(
      new Set([
        ...segments.map((s) => s.targetKey),
        ...rhetoricalTermsList,
      ])
    );

    return {
      title: 'PARAGRAPH REVIEW',
      type: 'rhetorical' as const,
      segments,
      availableTerms: available,
    };
  }, [rhetoricalData, rhetoricalTermsList]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  const isHome = subject === 'home';
  const isVocab = subject === 'vocab';
  const isAnalogy = subject === 'analogy';
  const isRhetoric = subject === 'rhetoric';
  const isPassage = subject === 'passage';
  const isDark = resolvedTheme === 'dark';

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg-page)] text-[var(--text-primary)] antialiased font-sans selection:bg-brand-500/30 transition-colors duration-300">
      {/* Background Micro-Noise Grid */}
      <div className="pointer-events-none fixed inset-0 bg-noise opacity-30 z-0" />

      {/* Atmospheric Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0 transition-opacity duration-1000">
        {isHome && (
          <>
            <div className={`absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full ${isDark ? 'bg-rose-600/20' : 'bg-rose-400/10'} blur-[140px]`} />
            <div className={`absolute top-1/4 -right-40 h-[500px] w-[500px] rounded-full ${isDark ? 'bg-red-500/15' : 'bg-red-300/10'} blur-[140px]`} />
          </>
        )}
        {isVocab && (
          <>
            <div className={`absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full ${isDark ? 'bg-brand-600/15' : 'bg-brand-400/10'} blur-[140px]`} />
            <div className={`absolute top-1/4 -right-40 h-[500px] w-[500px] rounded-full ${isDark ? 'bg-sky-500/10' : 'bg-sky-300/10'} blur-[140px]`} />
          </>
        )}
        {isAnalogy && (
          <>
            <div className={`absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full ${isDark ? 'bg-violet-600/20' : 'bg-violet-400/10'} blur-[140px]`} />
            <div className={`absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full ${isDark ? 'bg-fuchsia-500/15' : 'bg-fuchsia-300/10'} blur-[140px]`} />
          </>
        )}
        {isRhetoric && (
          <>
            <div className={`absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full ${isDark ? 'bg-emerald-600/15' : 'bg-emerald-400/10'} blur-[140px]`} />
            <div className={`absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full ${isDark ? 'bg-teal-500/10' : 'bg-teal-300/10'} blur-[140px]`} />
          </>
        )}
        {isPassage && (
          <>
            <div className={`absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full ${isDark ? 'bg-amber-500/15' : 'bg-amber-400/10'} blur-[140px]`} />
            <div className={`absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full ${isDark ? 'bg-yellow-500/10' : 'bg-yellow-300/10'} blur-[140px]`} />
          </>
        )}
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Luxury Modern Header */}
        <header className="sticky top-0 z-30 border-b border-zinc-200 dark:border-white/[0.08] bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl transition-all">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Brand Logo & Editorial Typography */}
            <div className="flex items-center gap-3">
              <div
                className={`relative flex items-center justify-center h-10 w-10 rounded-2xl border transition-all duration-300 shadow-sm ${
                  isHome
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-500 dark:text-rose-400'
                    : isAnalogy
                    ? 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300'
                    : isPassage
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300'
                    : isRhetoric
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                    : 'border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-300'
                }`}
              >
                {isHome ? (
                  <Flame className="h-5 w-5" />
                ) : isAnalogy ? (
                  <Layers className="h-5 w-5" />
                ) : isPassage ? (
                  <Scroll className="h-5 w-5" />
                ) : isRhetoric ? (
                  <Feather className="h-5 w-5" />
                ) : (
                  <BookMarked className="h-5 w-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-baseline gap-1.5">
                    <span>Nativity</span>
                  </h1>
                  <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 font-semibold">
                    AP Lang
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                  {isHome
                    ? 'AP Lang Study Hub'
                    : isAnalogy
                    ? 'AP Lang Analogy Review'
                    : isPassage
                    ? 'Passage Practice Test'
                    : isRhetoric
                    ? 'Rhetorical Devices & Syntax Challenge'
                    : 'Academic Vocabulary Mastery'}
                </p>
              </div>
            </div>

            {/* Navigation Tabs + Status Controls */}
            <div className="flex items-center gap-2.5 flex-wrap justify-center">
              {/* Segmented Subject Switcher */}
              <nav className="flex items-center gap-1 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-white/[0.08]">
                {/* Home Command Tab (Red Style, in front of Vocab) */}
                <button
                  onClick={() => !navLocked && setSubject('home')}
                  disabled={navLocked}
                  title={navLocked ? 'Locked while generating' : undefined}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 ${
                    navLocked ? 'opacity-40 cursor-not-allowed' : ''
                  } ${
                    isHome
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-200/70 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Flame className="h-3.5 w-3.5" />
                  <span>Home</span>
                </button>

                <button
                  onClick={() => !navLocked && setSubject('vocab')}
                  disabled={navLocked}
                  title={navLocked ? 'Locked while generating' : undefined}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 ${
                    navLocked ? 'opacity-40 cursor-not-allowed' : ''
                  } ${
                    isVocab
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/70 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Vocabulary</span>
                </button>

                <button
                  onClick={() => !navLocked && setSubject('analogy')}
                  disabled={navLocked}
                  title={navLocked ? 'Locked while generating' : undefined}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 ${
                    navLocked ? 'opacity-40 cursor-not-allowed' : ''
                  } ${
                    isAnalogy
                      ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/70 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Analogies</span>
                </button>

                <button
                  onClick={() => !navLocked && setSubject('rhetoric')}
                  disabled={navLocked}
                  title={navLocked ? 'Locked while generating' : undefined}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 ${
                    navLocked ? 'opacity-40 cursor-not-allowed' : ''
                  } ${
                    isRhetoric
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/70 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Feather className="h-3.5 w-3.5" />
                  <span>Rhetorical Terms</span>
                </button>

                <button
                  onClick={() => !navLocked && setSubject('passage')}
                  disabled={navLocked}
                  title={navLocked ? 'Locked while generating' : undefined}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 ${
                    navLocked ? 'opacity-40 cursor-not-allowed' : ''
                  } ${
                    isPassage
                      ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/70 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Scroll className="h-3.5 w-3.5" />
                  <span>Passage Study</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-900 dark:text-amber-200 border border-amber-400/30 uppercase font-bold text-[9px]">
                    Beta
                  </span>
                </button>
              </nav>

              {/* Theme Toggle Button (Light / Dark) */}
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="p-2 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/[0.08] transition-all"
                title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
              >
                {isDark ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-zinc-700" />}
              </button>

              {/* API Key Modal Button */}
              <button
                onClick={() => !navLocked && setIsApiKeyModalOpen(true)}
                disabled={navLocked}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 border disabled:opacity-40 disabled:cursor-not-allowed ${
                  apiKeyConfigured
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 animate-pulse'
                }`}
                title="Configure Google Gemini API Key"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    apiKeyConfigured ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-amber-500'
                  }`}
                />
                <KeyRound className="h-3 w-3" />
                <span>{apiKeyConfigured ? 'API Connected' : 'Connect Key'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Arena */}
        <main className="relative flex-1 px-4 pb-20 pt-8 md:px-8">
          {isLoading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-md">
              <div className="animate-modal-in card-glass p-8 rounded-3xl w-full max-w-sm mx-4 shadow-luxury">
                {isRhetoric ? (
                  <GenerationProgress
                    theme="rhetoric"
                    title="Building your rhetoric packet"
                    steps={['Reading your rhetorical terms', 'Writing flashcards', 'Writing quiz questions', 'Building context review']}
                    expectedSeconds={25}
                    onCancel={cancelGeneration}
                  />
                ) : (
                  <GenerationProgress
                    theme="vocab"
                    title="Building your study set"
                    steps={['Reading your vocabulary list', 'Writing flashcards', 'Writing quiz questions', 'Building the practice paragraph']}
                    expectedSeconds={25}
                    onCancel={cancelGeneration}
                  />
                )}
              </div>
            </div>
          )}

          <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
            {/* ========================================================= */}
            {/* SECTION 0: HOME DASHBOARD                                  */}
            {/* ========================================================= */}
            {isHome && (
              <HomeDashboard
                onNavigate={(s) => setSubject(s)}
                onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
              />
            )}

            {/* ========================================================= */}
            {/* SECTION 1: VOCABULARY MODE                               */}
            {/* ========================================================= */}
            {isVocab && (
              <>
                {hasVocabContent && vocabMode !== 'input' && (
                  <div
                    className={`flex flex-col sm:flex-row items-center justify-between gap-4 mx-auto w-full transition-all duration-300 ${
                      vocabMode === 'paragraph' ? 'max-w-5xl' : 'max-w-3xl'
                    }`}
                  >
                    <Tabs className="w-full">
                      <TabsList
                        value={vocabMode}
                        onChange={(_: any, value: any) => setVocabMode(value as VocabLearningMode)}
                        className="grid w-full grid-cols-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/[0.08] p-1"
                      >
                        <TabsTrigger value="flashcards" className="gap-2 text-xs font-semibold">
                          <BookOpen className="h-3.5 w-3.5" /> Flashcards
                        </TabsTrigger>
                        <TabsTrigger value="quiz" className="gap-2 text-xs font-semibold">
                          <Brain className="h-3.5 w-3.5" /> Quiz
                        </TabsTrigger>
                        <TabsTrigger value="paragraph" className="gap-2 text-xs font-semibold">
                          <FileText className="h-3.5 w-3.5" /> PARAGRAPH REVIEW
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <button
                      onClick={() => setVocabMode('input')}
                      className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-100 dark:bg-zinc-900/60 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all flex-shrink-0 font-medium"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Change Words
                    </button>
                  </div>
                )}

                <div className="relative">
                  {vocabMode === 'input' && (
                    <VocabInput
                      onGenerate={handleVocabDataGenerated}
                      onLoadingChange={setIsLoading}
                      onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
                    />
                  )}

                  {vocabMode === 'flashcards' && vocabData ? (
                    <ActiveRecallFlashcards cards={vocabActiveCards} />
                  ) : null}

                  {vocabMode === 'quiz' && vocabData ? (
                    <QuizModule
                      questions={vocabQuizQuestions}
                      onRegenerateDifficulty={handleRegenerateVocabQuiz}
                    />
                  ) : null}

                  {vocabMode === 'paragraph' && vocabData && vocabParagraphReviewData ? (
                    <ParagraphReview
                      data={vocabParagraphReviewData}
                      onRegenerateDifficulty={handleRegenerateVocabParagraph}
                    />
                  ) : null}
                </div>
              </>
            )}

            {/* ========================================================= */}
            {/* SECTION 2: ANALOGIES                                      */}
            {/* ========================================================= */}
            {isAnalogy && (
              <div className="relative">
                <ErrorBoundary>
                  <AnalogyQuiz
                    onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
                    onGeneratingChange={setIsSectionGenerating}
                  />
                </ErrorBoundary>
              </div>
            )}

            {/* ========================================================= */}
            {/* SECTION 3: RHETORICAL TERMS MODE                          */}
            {/* ========================================================= */}
            {isRhetoric && (
              <>
                {hasRhetoricalContent && rhetoricalMode !== 'input' && (
                  <div
                    className={`flex flex-col sm:flex-row items-center justify-between gap-4 mx-auto w-full transition-all duration-300 ${
                      rhetoricalMode === 'paragraph' ? 'max-w-5xl' : 'max-w-3xl'
                    }`}
                  >
                    <Tabs className="w-full">
                      <TabsList
                        value={rhetoricalMode}
                        onChange={(_: any, value: any) =>
                          setRhetoricalMode(value as RhetoricalLearningMode)
                        }
                        className="grid w-full grid-cols-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/[0.08] p-1"
                      >
                        <TabsTrigger value="flashcards" className="gap-2 text-xs font-semibold">
                          <BookOpen className="h-3.5 w-3.5" /> Flashcards
                        </TabsTrigger>
                        <TabsTrigger value="quiz" className="gap-2 text-xs font-semibold">
                          <Brain className="h-3.5 w-3.5" /> Quiz
                        </TabsTrigger>
                        <TabsTrigger value="paragraph" className="gap-2 text-xs font-semibold">
                          <FileText className="h-3.5 w-3.5" /> PARAGRAPH REVIEW
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <button
                      onClick={() => setRhetoricalMode('input')}
                      className="text-xs text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-white flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all flex-shrink-0 font-medium"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Change Devices
                    </button>
                  </div>
                )}

                <div className="relative">
                  {rhetoricalMode === 'input' && (
                    <RhetoricalInput
                      onGenerate={handleRhetoricalDataGenerated}
                      onLoadingChange={setIsLoading}
                      onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
                    />
                  )}

                  {rhetoricalMode === 'flashcards' && rhetoricalData ? (
                    <ActiveRecallFlashcards cards={rhetoricalActiveCards} />
                  ) : null}

                  {rhetoricalMode === 'quiz' && rhetoricalData ? (
                    <QuizModule
                      questions={rhetoricalQuizQuestions}
                      onRegenerateDifficulty={handleRegenerateRhetoricalQuiz}
                    />
                  ) : null}

                  {rhetoricalMode === 'paragraph' && rhetoricalData && rhetoricalParagraphReviewData ? (
                    <ParagraphReview
                      data={rhetoricalParagraphReviewData}
                      onRegenerateDifficulty={handleRegenerateRhetoricalParagraph}
                    />
                  ) : null}
                </div>
              </>
            )}

            {/* ========================================================= */}
            {/* SECTION 4: AP LANG PASSAGE STUDY MODE                      */}
            {/* ========================================================= */}
            {isPassage && (
              <div className="relative">
                <PassageStudy
                  activeRhetoricalTerms={rhetoricalTermsList}
                  activeVocabularyWords={vocabularyList}
                  onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
                  onGeneratingChange={setIsSectionGenerating}
                />
              </div>
            )}
          </div>
        </main>

        {/* Modern Footer */}
        <footer className="border-t border-zinc-200 dark:border-white/[0.08] bg-white/60 dark:bg-zinc-950/60 px-4 py-8 text-center text-xs text-zinc-500 dark:text-zinc-500">
          <div className="max-w-2xl mx-auto space-y-2">
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-400">
              Pyintel Architecture • Powered by Google Gemini
            </p>
            <p className="text-[11px] leading-relaxed text-zinc-500">
              Crafted as an academic accelerator for high school students mastering AP English Language & Composition.
            </p>
          </div>
        </footer>
      </div>

      {/* Global Unified API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        theme={subject}
      />
    </div>
  );
}

export default App;
