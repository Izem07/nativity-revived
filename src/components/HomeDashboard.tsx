import React, { useEffect, useState } from 'react';
import { BookOpen, Layers, Feather, Scroll, ChevronRight, Flame } from 'lucide-react';

type Section = 'vocab' | 'analogy' | 'rhetoric' | 'passage';

export interface HomeDashboardProps {
  onNavigate: (section: Section) => void;
  onOpenApiKeyModal: () => void;
}

// AP English Language exam: Wednesday, May 12, 2027 at 8:00 AM Eastern (EDT, UTC-4)
const EXAM_TIME = new Date('2027-05-12T08:00:00-04:00').getTime();

function timeLeft() {
  const diff = Math.max(0, EXAM_TIME - Date.now());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
    isPassed: diff === 0
  };
}

// Full class strings per section so Tailwind can see them at build time
const SECTIONS: {
  id: Section;
  title: string;
  description: string;
  icon: React.ElementType;
  tile: string;
  hover: string;
  arrow: string;
}[] = [
  {
    id: 'vocab',
    title: 'Vocabulary',
    description: 'Turn your word list into flashcards, quizzes, matching games and a practice paragraph.',
    icon: BookOpen,
    tile: 'bg-brand-500/10 border-brand-500/25 text-brand-600 dark:text-brand-400',
    hover: 'hover:border-brand-500/50',
    arrow: 'group-hover:text-brand-500'
  },
  {
    id: 'analogy',
    title: 'Analogies',
    description: 'Find the relationship, state it as a sentence, and pick the pair that matches it exactly.',
    icon: Layers,
    tile: 'bg-violet-500/10 border-violet-500/25 text-violet-600 dark:text-violet-400',
    hover: 'hover:border-violet-500/50',
    arrow: 'group-hover:text-violet-500'
  },
  {
    id: 'rhetoric',
    title: 'Rhetorical Terms',
    description: 'Learn devices with flashcards, a sentence-guessing game and AP-style quizzes.',
    icon: Feather,
    tile: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
    hover: 'hover:border-emerald-500/50',
    arrow: 'group-hover:text-emerald-500'
  },
  {
    id: 'passage',
    title: 'Passage Study',
    description: 'Read a new nonfiction passage and answer 10 Section I style multiple-choice questions.',
    icon: Scroll,
    tile: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
    hover: 'hover:border-amber-500/50',
    arrow: 'group-hover:text-amber-500'
  }
];

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onNavigate }) => {
  const [countdown, setCountdown] = useState(timeLeft);

  useEffect(() => {
    const id = setInterval(() => setCountdown(timeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const units: [number, string][] = [
    [countdown.days, 'days'],
    [countdown.hours, 'hours'],
    [countdown.minutes, 'min'],
    [countdown.seconds, 'sec']
  ];

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8 pb-12">
      {/* Hero & countdown */}
      <section className="relative overflow-hidden rounded-[2rem] border border-rose-500/25 bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-rose-950/40 dark:via-zinc-950 dark:to-zinc-950 p-6 sm:p-10 shadow-xl">
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-rose-500/10 dark:bg-rose-600/20 blur-[100px]" />

        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[11px] font-mono font-semibold tracking-wider uppercase">
              <Flame className="h-3.5 w-3.5" /> AP English Language & Composition
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Nativity
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md leading-relaxed">
              Everything you need to prepare for the AP Lang exam: vocabulary, analogies, rhetorical terms and
              timed passage practice.
            </p>
          </div>

          <div>
            {countdown.isPassed ? (
              <p className="font-serif text-2xl font-semibold text-zinc-900 dark:text-white">Exam day has passed</p>
            ) : (
              <div className="flex gap-2">
                {units.map(([value, label]) => (
                  <div
                    key={label}
                    className="w-16 sm:w-[4.5rem] py-3 rounded-2xl bg-rose-50 dark:bg-white/[0.04] border border-rose-500/20 text-center"
                  >
                    <div className="font-mono text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
                      {String(value).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-rose-700 dark:text-rose-400 font-semibold">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 md:text-right">
              Exam: Wed, May 12, 2027 · 8:00 AM ET
            </p>
          </div>
        </div>
      </section>

      {/* Study sections */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SECTIONS.map(({ id, title, description, icon: Icon, tile, hover, arrow }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`group card-glass text-left p-6 rounded-3xl border transition-colors flex items-start gap-4 ${hover}`}
          >
            <div className={`p-3 rounded-2xl border flex-shrink-0 ${tile}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-serif text-xl font-semibold text-zinc-900 dark:text-white">{title}</h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mt-1">{description}</p>
            </div>
            <ChevronRight className={`h-5 w-5 flex-shrink-0 mt-1 text-zinc-400 transition-colors ${arrow}`} />
          </button>
        ))}
      </section>

      {/* Exam format */}
      <section>
        <h2 className="text-[11px] font-mono uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 mb-3 px-1">
          Exam format
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card-glass p-5 rounded-2xl">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Section I · Multiple Choice</h3>
              <span className="font-mono text-xs text-rose-700 dark:text-rose-400 font-semibold">45%</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5">45 questions · 1 hour · reading and writing</p>
          </div>
          <div className="card-glass p-5 rounded-2xl">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Section II · Free Response</h3>
              <span className="font-mono text-xs text-rose-700 dark:text-rose-400 font-semibold">55%</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5">
              3 essays · 2 hr 15 min · synthesis, rhetorical analysis, argument
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeDashboard;
