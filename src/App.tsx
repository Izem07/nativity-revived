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
  Scroll
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
import { ApiKeyModal } from './components/ApiKeyModal';

type StudySubject = 'vocab' | 'rhetoric' | 'passage';
type VocabLearningMode = 'input' | 'flashcards' | 'quiz' | 'matching' | 'paragraph';
type RhetoricalLearningMode = 'input' | 'flashcards' | 'quiz' | 'sentence-game' | 'passage';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [subject, setSubject] = useState<StudySubject>('vocab');

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
  const isRhetoric = subject === 'rhetoric';
  const isPassage = subject === 'passage';

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white transition-colors duration-700">
      {/* Dynamic Background Glow Orbs */}
      <div className="pointer-events-none absolute inset-0 transition-opacity duration-700">
        {isVocab && (
          <>
            <div className="absolute inset-y-0 left-[-10%] h-[140%] w-[45%] rounded-full bg-brand-500/20 blur-3xl" />
            <div className="absolute right-[-20%] top-[-10%] h-[120%] w-[50%] rounded-full bg-cyan-400/20 blur-3xl" />
          </>
        )}
        {isRhetoric && (
          <>
            <div className="absolute inset-y-0 left-[-10%] h-[140%] w-[45%] rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="absolute right-[-20%] top-[-10%] h-[120%] w-[50%] rounded-full bg-teal-400/20 blur-3xl" />
            <div className="absolute left-[30%] top-[-5%] h-[80%] w-[40%] rounded-full bg-amber-400/10 blur-3xl" />
          </>
        )}
        {isPassage && (
          <>
            <div className="absolute inset-y-0 left-[-10%] h-[140%] w-[45%] rounded-full bg-amber-500/25 blur-3xl" />
            <div className="absolute right-[-20%] top-[-10%] h-[120%] w-[50%] rounded-full bg-yellow-400/20 blur-3xl" />
            <div className="absolute left-[25%] top-[10%] h-[70%] w-[50%] rounded-full bg-amber-600/15 blur-3xl" />
          </>
        )}
        <div className="absolute inset-x-0 bottom-[-20%] h-[60%] bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Top Navigation & Subject Switcher */}
        <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur-md px-4 py-3 sticky top-0 z-30">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl transition-all duration-300 ${
                  isPassage
                    ? 'bg-gradient-to-br from-amber-400/20 to-yellow-500/20 border border-amber-400/30'
                    : isRhetoric
                    ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30'
                    : 'bg-gradient-to-br from-brand-500/20 to-cyan-500/20 border border-brand-500/30'
                }`}
              >
                {isPassage ? (
                  <Scroll className="h-5 w-5 text-amber-300" />
                ) : isRhetoric ? (
                  <Feather className="h-5 w-5 text-emerald-400" />
                ) : (
                  <BookMarked className="h-5 w-5 text-cyan-400" />
                )}
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                  <span>Nativity</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold border bg-white/5 border-white/10 text-slate-300">
                    AP Lang
                  </span>
                </h1>
                <p className="text-[10px] text-slate-400">
                  {isPassage
                    ? 'AP Lang Passage Analysis & SOAPSTone'
                    : isRhetoric
                    ? 'Rhetorical Devices & Sentence Matching'
                    : 'Comprehensive Vocabulary Suite'}
                </p>
              </div>
            </div>

            {/* Actions: Subject Switcher + API Key Pill */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {/* Subject Toggle Switch */}
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-900/90 border border-white/10 shadow-inner">
                <button
                  onClick={() => setSubject('vocab')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isVocab
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-[1.02]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Vocabulary
                </button>

                <button
                  onClick={() => setSubject('rhetoric')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isRhetoric
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20 scale-[1.02]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Feather className="h-3.5 w-3.5 text-emerald-300" />
                  Rhetorical Terms
                </button>

                <button
                  onClick={() => setSubject('passage')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isPassage
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-[1.02]'
                      : 'text-slate-400 hover:text-amber-200 hover:bg-white/5'
                  }`}
                >
                  <Scroll className="h-3.5 w-3.5 text-amber-300" />
                  Passage Study
                </button>
              </div>

              {/* Efficient API Key Status Pill */}
              <button
                onClick={() => setIsApiKeyModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  apiKeyConfigured
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                    : 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20 shadow-md shadow-amber-500/10 animate-pulse'
                }`}
                title="Configure Gemini API Key"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    apiKeyConfigured ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'
                  }`}
                />
                <KeyRound className="h-3 w-3" />
                <span>{apiKeyConfigured ? 'API Connected' : 'Set API Key (Free)'}</span>
              </button>
            </div>
          </div>
        </header>

        <main className="relative flex-1 px-4 pb-16 pt-8 md:px-8">
          {isLoading && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/75 backdrop-blur-md">
              <motion.div
                className={`flex h-24 w-24 flex-col items-center justify-center rounded-3xl border ${
                  isPassage
                    ? 'border-amber-500/40 bg-amber-950/30'
                    : isRhetoric
                    ? 'border-emerald-500/30 bg-emerald-950/30'
                    : 'border-white/20 bg-white/10'
                }`}
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              >
                <motion.span
                  className={`h-12 w-12 rounded-full border-2 border-transparent ${
                    isPassage
                      ? 'border-t-amber-400'
                      : isRhetoric
                      ? 'border-t-emerald-400'
                      : 'border-t-cyan-400'
                  }`}
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
                />
              </motion.div>
            </div>
          )}

          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
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
                        className="grid w-full grid-cols-4"
                      >
                        <TabsTrigger value="flashcards" className="gap-2">
                          <BookOpen className="h-4 w-4" /> Flashcards
                        </TabsTrigger>
                        <TabsTrigger value="quiz" className="gap-2">
                          <Brain className="h-4 w-4" /> Quiz
                        </TabsTrigger>
                        <TabsTrigger value="matching" className="gap-2">
                          <Grid3X3 className="h-4 w-4" /> Games
                        </TabsTrigger>
                        <TabsTrigger value="paragraph" className="gap-2">
                          <FileText className="h-4 w-4" /> Paragraph
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <button
                      onClick={() => setVocabMode('input')}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-slate-900/60 hover:bg-slate-800 transition-colors flex-shrink-0"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Change Words
                    </button>
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-0 rounded-3xl bg-white/5 blur-3xl" />
                  <div className="relative flex flex-col gap-10">
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
                </div>
              </>
            )}

            {/* ========================================================= */}
            {/* SECTION 2: RHETORICAL TERMS MODE                          */}
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
                        className="grid w-full grid-cols-4"
                      >
                        <TabsTrigger value="sentence-game" className="gap-2">
                          <Target className="h-4 w-4 text-emerald-400" /> Sentence Guess
                        </TabsTrigger>
                        <TabsTrigger value="flashcards" className="gap-2">
                          <BookOpen className="h-4 w-4" /> Flashcards
                        </TabsTrigger>
                        <TabsTrigger value="quiz" className="gap-2">
                          <Brain className="h-4 w-4" /> Quiz
                        </TabsTrigger>
                        <TabsTrigger value="passage" className="gap-2">
                          <Feather className="h-4 w-4" /> Passage
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <button
                      onClick={() => setRhetoricalMode('input')}
                      className="text-xs text-emerald-300 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-slate-900/60 hover:bg-slate-800 transition-colors flex-shrink-0"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Change Devices
                    </button>
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-0 rounded-3xl bg-emerald-500/5 blur-3xl" />
                  <div className="relative flex flex-col gap-10">
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
                </div>
              </>
            )}

            {/* ========================================================= */}
            {/* SECTION 3: AP LANG PASSAGE STUDY MODE (GOLDEN NATIVITY)    */}
            {/* ========================================================= */}
            {isPassage && (
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-amber-500/5 blur-3xl" />
                <div className="relative">
                  <PassageStudy
                    activeRhetoricalTerms={rhetoricalTermsList}
                    activeVocabularyWords={vocabularyList}
                    onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
                  />
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="border-t border-white/10 bg-slate-950/70 px-4 py-6 text-center text-xs text-white/40">
          <p className="mb-2 tracking-[0.2em] uppercase">Powered by Pyintel • Google Gemini</p>
          <p className="mx-auto max-w-2xl text-[10px] leading-relaxed opacity-60">
            This app is created and developed by a single developer. This is a generous service provided by a high school
            student for high school students. The maintenance cost is high. Feel free to use this as needed, but please
            do not spam it.
          </p>
        </footer>
      </div>

      {/* Global Unified API Key Collection Modal with Key Pooling */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeySaved={() => setApiKeyConfigured(Boolean(getStoredAPIKey()))}
      />
    </div>
  );
}

export default App;
