import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scroll,
  Sparkles,
  BookOpen,
  Compass,
  Layers,
  HelpCircle,
  PenTool,
  Copy,
  Check,
  ChevronRight,
  Flame,
  Star,
  Quote,
  Clock,
  ArrowRight,
  RotateCcw,
  BookMarked,
  CheckCircle2,
  XCircle,
  FileDown
} from 'lucide-react';
import {
  APPassageStudyPacket,
  PRELOADED_AP_PASSAGES,
  PreloadedPassage,
  generateAPPassageStudyPacket,
  getCachedPassageStudy,
  setCachedPassageStudy,
  computePassageHash,
} from '../services/passageStudyService';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';

interface PassageStudyProps {
  activeRhetoricalTerms?: string[];
  activeVocabularyWords?: string[];
  onOpenApiKeyModal?: () => void;
}

type PacketViewTab = 'soapstone' | 'structure' | 'strategies' | 'mcq' | 'essay';

export function PassageStudy({
  activeRhetoricalTerms = [],
  activeVocabularyWords = [],
  onOpenApiKeyModal,
}: PassageStudyProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('florence-kelley');
  const [customTitle, setCustomTitle] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [customText, setCustomText] = useState(PRELOADED_AP_PASSAGES[0].text);
  const [isCustomMode, setIsCustomMode] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [studyPacket, setStudyPacket] = useState<APPassageStudyPacket | null>(null);
  const [activeTab, setActiveTab] = useState<PacketViewTab>('soapstone');
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [userMcqSelections, setUserMcqSelections] = useState<Record<number, number>>({});

  // Link terms checkboxes
  const [includeRhetoricalTerms, setIncludeRhetoricalTerms] = useState(true);
  const [includeVocabulary, setIncludeVocabulary] = useState(true);

  const handleSelectPreset = (preset: PreloadedPassage) => {
    setSelectedPresetId(preset.id);
    setCustomTitle(preset.title);
    setCustomAuthor(preset.author);
    setCustomText(preset.text);
    setIsCustomMode(false);
  };

  const handleGeneratePacket = async () => {
    const textToAnalyze = customText.trim();
    if (!textToAnalyze || textToAnalyze.length < 50) {
      alert('Please provide a passage of at least 50 characters.');
      return;
    }

    const title = customTitle || (isCustomMode ? 'Custom Excerpt' : PRELOADED_AP_PASSAGES.find(p => p.id === selectedPresetId)?.title || 'AP Lang Excerpt');
    const author = customAuthor || (isCustomMode ? 'Unknown Speaker' : PRELOADED_AP_PASSAGES.find(p => p.id === selectedPresetId)?.author || 'Author');

    const hash = computePassageHash(textToAnalyze, title);
    const cached = getCachedPassageStudy(hash);
    if (cached) {
      setStudyPacket(cached);
      setUserMcqSelections({});
      return;
    }

    setIsLoading(true);
    try {
      const packet = await generateAPPassageStudyPacket({
        passageText: textToAnalyze,
        passageTitle: title,
        passageAuthor: author,
        targetRhetoricalTerms: includeRhetoricalTerms ? activeRhetoricalTerms : [],
        targetVocabulary: includeVocabulary ? activeVocabularyWords : [],
      });

      setCachedPassageStudy(hash, packet);
      setStudyPacket(packet);
      setUserMcqSelections({});
      setActiveTab('soapstone');
    } catch (err: any) {
      console.error(err);
      if (String(err?.message || err).includes('API key')) {
        onOpenApiKeyModal?.();
      } else {
        alert(err?.message || 'Failed to generate study packet. Please check your API key.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyAsMarkdown = () => {
    if (!studyPacket) return;
    const md = `# AP Lang Study Packet: ${studyPacket.title}
**Author:** ${studyPacket.author}
**Context:** ${studyPacket.historicalContext}

---

## 1. SOAPSTone Breakdown
- **Speaker:** ${studyPacket.soapstone.speaker}
- **Occasion & Exigence:** ${studyPacket.soapstone.occasion}
- **Audience:** ${studyPacket.soapstone.audience}
- **Purpose:** ${studyPacket.soapstone.purpose}
- **Subject:** ${studyPacket.soapstone.subject}
- **Tone & Shifts:** ${studyPacket.soapstone.tone}

---

## 2. Line of Reasoning & Structural Mapping
${studyPacket.structuralMapping
  .map(
    (s, i) => `### ${i + 1}. ${s.sectionTitle}
- **Summary:** ${s.summary}
- **Strategic Rhetorical Move:** ${s.rhetoricalMove}
`
  )
  .join('\n')}

---

## 3. Rhetorical Strategy Log
${studyPacket.rhetoricalStrategies
  .map(
    (st) => `### Device: ${st.term}
> "${st.quote}"
- **AP Lang Function:** ${st.functionalAnalysis}
- **Audience Impact:** ${st.effectOnAudience}
`
  )
  .join('\n')}

---

## 4. FRQ 2 Defensible Thesis Scaffold
**Model Thesis:** ${studyPacket.essayScaffold.defensibleThesis}

${studyPacket.essayScaffold.bodyParagraphIdeas
  .map(
    (b, idx) => `**Topic Sentence ${idx + 1} (${b.deviceOrChoice}):** ${b.topicSentence}
*Connection to Line of Reasoning:* ${b.lineOfReasoningConnection}`
  )
  .join('\n\n')}
`;

    navigator.clipboard.writeText(md);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2500);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Header Banner - Golden Nativity Vibe */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-amber-50 via-white to-amber-100/50 dark:from-amber-950/40 dark:via-slate-900 dark:to-amber-950/30 border border-amber-500/30 shadow-2xl shadow-amber-500/5 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-bold tracking-wider uppercase mb-1">
            <Star className="h-3.5 w-3.5 fill-amber-300" /> Nativity AP Lang Rhetoric Suite
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-900 to-amber-800 dark:from-amber-200 dark:via-yellow-100 dark:to-amber-400 font-serif tracking-tight">
            Passage Rhetorical Study & Analysis
          </h2>
          <p className="text-sm text-zinc-600 dark:text-amber-200/80 max-w-2xl leading-relaxed">
            Deconstruct iconic speeches and essays with automated <strong>SOAPSTone breakdowns</strong>, <strong>structural lines of reasoning</strong>, <strong>rhetorical device logs</strong>, and <strong>AP-style MCQs</strong>.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex-shrink-0 relative z-10">
          <Button
            onClick={handleGeneratePacket}
            disabled={isLoading}
            variant="primary"
            className="bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-extrabold px-6 py-3 shadow-lg shadow-amber-500/20 text-sm tracking-wide"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 animate-spin text-slate-950" />
                Analyzing Rigorously...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-slate-950" />
                Generate Study Packet
              </span>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Preset Passage Selector & Input Options */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Preset Speeches Carousel */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300 px-1">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <Scroll className="h-4 w-4 text-amber-400" /> Canonical AP Speeches
            </span>
            <button
              onClick={() => {
                setIsCustomMode(true);
                setCustomTitle('');
                setCustomAuthor('');
                setCustomText('');
              }}
              className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-zinc-700 dark:text-amber-200 underline"
            >
              + Paste Custom Text
            </button>
          </div>

          <div className="space-y-2.5">
            {PRELOADED_AP_PASSAGES.map((preset) => {
              const isSelected = !isCustomMode && selectedPresetId === preset.id;
              return (
                <motion.div
                  key={preset.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 dark:border-amber-400/80 shadow-md shadow-amber-500/10 ring-1 ring-amber-400/50'
                      : 'bg-white dark:bg-slate-900/80 border-zinc-200 dark:border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-200 font-serif">
                      {preset.author}
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400/70 font-mono">{preset.year}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-white truncate mb-1">{preset.title}</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Linked Study Focus Banner */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-amber-500/20 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
              <span className="flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-amber-400" /> Linked Targets
              </span>
            </div>

            <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeRhetoricalTerms}
                onChange={(e) => setIncludeRhetoricalTerms(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
              />
              <span>
                Prioritize active Rhetorical Terms ({activeRhetoricalTerms.length || 'preset'})
              </span>
            </label>

            <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeVocabulary}
                onChange={(e) => setIncludeVocabulary(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
              />
              <span>
                Integrate active Vocab in Context ({activeVocabularyWords.length || 'preset'})
              </span>
            </label>
          </div>
        </div>

        {/* Right Column: Passage Text Area */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <div className="flex items-center gap-2">
              <Quote className="h-4 w-4 text-amber-400" />
              <span className="font-bold text-zinc-900 dark:text-zinc-900 dark:text-white font-serif">
                {isCustomMode ? 'Custom AP Lang Excerpt' : customTitle || 'Selected Passage'}
              </span>
              {customAuthor && (
                <span className="text-amber-300 text-xs">by {customAuthor}</span>
              )}
            </div>
            <span className="text-[11px] font-mono">{customText.length} characters</span>
          </div>

          <div className="relative rounded-2xl border border-zinc-300 dark:border-amber-500/25 bg-white dark:bg-slate-950/70 p-4 shadow-inner">
            <textarea
              value={customText}
              onChange={(e) => {
                setCustomText(e.target.value);
                if (!isCustomMode) setIsCustomMode(true);
              }}
              placeholder="Paste any AP Lang speech, persuasive essay, or historical letter here..."
              rows={11}
              className="w-full bg-transparent text-sm sm:text-base text-zinc-900 dark:text-slate-200 placeholder-zinc-400 dark:placeholder-slate-600 focus:outline-none resize-none font-serif leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/80 border border-amber-500/30 space-y-4 shadow-xl">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-amber-400 animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white font-serif">
            Conducting AP Lang Rhetorical Analysis...
          </h3>
          <p className="text-xs text-zinc-700 dark:text-amber-200/80 max-w-md mx-auto">
            Extracting SOAPSTone coordinates, tracing line of reasoning, pinpointing schemes & tropes, and designing AP-level multiple choice questions.
          </p>
        </div>
      )}

      {/* Generated Study Packet Container */}
      {studyPacket && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 pt-4"
        >
          {/* Packet Top Bar & Tab Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-amber-500/30 shadow-xl backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400/20 to-yellow-500/20 border border-amber-400/30">
                <Scroll className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white font-serif">{studyPacket.title}</h3>
                <p className="text-xs text-amber-700 dark:text-amber-300/80">Speaker: {studyPacket.author}</p>
              </div>
            </div>

            {/* View Tabs */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-slate-950 p-1.5 rounded-xl border border-zinc-200 dark:border-white/10 flex-wrap justify-center">
              <button
                onClick={() => setActiveTab('soapstone')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'soapstone'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                SOAPSTone
              </button>
              <button
                onClick={() => setActiveTab('structure')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'structure'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Line of Reasoning
              </button>
              <button
                onClick={() => setActiveTab('strategies')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'strategies'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Strategies Log
              </button>
              <button
                onClick={() => setActiveTab('mcq')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'mcq'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                AP MCQs
              </button>
              <button
                onClick={() => setActiveTab('essay')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'essay'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                FRQ 2 Thesis
              </button>
            </div>

            {/* Copy / Export Button */}
            <Button
              onClick={copyAsMarkdown}
              variant="outline"
              size="small"
              className="border-amber-500/40 text-amber-300 hover:bg-amber-400/10 text-xs flex-shrink-0"
            >
              {copiedMarkdown ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Copied Markdown!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy Study Packet
                </>
              )}
            </Button>
          </div>

          {/* Historical Context Callout */}
          {studyPacket.historicalContext && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-500/20 text-xs text-zinc-700 dark:text-amber-200/90 leading-relaxed flex items-start gap-3">
              <Clock className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 block mb-0.5">Exigence & Historical Setting:</strong>
                {studyPacket.historicalContext}
              </div>
            </div>
          )}

          {/* Tab 1: SOAPSTone Breakdown */}
          {activeTab === 'soapstone' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <SoapstoneCard
                letter="S"
                title="Speaker"
                subtitle="Persona, Credibility & Ethos"
                content={studyPacket.soapstone.speaker}
              />
              <SoapstoneCard
                letter="O"
                title="Occasion"
                subtitle="Historical Context & Exigence"
                content={studyPacket.soapstone.occasion}
              />
              <SoapstoneCard
                letter="A"
                title="Audience"
                subtitle="Target Listeners & Expectations"
                content={studyPacket.soapstone.audience}
              />
              <SoapstoneCard
                letter="P"
                title="Purpose"
                subtitle="Primary Persuasive Aim"
                content={studyPacket.soapstone.purpose}
              />
              <SoapstoneCard
                letter="S"
                title="Subject"
                subtitle="Core Claim & Argument"
                content={studyPacket.soapstone.subject}
              />
              <SoapstoneCard
                letter="T"
                title="Tone & Shifts"
                subtitle="Emotional Attitude & Progression"
                content={studyPacket.soapstone.tone}
              />
            </div>
          )}

          {/* Tab 2: Line of Reasoning & Structural Mapping */}
          {activeTab === 'structure' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1 text-amber-300 text-sm font-bold">
                <Layers className="h-4 w-4 text-amber-400" />
                Line of Reasoning: Structural Argument Mapping
              </div>

              <div className="space-y-3">
                {studyPacket.structuralMapping.map((sec, idx) => (
                  <Card key={idx} className="p-5 bg-white dark:bg-slate-900/90 border-amber-500/25 space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white font-serif">{sec.sectionTitle}</h4>
                      </div>
                      {sec.linesOrExcerpt && (
                        <span className="text-[11px] font-mono text-amber-400/80 italic">
                          "{sec.linesOrExcerpt}"
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                          Section Summary:
                        </span>
                        <p className="text-slate-200 leading-relaxed">{sec.summary}</p>
                      </div>
                      <div className="space-y-1 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-500/20">
                        <span className="font-semibold text-amber-300 uppercase tracking-wider text-[10px]">
                          Strategic Rhetorical Move:
                        </span>
                        <p className="text-zinc-800 dark:text-amber-100 leading-relaxed">{sec.rhetoricalMove}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Rhetorical Strategy Log */}
          {activeTab === 'strategies' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-amber-300 text-sm font-bold flex items-center gap-2">
                  <Compass className="h-4 w-4 text-amber-400" />
                  Rhetorical Strategy Log ({studyPacket.rhetoricalStrategies.length} Devices Analyzed)
                </span>
                {studyPacket.targetTermsFound?.length > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-400">Target Terms Detected:</span>
                    {studyPacket.targetTermsFound.map((t) => (
                      <Badge key={t} className="bg-amber-400/20 text-amber-300 border-amber-400/30 text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studyPacket.rhetoricalStrategies.map((strat, idx) => (
                  <Card key={idx} className="p-5 bg-white dark:bg-slate-900/90 border-amber-500/25 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-gradient-to-r from-amber-400/20 to-yellow-400/20 text-amber-300 border border-amber-400/40 text-xs font-bold">
                          {strat.term}
                        </Badge>
                      </div>

                      <blockquote className="p-3 rounded-xl bg-slate-950/80 border border-white/5 text-zinc-800 dark:text-amber-100 font-serif italic text-xs sm:text-sm leading-relaxed mb-3">
                        “{strat.quote}”
                      </blockquote>

                      <div className="space-y-1.5 text-xs">
                        <p className="text-slate-300 leading-relaxed">
                          <strong className="text-amber-300 block text-[11px] mb-0.5">
                            Functional Rhetorical Analysis:
                          </strong>
                          {strat.functionalAnalysis}
                        </p>
                      </div>
                    </div>

                    {strat.effectOnAudience && (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-500/20 text-[11px] text-zinc-700 dark:text-amber-200/90">
                        <strong className="text-amber-300 block mb-0.5">Audience Psychological Impact:</strong>
                        {strat.effectOnAudience}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: AP Lang Multiple Choice Questions */}
          {activeTab === 'mcq' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1 text-amber-300 text-sm font-bold">
                <span className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-amber-400" />
                  AP Lang Section I Practice Questions
                </span>
              </div>

              <div className="space-y-4">
                {studyPacket.mcqQuestions.map((q, qIdx) => {
                  const selectedOpt = userMcqSelections[qIdx];
                  const hasAnswered = selectedOpt !== undefined;
                  const isCorrect = selectedOpt === q.correct;

                  return (
                    <Card key={qIdx} className="p-5 sm:p-6 bg-white dark:bg-slate-900/90 border-amber-500/25 space-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                          Question {qIdx + 1}
                        </span>
                        <h4 className="text-sm sm:text-base font-medium text-slate-100 font-serif leading-relaxed">
                          {q.question}
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5">
                        {q.options.map((opt, optIdx) => {
                          const isOptionSelected = selectedOpt === optIdx;
                          const isOptionCorrect = optIdx === q.correct;

                          let style =
                            'bg-slate-950/70 border-slate-800 hover:border-amber-400/50 hover:bg-slate-850 cursor-pointer';

                          if (hasAnswered) {
                            if (isOptionCorrect) {
                              style = 'bg-emerald-950/40 border-emerald-500 text-emerald-200';
                            } else if (isOptionSelected) {
                              style = 'bg-rose-950/40 border-rose-500 text-rose-200';
                            } else {
                              style = 'opacity-40 bg-slate-950 border-slate-900 cursor-default';
                            }
                          }

                          return (
                            <div
                              key={optIdx}
                              onClick={() => {
                                if (!hasAnswered) {
                                  setUserMcqSelections({ ...userMcqSelections, [qIdx]: optIdx });
                                }
                              }}
                              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs sm:text-sm transition-all ${style}`}
                            >
                              <span>{opt}</span>
                              {hasAnswered && isOptionCorrect && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-2" />
                              )}
                              {hasAnswered && isOptionSelected && !isOptionCorrect && (
                                <XCircle className="h-4 w-4 text-rose-400 ml-2" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {hasAnswered && (
                        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-500/20 text-xs text-zinc-700 dark:text-amber-200 leading-relaxed space-y-1">
                          <strong className="text-amber-300 block">AP Lang Question Rationale:</strong>
                          <p>{q.rationale}</p>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 5: FRQ 2 Defensible Thesis & Essay Outline */}
          {activeTab === 'essay' && (
            <div className="space-y-6">
              <Card className="p-6 bg-white dark:bg-slate-900/90 border-amber-500/30 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <PenTool className="h-4 w-4 text-amber-400" />
                  AP Lang Question 2: Defensible Thesis Statement Template
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-400/40 text-zinc-800 dark:text-amber-100 font-serif text-sm sm:text-base leading-relaxed italic">
                  “{studyPacket.essayScaffold.defensibleThesis}”
                </div>

                <p className="text-[11px] text-slate-400">
                  Tip: A defensible thesis must establish a clear claim, identify specific rhetorical choices, and state the author's ultimate purpose without merely summarizing the plot.
                </p>
              </Card>

              {/* Body Paragraph Outlines */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-amber-300 px-1 uppercase tracking-wider block">
                  Body Paragraph Topics & Analytical Moves
                </span>

                {studyPacket.essayScaffold.bodyParagraphIdeas.map((idea, idx) => (
                  <Card key={idx} className="p-5 bg-white dark:bg-slate-900/80 border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/30 text-xs">
                        Body Paragraph {idx + 1}: {idea.deviceOrChoice}
                      </Badge>
                    </div>

                    <div className="text-xs sm:text-sm text-slate-200 space-y-1">
                      <span className="text-slate-400 text-[11px] font-semibold block">Model Topic Sentence:</span>
                      <p className="font-serif italic text-zinc-800 dark:text-amber-100">“{idea.topicSentence}”</p>
                    </div>

                    <div className="text-xs text-slate-400 pt-1 border-t border-white/5">
                      <span className="text-amber-400/90 font-semibold">Connection to Line of Reasoning: </span>
                      {idea.lineOfReasoningConnection}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function SoapstoneCard({
  letter,
  title,
  subtitle,
  content,
}: {
  letter: string;
  title: string;
  subtitle: string;
  content: string;
}) {
  return (
    <Card className="p-5 bg-white dark:bg-slate-900/90 border-amber-500/25 space-y-3 shadow-lg hover:border-amber-400/50 transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-md shadow-amber-500/20">
            {letter}
          </span>
          <span className="text-[10px] text-amber-400/70 font-mono uppercase tracking-wider">
            SOAPSTone
          </span>
        </div>

        <h4 className="text-base font-bold text-zinc-900 dark:text-white font-serif">{title}</h4>
        <p className="text-[10px] text-amber-300/80 font-medium mb-3">{subtitle}</p>

        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
          {content || 'Analyzing text...'}
        </p>
      </div>
    </Card>
  );
}

export default PassageStudy;
