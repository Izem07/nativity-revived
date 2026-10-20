import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Brain,
  FileText,
  Grid3X3,
  Feather,
  Target,
  Sparkles,
  RotateCcw,
  BookMarked,
  KeyRound,
  Scroll,
  Layers,
  Sun,
  Moon
} from 'lucide-react';
import SplashScreen from './components/SplashScreen';
import { Flashcards } from './components/Flashcards';
import Quiz from './components/Quiz';
import { GameArea } from './components/GameArea';
import ParagraphPractice from './components/ParagraphPractice';
import { Tabs, TabsList, TabsTrigger } from './components/ui/Tabs';
import { QuizGenerationResult, RhetoricalGenerationResult, getStoredAPIKey } from './services/geminiService';
import { VocabInput } from './components/VocabInput';
import { RhetoricalInput } from './components/RhetoricalInput';
import { RhetoricalFlashcards } from './components/RhetoricalFlashcards';
import { RhetoricalQuiz } from './components/RhetoricalQuiz';
import { RhetoricalSentenceGame } from './components/RhetoricalSentenceGame';
import { RhetoricalPassagePractice } from './components/RhetoricalPassagePractice';
import { PassageStudy } from './components/PassageStudy';
import { AnalogyQuiz } from './components/AnalogyQuiz';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useTheme } from './theme/ThemeProvider';

