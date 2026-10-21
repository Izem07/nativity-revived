import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Layers,
  FileText,
  Sparkles,
  BookOpen,
  Feather,
  Clock,
  Compass,
  CheckCircle2,
  ChevronRight,
  Scroll,
  HelpCircle,
  ExternalLink,
  Target,
  PenTool,
  Award,
  RefreshCw,
  Database,
  Calendar,
  Laptop,
  Timer
} from 'lucide-react';

export interface HomeDashboardProps {
  onNavigate: (section: 'vocab' | 'analogy' | 'rhetoric' | 'passage') => void;
  onOpenApiKeyModal: () => void;
}

type DashboardTab = 'overview' | 'analogies' | 'passage' | 'rubrics';

interface APUnit {
  number: number;
  title: string;
  focus: 'Reading' | 'Writing';
  pillar: string;
  description: string;
  targetSkills: string[];
}

const AP_UNITS: APUnit[] = [
  {
    number: 1,
    title: 'Unit 1: Claims & Evidence',
    focus: 'Reading',
    pillar: 'Claims & Evidence',
    description: 'Identifying an author’s central claim and assessing how evidence substantiates assertions.',
    targetSkills: ['Identify thesis statement', 'Evaluate primary textual evidence', 'Distinguish fact from assertion']
  },
  {
    number: 2,
    title: 'Unit 2: Rhetorical Situation',
    focus: 'Writing',
    pillar: 'Rhetorical Situation',
    description: 'Establishing defensible thesis statements and shaping arguments for specific target audiences.',
    targetSkills: ['Construct defensible thesis', 'Audience-centered ethos', 'Synthesizing evidence']
  },
  {
    number: 3,
    title: 'Unit 3: Reasoning & Organization',
    focus: 'Reading',
    pillar: 'Reasoning & Organization',
    description: 'Tracing line of reasoning and evaluating how an author develops logical progression.',
    targetSkills: ['Trace line of reasoning', 'Identify transitions & pivots', 'Analyze deductive/inductive logic']
  },
  {
    number: 4,
    title: 'Unit 4: Reasoning & Organization',
    focus: 'Writing',
    pillar: 'Reasoning & Organization',
    description: 'Developing unified paragraphs with purposeful topic sentences and coherent commentary.',
    targetSkills: ['Paragraph synthesis', 'Line of reasoning coherence', 'Commentary-to-evidence ratio']
  },
  {
    number: 5,
    title: 'Unit 5: Writer’s Style & Syntax',
    focus: 'Reading',
    pillar: 'Writer’s Style',
    description: 'Deconstructing diction, syntax, tropes, and schemes to reveal stylistic purpose.',
    targetSkills: ['Analyze tone shifts', 'Syntactic parallelisms', 'Figurative vs. literal nuance']
  },
  {
    number: 6,
    title: 'Unit 6: Writer’s Style & Voice',
    focus: 'Writing',
    pillar: 'Writer’s Style',
    description: 'Deploying strategic rhetorical choices, syntactic variation, and precise collegiate vocabulary.',
    targetSkills: ['Intentional syntax', 'Elevated academic diction', 'Punctuation as rhetorical choice']
  },
  {
    number: 7,
    title: 'Unit 7: Complex Rhetorical Situations',
    focus: 'Reading',
    pillar: 'Rhetorical Situation',
    description: 'Examining multiple perspectives, counterarguments, qualifying claims, and concession.',
    targetSkills: ['Concession & rebuttal', 'Qualifying absolute claims', 'Analyzing historical context']
  },
  {
    number: 8,
    title: 'Unit 8: Nuanced Argumentation',
    focus: 'Writing',
    pillar: 'Claims & Evidence',
    description: 'Formulating complex, multi-faceted arguments with counter-arguments and source synthesis.',
    targetSkills: ['Counterargument integration', 'Complex claim qualification', 'Multi-source synthesis']
  },
  {
    number: 9,
    title: 'Unit 9: Comprehensive Synthesis',
    focus: 'Reading',
    pillar: 'Writer’s Style',
    description: 'Synthesizing overarching rhetorical strategies across diverse historic and modern texts.',
    targetSkills: ['Overarching strategy evaluation', 'Sophistication markers', 'Comparative analysis']
  }
];

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onNavigate,
  onOpenApiKeyModal
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [selectedUnit, setSelectedUnit] = useState<number>(1);
  const [unitFilter, setUnitFilter] = useState<'All' | 'Reading' | 'Writing'>('All');

  // Live AP Exam Countdown Timer (Wednesday, May 12, 2027 at 08:00 AM EDT)
  const [countdown, setCountdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPassed: boolean;
  }>(() => calculateTimeLeft());

  function calculateTimeLeft() {
    // Official target: May 12, 2027 08:00:00 EDT (UTC-4)
    const targetDate = new Date('2027-05-12T08:00:00-04:00').getTime();
    const now = Date.now();
    const diff = targetDate - now;

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isPassed: false };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Interactive FRQ Rubric Self-Checker State
  const [rubricEssay, setRubricEssay] = useState<'synthesis' | 'rhetorical' | 'argument'>('rhetorical');
  const [rubricThesis, setRubricThesis] = useState<number>(1);
  const [rubricEvidence, setRubricEvidence] = useState<number>(3);
  const [rubricSophistication, setRubricSophistication] = useState<number>(0);

  const totalRubricScore = rubricThesis + rubricEvidence + rubricSophistication;

  const filteredUnits = AP_UNITS.filter((u) => {
    if (unitFilter === 'All') return true;
    return u.focus === unitFilter;
  });

  const currentUnit = AP_UNITS.find((u) => u.number === selectedUnit) || AP_UNITS[0];

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8 pb-12">
      {/* ========================================================================= */}
      {/* RED HERO BANNER & CUSTOMIZATION BAR                                        */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-rose-500/30 bg-gradient-to-br from-rose-950/40 via-zinc-950/90 to-zinc-950 p-6 sm:p-10 shadow-2xl">
        {/* Atmospheric Ambient Red Flares */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-rose-600/20 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-red-600/15 blur-[100px]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-400 text-xs font-mono font-semibold tracking-wider uppercase">
              <Flame className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
              <span>AP Lang Academic Engine • Command Center</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
              Nativity <span className="text-rose-500 font-normal">Command</span>
            </h1>
            <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
              Customizable mastery headquarters for the official College Board AP English Language & Composition exam.
            </p>
          </div>

          {/* Quick Stats / Official College Board Exam Schedule Pills & Live Countdown */}
          <div className="flex items-center gap-3 self-start md:self-center flex-wrap">
            {/* Live Exam Countdown Card */}
            <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-950/40 text-rose-300 flex items-center gap-3 shadow-md shadow-rose-950/30">
              <Timer className="h-5 w-5 text-rose-400 shrink-0 animate-pulse" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 block font-semibold flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
                  Live Exam Countdown
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-white tracking-tight">
                  {countdown.isPassed ? (
                    'Exam Completed!'
                  ) : (
                    <>
                      <span className="text-rose-400">{countdown.days}</span>d{' '}
                      <span className="text-zinc-200">{countdown.hours}</span>h{' '}
                      <span className="text-zinc-200">{countdown.minutes}</span>m{' '}
                      <span className="text-zinc-400 text-[11px]">{countdown.seconds}s</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border border-rose-500/20 bg-rose-950/30 text-rose-300 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-rose-400 shrink-0" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block font-semibold">
                  Exam Date & Time
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-white">
                  Wed, May 12, 2027 • 8:00 AM (EST)
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border border-sky-500/20 bg-sky-950/30 text-sky-300 flex items-center gap-3">
              <Laptop className="h-5 w-5 text-sky-400 shrink-0" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block font-semibold">
                  Session & Format
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-white">
                  Session 1 • Bluebook App
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-zinc-900/60 text-zinc-300 flex items-center gap-3">
              <Clock className="h-5 w-5 text-zinc-400 shrink-0" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block font-semibold">
                  Total Duration
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-white">3h 15m Total</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky-Style Quick View Tabs Bar */}
        <div className="mt-8 pt-6 border-t border-rose-500/20 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Overview & Blueprint</span>
          </button>

          <button
            onClick={() => setActiveTab('analogies')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'analogies'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Red Analogies Engine</span>
          </button>

          <button
            onClick={() => setActiveTab('passage')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'passage'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Passage Study & SOAPSTone</span>
          </button>

          <button
            onClick={() => setActiveTab('rubrics')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'rubrics'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
            }`}
          >
            <PenTool className="h-3.5 w-3.5" />
            <span>FRQ Rubrics (6-Point Scale)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB CONTENT 1: OVERVIEW & EXAM BLUEPRINT                                  */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Widget 1: Exam Snapshot & Blueprint (MCQ 45 / FRQ 3) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Multiple Choice Section (45%) */}
            <div className="card-glass p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-white/[0.08] relative overflow-hidden group hover:border-rose-500/40 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-rose-500 dark:text-rose-400 font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                  Section I • 45% of Total Score
                </span>
                <span className="font-mono text-xs text-zinc-500">60 Minutes</span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                Multiple Choice (MCQ)
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
                45 questions total with 4 answer choices (A, B, C, D) delivered digitally via the Bluebook app (administered in Session 1, 8:00 AM local time).
              </p>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/[0.06] flex items-center justify-between">
                  <span className="text-zinc-700 dark:text-zinc-300">Reading Passages (22–25 Qs)</span>
                  <span className="text-rose-600 dark:text-rose-400 font-bold">Analysis Focus</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/[0.06] flex items-center justify-between">
                  <span className="text-zinc-700 dark:text-zinc-300">Writing Passages (20–22 Qs)</span>
                  <span className="text-sky-600 dark:text-sky-400 font-bold">Revision Focus</span>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-zinc-200 dark:border-white/[0.08] flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">Includes Rhetorical Devices & Line of Reasoning</span>
                <button
                  onClick={() => onNavigate('passage')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                >
                  <span>Practice Passages</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Free Response Section (55%) */}
            <div className="card-glass p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-white/[0.08] relative overflow-hidden group hover:border-rose-500/40 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500 font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  Section II • 55% of Total Score
                </span>
                <span className="font-mono text-xs text-zinc-500">2 Hours 15 Minutes</span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                Free-Response Questions (FRQ)
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
                3 distinct analytical essay challenges evaluated on the 6-point analytic scale (15m reading period + 40m per essay).
              </p>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/[0.06] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-zinc-900 dark:text-white block">Q1: Synthesis Essay</span>
                    <span className="text-[11px] text-zinc-500 font-mono">Synthesize ≥3 provided sources into an argument</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-500">0–6 Pts</span>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/[0.06] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-zinc-900 dark:text-white block">Q2: Rhetorical Analysis</span>
                    <span className="text-[11px] text-zinc-500 font-mono">Analyze author’s rhetorical choices & purpose</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-rose-500">0–6 Pts</span>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/[0.06] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-zinc-900 dark:text-white block">Q3: Argument Essay</span>
                    <span className="text-[11px] text-zinc-500 font-mono">Create an evidence-based position on a prompt</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-500">0–6 Pts</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-white/[0.08] flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">Scored on: Thesis (1), Evidence (4), Sophistication (1)</span>
                <button
                  onClick={() => setActiveTab('rubrics')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                >
                  <span>Test Rubric Checker</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Widget 2: Unit & Skill Navigator (Units 1–9) */}
          <div className="card-glass p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-white/[0.08]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-bold block mb-1">
                  Curriculum Mapping
                </span>
                <h3 className="font-serif text-2xl font-bold text-zinc-900 dark:text-white">
                  AP Lang Units & Skills Navigator
                </h3>
              </div>

              {/* Filter Buttons */}
              <div className="p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-white/[0.08] inline-flex gap-1 self-start">
                {(['All', 'Reading', 'Writing'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setUnitFilter(mode)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      unitFilter === mode
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    {mode} {mode !== 'All' ? 'Units' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Units Pill Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-9 gap-2 mb-6">
              {filteredUnits.map((u) => {
                const isSelected = selectedUnit === u.number;
                return (
                  <button
                    key={u.number}
                    onClick={() => setSelectedUnit(u.number)}
                    className={`p-3 rounded-2xl border text-center transition-all duration-200 ${
                      isSelected
                        ? 'border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/30 shadow-sm'
                        : 'border-zinc-200 dark:border-white/[0.06] bg-zinc-50 dark:bg-white/[0.02] text-zinc-700 dark:text-zinc-300 hover:border-rose-500/40'
                    }`}
                  >
                    <span className="font-mono text-xs font-bold block">U{u.number}</span>
                    <span className="text-[10px] uppercase tracking-wider block font-medium opacity-70">
                      {u.focus}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Unit Deep-Dive Box */}
            <div className="p-5 sm:p-6 rounded-2xl bg-zinc-100/70 dark:bg-zinc-950/70 border border-zinc-200 dark:border-white/[0.08] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 font-bold">
                      {currentUnit.focus} Focus • {currentUnit.pillar}
                    </span>
                  </div>
                  <h4 className="font-serif text-lg font-bold text-zinc-900 dark:text-white">
                    {currentUnit.title}
                  </h4>
                </div>
                <button
                  onClick={() => onNavigate('rhetoric')}
                  className="self-start sm:self-auto px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold tracking-tight hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Drill Terms for Unit
                </button>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {currentUnit.description}
              </p>

              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-bold block mb-2">
                  Target Course Competencies:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {currentUnit.targetSkills.map((skill, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.06] text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                      <span>{skill}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Widget 3: Dynamic Tool Switcher (3 Core Engines) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Module A */}
            <div className="card-glass p-6 rounded-3xl border border-rose-500/20 hover:border-rose-500/50 transition-all flex flex-col justify-between group">
              <div>
                <div className="h-10 w-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mb-4">
                  <Layers className="h-5 w-5" />
                </div>
                <h4 className="font-serif text-lg font-bold text-zinc-900 dark:text-white mb-2">
                  Red Analogies Engine
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                  Tests nuanced word relationships, secondary definitions, and syntactic parallels across 4 difficulty tiers.
                </p>
              </div>
              <button
                onClick={() => onNavigate('analogy')}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold tracking-wide transition-all shadow-sm"
              >
                Launch Analogies
              </button>
            </div>

            {/* Module B */}
            <div className="card-glass p-6 rounded-3xl border border-amber-500/20 hover:border-amber-500/50 transition-all flex flex-col justify-between group">
              <div>
                <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mb-4">
                  <Scroll className="h-5 w-5" />
                </div>
                <h4 className="font-serif text-lg font-bold text-zinc-900 dark:text-white mb-2">
                  Passage Study & SOAPSTone
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                  Generates rigorous AP MCQs, line-of-reasoning breakdowns, and rhetorical strategy trackers for canonical texts.
                </p>
              </div>
              <button
                onClick={() => onNavigate('passage')}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold tracking-wide transition-all shadow-sm"
              >
                Launch Passage Study
              </button>
            </div>

            {/* Module C */}
            <div className="card-glass p-6 rounded-3xl border border-emerald-500/20 hover:border-emerald-500/50 transition-all flex flex-col justify-between group">
              <div>
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mb-4">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h4 className="font-serif text-lg font-bold text-zinc-900 dark:text-white mb-2">
                  Vocabulary & Rhetorical Tools
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                  Interactive flashcards, contextual synthesis paragraph editor, matching games, and Teacher PPT rhetorical unit tests.
                </p>
              </div>
              <button
                onClick={() => onNavigate('vocab')}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold tracking-wide transition-all shadow-sm"
              >
                Launch Vocabulary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 2: RED ANALOGIES QUICK LAUNCH & STATS                         */}
      {/* ========================================================================= */}
      {activeTab === 'analogies' && (
        <div className="card-glass p-6 sm:p-10 rounded-3xl border border-rose-500/30 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-rose-500 font-bold block mb-1">
                Relational Vocabulary Engine
              </span>
              <h3 className="font-serif text-3xl font-bold text-zinc-900 dark:text-white">
                Red Analogy Suite
              </h3>
            </div>
            <button
              onClick={() => onNavigate('analogy')}
              className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs tracking-wider uppercase shadow-lg shadow-rose-600/20 transition-all"
            >
              Open Active Quiz
            </button>
          </div>

          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-2xl">
            Analogies test subtle gradations of intensity, functional purpose, and syntactic parallels essential for AP Lang MCQs.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/[0.06]">
              <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Mode 1</span>
              <h5 className="font-bold text-zinc-900 dark:text-white text-sm">Easy Tier</h5>
              <p className="text-[11px] text-zinc-500 mt-1">Foundational high school vocabulary relationships.</p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/[0.06]">
              <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Mode 2</span>
              <h5 className="font-bold text-zinc-900 dark:text-white text-sm">Standard Tier</h5>
              <p className="text-[11px] text-zinc-500 mt-1">Core AP Lang collegiate relational reasoning.</p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/[0.06]">
              <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Mode 3</span>
              <h5 className="font-bold text-zinc-900 dark:text-white text-sm">Challenging Tier</h5>
              <p className="text-[11px] text-zinc-500 mt-1">Subtle distractor traps and intensity gradations.</p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/[0.06]">
              <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Mode 4</span>
              <h5 className="font-bold text-zinc-900 dark:text-white text-sm">Advanced Tier</h5>
              <p className="text-[11px] text-zinc-500 mt-1">Secondary definitions and complex rhetorical parallels.</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 3: PASSAGE STUDY & SOAPSTONE                                   */}
      {/* ========================================================================= */}
      {activeTab === 'passage' && (
        <div className="card-glass p-6 sm:p-10 rounded-3xl border border-amber-500/30 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500 font-bold block mb-1">
                Rhetorical Analysis & Textual Diagnostics
              </span>
              <h3 className="font-serif text-3xl font-bold text-zinc-900 dark:text-white">
                Passage Study & SOAPSTone
              </h3>
            </div>
            <button
              onClick={() => onNavigate('passage')}
              className="px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs tracking-wider uppercase shadow-lg shadow-amber-600/20 transition-all"
            >
              Open Passage Generator
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            {[
              { letter: 'S', title: 'Speaker', desc: 'Voice, ethos, and persona' },
              { letter: 'O', title: 'Occasion', desc: 'Exigence and historical moment' },
              { letter: 'A', title: 'Audience', desc: 'Target demographics and expectations' },
              { letter: 'P', title: 'Purpose', desc: 'Action or perception shift sought' },
              { letter: 'S', title: 'Subject', desc: 'Core topic and nuanced claims' },
              { letter: 'Tone', title: 'Tone', desc: 'Diction, syntax, and attitude' }
            ].map((item) => (
              <div key={item.title} className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/[0.06] text-center">
                <span className="font-mono text-base font-bold text-amber-500 block">{item.letter}</span>
                <span className="text-xs font-semibold text-zinc-900 dark:text-white block mt-0.5">{item.title}</span>
                <span className="text-[10px] text-zinc-500 block mt-1">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 4: FRQ RUBRIC SELF-CHECKER                                    */}
      {/* ========================================================================= */}
      {activeTab === 'rubrics' && (
        <div className="card-glass p-6 sm:p-10 rounded-3xl border border-rose-500/30 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-rose-500 font-bold block mb-1">
                Official College Board Scoring
              </span>
              <h3 className="font-serif text-3xl font-bold text-zinc-900 dark:text-white">
                FRQ 6-Point Analytic Rubric Self-Checker
              </h3>
            </div>

            {/* Total Rubric Score Display */}
            <div className="px-5 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3">
              <Award className="h-6 w-6 text-rose-500" />
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-400 block font-semibold">Total Score</span>
                <span className="font-mono text-2xl font-bold text-rose-500">{totalRubricScore} / 6</span>
              </div>
            </div>
          </div>

          {/* Essay Selector */}
          <div className="p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-white/[0.08] inline-flex gap-1">
            {[
              { id: 'synthesis', label: 'Q1: Synthesis Essay' },
              { id: 'rhetorical', label: 'Q2: Rhetorical Analysis' },
              { id: 'argument', label: 'Q3: Argument Essay' }
            ].map((essay) => (
              <button
                key={essay.id}
                onClick={() => setRubricEssay(essay.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  rubricEssay === essay.id
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {essay.label}
              </button>
            ))}
          </div>

          {/* Interactive 3 Rubric Rows */}
          <div className="space-y-6">
            {/* ROW A: THESIS (0–1 Pt) */}
            <div className="p-5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-950/70 border border-zinc-200 dark:border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif font-bold text-zinc-900 dark:text-white text-base">
                    Row A: Thesis (0–1 Point)
                  </h4>
                  <p className="text-xs text-zinc-500">
                    Responds to prompt with a defensible thesis analyzing the author's rhetorical choices or argument position.
                  </p>
                </div>
                <span className="font-mono text-sm font-bold text-rose-500">{rubricThesis} pt</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setRubricThesis(0)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    rubricThesis === 0
                      ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                      : 'border-zinc-200 dark:border-white/[0.06] text-zinc-500 hover:border-zinc-400'
                  }`}
                >
                  <span className="font-bold text-xs block">0 Points</span>
                  <span className="text-[11px] block mt-0.5">Restates prompt, summarizes without claim, or lacks defensibility.</span>
                </button>
                <button
                  onClick={() => setRubricThesis(1)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    rubricThesis === 1
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                      : 'border-zinc-200 dark:border-white/[0.06] text-zinc-500 hover:border-zinc-400'
                  }`}
                >
                  <span className="font-bold text-xs block">1 Point (Earned)</span>
                  <span className="text-[11px] block mt-0.5">Presents a defensible thesis establishing clear analytical direction.</span>
                </button>
              </div>
            </div>

            {/* ROW B: EVIDENCE & COMMENTARY (0–4 Pts) */}
            <div className="p-5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-950/70 border border-zinc-200 dark:border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif font-bold text-zinc-900 dark:text-white text-base">
                    Row B: Evidence & Commentary (0–4 Points)
                  </h4>
                  <p className="text-xs text-zinc-500">
                    Provides specific evidence and articulates a sustained line of reasoning explaining how evidence supports the thesis.
                  </p>
                </div>
                <span className="font-mono text-sm font-bold text-rose-500">{rubricEvidence} pts</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                {[
                  { pts: 0, label: '0 Pts', desc: 'Merely restates or unrelated.' },
                  { pts: 1, label: '1 Pt', desc: 'General or inaccurate references.' },
                  { pts: 2, label: '2 Pts', desc: 'Some evidence with superficial commentary.' },
                  { pts: 3, label: '3 Pts', desc: 'Specific evidence with coherent commentary.' },
                  { pts: 4, label: '4 Pts (Top)', desc: 'Full line of reasoning and comprehensive synthesis.' }
                ].map((tier) => (
                  <button
                    key={tier.pts}
                    onClick={() => setRubricEvidence(tier.pts)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      rubricEvidence === tier.pts
                        ? 'border-rose-500 bg-rose-500/15 text-rose-400 font-semibold ring-1 ring-rose-500/30'
                        : 'border-zinc-200 dark:border-white/[0.06] text-zinc-500 hover:border-zinc-400'
                    }`}
                  >
                    <span className="font-bold text-xs block">{tier.label}</span>
                    <span className="text-[10px] block mt-0.5 leading-tight">{tier.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ROW C: SOPHISTICATION (0–1 Pt) */}
            <div className="p-5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-950/70 border border-zinc-200 dark:border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif font-bold text-zinc-900 dark:text-white text-base">
                    Row C: Sophistication (0–1 Point)
                  </h4>
                  <p className="text-xs text-zinc-500">
                    Demonstrates complex understanding, nuance, vivid persuasive style, or situates the analysis within broader context.
                  </p>
                </div>
                <span className="font-mono text-sm font-bold text-rose-500">{rubricSophistication} pt</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setRubricSophistication(0)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    rubricSophistication === 0
                      ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                      : 'border-zinc-200 dark:border-white/[0.06] text-zinc-500 hover:border-zinc-400'
                  }`}
                >
                  <span className="font-bold text-xs block">0 Points</span>
                  <span className="text-[11px] block mt-0.5">Formulaic or lacks nuanced exploration of rhetorical tensions.</span>
                </button>
                <button
                  onClick={() => setRubricSophistication(1)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    rubricSophistication === 1
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                      : 'border-zinc-200 dark:border-white/[0.06] text-zinc-500 hover:border-zinc-400'
                  }`}
                >
                  <span className="font-bold text-xs block">1 Point (Earned)</span>
                  <span className="text-[11px] block mt-0.5">Sustained nuanced voice, complex rhetorical situation, or concession.</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeDashboard;