type StudySubject = 'vocab' | 'analogy' | 'rhetoric' | 'passage';
type VocabLearningMode = 'input' | 'flashcards' | 'quiz' | 'matching' | 'paragraph';
type RhetoricalLearningMode = 'input' | 'flashcards' | 'quiz' | 'sentence-game' | 'passage';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [subject, setSubject] = useState<StudySubject>('vocab');
  const { resolvedTheme, setTheme } = useTheme();

  // API Key State
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(() => Boolean(getStoredAPIKey()));

  // Vocab State
  const [vocabMode, setVocabMode] = useState<VocabLearningMode>('input');
  const [vocabData, setVocabData] = useState<QuizGenerationResult | null>(null);
  const [vocabularyList, setVocabularyList] = useState<string[]>([]);

  // Rhetorical State
  const [rhetoricalMode, setRhetoricalMode] = useState<RhetoricalLearningMode>('input');
  const [rhetoricalData, setRhetoricalData] = useState<RhetoricalGenerationResult | null>(null);
  const [rhetoricalTermsList, setRhetoricalTermsList] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      setApiKeyConfigured(Boolean(getStoredAPIKey()));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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
    setRhetoricalMode('sentence-game');
    setIsLoading(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

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
                  isAnalogy
                    ? 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300'
                    : isPassage
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300'
                    : isRhetoric
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                    : 'border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-300'
                }`}
              >
                {isAnalogy ? (
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
                  {isAnalogy
                    ? 'AP Lang Analogy Review'
                    : isPassage
                    ? 'Rhetorical Analysis & SOAPSTone Engine'
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
                <button
                  onClick={() => !isLoading && setSubject('vocab')}
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 ${
                    isLoading ? 'opacity-40 cursor-not-allowed' : ''
                  } ${
                    isVocab
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Vocabulary</span>
                </button>

                <button
                  onClick={() => !isLoading && setSubject('analogy')}
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 ${
                    isLoading ? 'opacity-40 cursor-not-allowed' : ''
                  } ${
                    isAnalogy
                      ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Analogies</span>
                </button>

                <button
                  onClick={() => !isLoading && setSubject('rhetoric')}
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 ${
                    isLoading ? 'opacity-40 cursor-not-allowed' : ''
                  } ${
                    isRhetoric
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Feather className="h-3.5 w-3.5" />
                  <span>Rhetorical Terms</span>
                </button>

                <button
                  onClick={() => !isLoading && setSubject('passage')}
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 ${
                    isLoading ? 'opacity-40 cursor-not-allowed' : ''
                  } ${
                    isPassage
                      ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Scroll className="h-3.5 w-3.5" />
                  <span>Passage Study</span>
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
                onClick={() => setIsApiKeyModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 border ${
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
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-glass p-8 rounded-3xl flex flex-col items-center gap-4 text-center max-w-sm shadow-luxury"
              >
                <div className="relative">
                  <div className="h-14 w-14 rounded-full border-2 border-zinc-300 dark:border-white/10 border-t-brand-600 animate-spin" />
                  <Sparkles className="h-6 w-6 text-brand-500 absolute inset-0 m-auto" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-50">Synthesizing Content</h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                    Querying Gemini intelligence engine with AP-level pedagogical rigor...
                  </p>
                </div>
              </motion.div>
            </div>
          )}

          <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
            {/* ========================================================= */}
            {/* SECTION 1: VOCABULARY MODE                               */}
            {/* ========================================================= */}
            {isVocab && (
              <>
                {hasVocabContent && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-3xl mx-auto w-full">
                    <Tabs className="w-full">
                      <TabsList
                        value={vocabMode}
                        onChange={(_: any, value: any) => setVocabMode(value as VocabLearningMode)}
                        className="grid w-full grid-cols-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/[0.08] p-1"
                      >
                        <TabsTrigger value="flashcards" className="gap-2 text-xs font-semibold">
                          <BookOpen className="h-3.5 w-3.5" /> Flashcards
                        </TabsTrigger>
                        <TabsTrigger value="quiz" className="gap-2 text-xs font-semibold">
                          <Brain className="h-3.5 w-3.5" /> Quiz
                        </TabsTrigger>
                        <TabsTrigger value="matching" className="gap-2 text-xs font-semibold">
                          <Grid3X3 className="h-3.5 w-3.5" /> Games
                        </TabsTrigger>
                        <TabsTrigger value="paragraph" className="gap-2 text-xs font-semibold">
                          <FileText className="h-3.5 w-3.5" /> Context
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
                    <Flashcards flashcards={vocabData.flashcards} />
                  ) : null}

                  {vocabMode === 'quiz' && vocabData ? (
                    <Quiz questions={vocabData.quiz} vocabularyWords={vocabularyList} />
                  ) : null}

                  {vocabMode === 'matching' && vocabData ? (
                    <GameArea flashcards={vocabData.flashcards} />
                  ) : null}

                  {vocabMode === 'paragraph' && vocabData ? (
                    <ParagraphPractice
                      paragraphData={vocabData.paragraph}
                      vocabularyWords={vocabularyList}
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
                  <AnalogyQuiz onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)} />
                </ErrorBoundary>
              </div>
            )}

            {/* ========================================================= */}
            {/* SECTION 3: RHETORICAL TERMS MODE                          */}
            {/* ========================================================= */}
            {isRhetoric && (
              <>
                {hasRhetoricalContent && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto w-full">
                    <Tabs className="w-full">
                      <TabsList
                        value={rhetoricalMode}
                        onChange={(_: any, value: any) =>
                          setRhetoricalMode(value as RhetoricalLearningMode)
                        }
                        className="grid w-full grid-cols-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/[0.08] p-1"
                      >
                        <TabsTrigger value="sentence-game" className="gap-2 text-xs font-semibold">
                          <Target className="h-3.5 w-3.5 text-emerald-500" /> Sentence Guess
                        </TabsTrigger>
                        <TabsTrigger value="flashcards" className="gap-2 text-xs font-semibold">
                          <BookOpen className="h-3.5 w-3.5" /> Flashcards
                        </TabsTrigger>
                        <TabsTrigger value="quiz" className="gap-2 text-xs font-semibold">
                          <Brain className="h-3.5 w-3.5" /> Quiz
                        </TabsTrigger>
                        <TabsTrigger value="passage" className="gap-2 text-xs font-semibold">
                          <Feather className="h-3.5 w-3.5" /> Passage
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

                  {rhetoricalMode === 'sentence-game' && rhetoricalData ? (
                    <RhetoricalSentenceGame
                      sentenceMatches={rhetoricalData.sentenceMatches}
                      rhetoricalTerms={rhetoricalTermsList}
                      onBackToMenu={() => setRhetoricalMode('input')}
                    />
                  ) : null}

                  {rhetoricalMode === 'flashcards' && rhetoricalData ? (
                    <RhetoricalFlashcards flashcards={rhetoricalData.flashcards} />
                  ) : null}

                  {rhetoricalMode === 'quiz' && rhetoricalData ? (
                    <RhetoricalQuiz
                      questions={rhetoricalData.quiz}
                      rhetoricalTerms={rhetoricalTermsList}
                    />
                  ) : null}

                  {rhetoricalMode === 'passage' && rhetoricalData ? (
                    <RhetoricalPassagePractice
                      passageData={rhetoricalData.passage}
                      rhetoricalTerms={rhetoricalTermsList}
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
        onKeySaved={() => setApiKeyConfigured(Boolean(getStoredAPIKey()))}
      />
    </div>
  );
}

export default App;
