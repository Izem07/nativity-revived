# Implementation Plan: Rhetorical Terms Study Section

## Codebase Notes (discovered during exploration)

- **Build command**: `npm run build` (Vite/rolldown-vite, no tests)
- **TypeScript**: strict mode, `moduleResolution: Bundler`, `noEmit: true`
- **UI pattern**: Mix of MUI components (`@mui/material`) and custom Tailwind classes from `src/components/ui/`. New components use both — MUI for structured elements, Tailwind utility classes for layout/color.
- **Dark theme base**: Tailwind `bg-slate-950`, `dark:bg-slate-900/70`, white/10 borders. MUI ThemeProvider wraps the app.
- **Animation**: `framer-motion` with `AnimatePresence` + `motion.div`.
- **Tabs**: Custom wrapper `src/components/ui/Tabs.tsx` wraps `@mui/material/Tabs` with MUI `TabsList`/`TabsTrigger`. Used in `App.tsx` and `ParagraphPractice.tsx`.
- **`extractAndParseJson`**: private function inside `geminiService.ts`. The coder will need to call it from within the same file (not exported). `generateRhetoricalContent` must be added to that same file.
- **`ParagraphData`** is already exported from `geminiService.ts` via the import in `geminiService.ts` itself — it comes from `ParagraphPractice.tsx`. The new `RhetoricalGenerationResult.paragraph` field reuses this same type.
- **`ToggleButtonGroup`**: MUI 7 ships `ToggleButtonGroup` at `@mui/material/ToggleButtonGroup` and `ToggleButton` at `@mui/material/ToggleButton`. No new packages needed.
- **`cacheService.ts`**: uses localStorage, LRU eviction with `MAX_CACHE_ENTRIES = 5`. The rhetoric cache uses its own prefix (`rhetoric_cache_`) and key list (`rhetoric_cache_keys`) but shares the same constant conceptually (the task spec says "shared" — implement as the same numeric value `5`, not a shared import, since the existing const is `const` not `export const`).

---

## Implementation Plan

- [ ] 1. Remove the yellow warning Alert from `VocabInput.tsx`.
      Delete the entire `<Alert severity="warning" ...>...</Alert>` block (the "A New Chapter Begins! We're Moving!" block). It spans from the `<Alert severity="warning"` opening tag through its closing `</Alert>`. Keep the `<Alert severity="info">` ("Created by a high school student") and all other content.
      Files: `src/components/VocabInput.tsx`
      Verify: `npm run build` — exits 0, no type errors.

- [ ] 2. Add `RhetoricalFlashcard`, `RhetoricalQuizQuestion`, `SentenceMatchItem`, and `RhetoricalGenerationResult` interfaces, plus the `generateRhetoricalContent` function, to `geminiService.ts`.
      The four interfaces are exported. `generateRhetoricalContent(terms: string[]): Promise<RhetoricalGenerationResult>` makes 4 sequential `model.generateContent` calls using model `gemini-3.5-flash-lite` and the existing (private) `extractAndParseJson` helper:
      1. **Flashcards prompt**: generate for each term: `definition`, `example` (sentence using the device), `effect` (rhetorical effect), `mnemonic`. Expected JSON: `{"flashcards":[{"term","definition","example","effect","mnemonic"}]}`. Map to `RhetoricalFlashcard[]`.
      2. **Quiz prompt**: 10 questions each showing a sentence and asking which rhetorical device it exemplifies, 4 answer options. Expected JSON: `{"questions":[{"question","options","correct","term"}]}`. Map to `RhetoricalQuizQuestion[]`.
      3. **SentenceMatch prompt**: one exemplar sentence per term plus explanation. Expected JSON: `{"items":[{"term","sentence","explanation"}]}`. Map to `SentenceMatchItem[]`.
      4. **Paragraph prompt**: 150–200 word paragraph using all terms with each **bolded**, plus comprehension questions. Expected JSON: `{"paragraph","questions":[{"question","answer"}]}`. Map to `ParagraphData`.
      Combine into `RhetoricalGenerationResult` and return. Wrap in try/catch like `generateQuizContent`.
      `ParagraphData` is already imported at the top of `geminiService.ts` from `'../components/ParagraphPractice'` — reuse that import.
      Files: `src/services/geminiService.ts`
      Verify: `npm run build` — exits 0.

- [ ] 3. Add rhetorical cache functions to `cacheService.ts`.
      Add two new exports using prefix `rhetoric_cache_` and key list key `rhetoric_cache_keys`:
      ```ts
      const RHETORIC_CACHE_PREFIX = 'rhetoric_cache_';
      const RHETORIC_CACHE_KEYS_KEY = 'rhetoric_cache_keys';

      export function getCachedRhetoricalResult(terms: string[]): RhetoricalGenerationResult | null { … }
      export function setCachedRhetoricalResult(terms: string[], result: RhetoricalGenerationResult): void { … }
      ```
      Both functions follow the exact same logic as `getCachedResult`/`setCachedResult` (same `getCacheKey` helper, same LRU eviction with limit `5`). Import `RhetoricalGenerationResult` from `'./geminiService'`. Do not change any existing code.
      Files: `src/services/cacheService.ts`
      Verify: `npm run build` — exits 0.

- [ ] 4. Create `src/components/RhetoricalFlashcards.tsx`.
      Read `src/components/Flashcards.tsx` as the pattern. Props: `{ flashcards: RhetoricalFlashcard[] }`. Flip-card design matching `Flashcards.tsx` layout:
      - Front: label "Rhetorical Device" (instead of "Word"), term in large serif font, "Tap to reveal" hint.
      - Back: four labeled sections — **Definition**, **Example** (the example sentence), **Effect** (rhetorical effect), **Memory Trick** (mnemonic, styled the same amber box as in `Flashcards.tsx`).
      - Include Previous/Reset/Next navigation buttons identical to `Flashcards.tsx`.
      - Include shuffle/reset-order toggle.
      - Include progress bar and card counter.
      - Use `AnimatePresence` + `motion.div` with `cardVariants` (same animation values as `Flashcards.tsx`).
      - Use same `[perspective:1200px]` container, `h-[520px]`, `rounded-3xl` card styles.
      - No confidence ratings or filter system needed (simplify vs `Flashcards.tsx`).
      - Use `RhetoricalFlashcard` type imported from `'../services/geminiService'`.
      Files: `src/components/RhetoricalFlashcards.tsx`
      Verify: `npm run build` — exits 0.

- [ ] 5. Create `src/components/RhetoricalQuiz.tsx`.
      Read `src/components/Quiz.tsx` as the pattern. Props: `{ questions: RhetoricalQuizQuestion[], rhetoricalTerms: string[] }`. Differences from `Quiz.tsx`:
      - Badge label: "Rhetorical Analysis Mode" (instead of "Adaptive Quiz Mode").
      - Header: "Identify the Device" (instead of "Check your mastery").
      - Sub-label on card: "Rhetorical Device" (instead of "Vocabulary").
      - The `word` field on `RhetoricalQuizQuestion` is named `term` — use `currentQuestion.term` for display.
      - Remove the "Generate More Questions" panel (no `generateMoreQuizQuestions` call for rhetoric).
      - All other logic (progress bar, option selection, feedback, results screen, restart) is identical to `Quiz.tsx`.
      - Import `RhetoricalQuizQuestion` from `'../services/geminiService'`.
      Files: `src/components/RhetoricalQuiz.tsx`
      Verify: `npm run build` — exits 0.

- [ ] 6. Create `src/components/SentenceMatch.tsx`.
      New component. Props: `{ items: SentenceMatchItem[] }`. Click-to-select matching game — no drag-and-drop:
      - On mount, shuffle both terms and sentences independently (so they appear in different orders).
      - **Layout**: two-column MUI `Grid` (or `Box` with CSS grid). Left column: term chips. Right column: sentence cards.
      - **Interaction**: clicking a term highlights it (selected state). Clicking a sentence while a term is selected attempts the pair.
        - Correct pair: both turn green (`emerald-400/20` bg, `emerald-400/60` border), lock (non-clickable). Use `framer-motion` scale-up animation on lock.
        - Wrong pair: both flash red (`rose-400/20` bg) for 600ms via `useState` timeout, then reset selection (not locked).
      - **Progress**: `Typography` showing "X / total matched" above the columns.
      - **Completion**: when `matched.size === items.length`, show a `Paper` success banner with score and a "Play Again" button that reshuffles. Below the banner, reveal all explanations (the `explanation` field from each `SentenceMatchItem`) as an accordion or flat list labeled "Explanations".
      - Use MUI `Paper`, `Chip`, `Typography`, `Box`, `Grid` from `@mui/material`. Use `framer-motion` `motion.div` + `AnimatePresence` for enter/exit animations on each chip/card.
      - Dark theme: `Paper` with `elevation={3}`, `sx={{ bgcolor: 'background.paper' }}`. Locked-correct items: `sx={{ bgcolor: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)' }}`.
      - Import `SentenceMatchItem` from `'../services/geminiService'`.
      Files: `src/components/SentenceMatch.tsx`
      Verify: `npm run build` — exits 0.

- [ ] 7. Create `src/components/RhetoricalInput.tsx`.
      Read `src/components/VocabInput.tsx` as the pattern and replicate its structure almost exactly. Key differences:
      - Title: "Enter Your Rhetorical Terms"
      - Description: "Add **3–50 rhetorical devices** and we'll craft **flashcards, quizzes, sentence matching**, and *paragraph practice* tailored to your study goals."
      - One preset list only (replace the `PRE_FILLED_LISTS` constant):
        ```ts
        const PRE_FILLED_LISTS = [
          {
            label: 'Common AP Lang Devices (15 Terms)',
            words: ['Anaphora','Chiasmus','Ethos','Pathos','Logos','Alliteration','Assonance','Hyperbole','Irony','Juxtaposition','Metaphor','Parallelism','Personification','Rhetorical Question','Synecdoche'],
          },
        ] as const;
        ```
      - Remove both Alert banners (the yellow warning AND the blue "Created by a high school student" info Alert). Keep only the word count info.
      - `onGenerate` callback type: `(result: RhetoricalGenerationResult, terms: string[]) => void`
      - `onLoadingChange` callback type: `(loading: boolean) => void`
      - On generate: call `generateRhetoricalContent(normalized)` (from `geminiService`) and `setCachedRhetoricalResult` / `getCachedRhetoricalResult` (from `cacheService`).
      - Keep the "Check & Load Cached" + "Generate Study Materials" buttons with confirm dialogs (same logic as `VocabInput.tsx`).
      - Keep the paragraph input mode toggle, the API key panel, the Privacy/Tips paper at the bottom, the footer caption — everything else from `VocabInput.tsx` structurally carries over.
      - Min words: 3. Max: 50. Same validation messages.
      - Import `RhetoricalGenerationResult`, `generateRhetoricalContent` from `'../services/geminiService'`.
      - Import `getCachedRhetoricalResult`, `setCachedRhetoricalResult` from `'../services/cacheService'`.
      Files: `src/components/RhetoricalInput.tsx`
      Verify: `npm run build` — exits 0.

- [ ] 8. Update `src/App.tsx` to add the section switcher and the rhetoric section.
      Read the full current `App.tsx` before editing. Changes:
      1. **New imports**:
         - `ToggleButtonGroup` from `'@mui/material/ToggleButtonGroup'`
         - `ToggleButton` from `'@mui/material/ToggleButton'`
         - `RhetoricalInput` from `'./components/RhetoricalInput'`
         - `RhetoricalFlashcards` from `'./components/RhetoricalFlashcards'`
         - `RhetoricalQuiz` from `'./components/RhetoricalQuiz'`
         - `SentenceMatch` from `'./components/SentenceMatch'`
         - `{ RhetoricalGenerationResult }` from `'./services/geminiService'`
         - `{ Layers }` from `'lucide-react'` (or any suitable icon already installed)
      2. **New state**:
         ```ts
         const [section, setSection] = useState<'vocab' | 'rhetoric'>('vocab');
         const [rhetoricalData, setRhetoricalData] = useState<RhetoricalGenerationResult | null>(null);
         const [rhetoricalTerms, setRhetoricalTerms] = useState<string[]>([]);
         const [rhetoricalMode, setRhetoricalMode] = useState<'r-flashcards' | 'r-quiz' | 'r-sentencematch' | 'r-paragraph'>('r-flashcards');
         ```
      3. **Handler**:
         ```ts
         const handleRhetoricalGenerated = (data: RhetoricalGenerationResult, terms: string[]) => {
           setRhetoricalData(data);
           setRhetoricalTerms(terms);
           setRhetoricalMode('r-flashcards');
           setIsLoading(false);
         };
         ```
      4. **Section switcher** — place it just below the `<div className="pointer-events-none absolute inset-0">` background decorations block and above the `<main>` tag (or at the very top of `<main>` before the loading overlay), centered:
         ```tsx
         <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0 0' }}>
           <ToggleButtonGroup
             value={section}
             exclusive
             onChange={(_, val) => { if (val) setSection(val); }}
             sx={{
               bgcolor: 'rgba(255,255,255,0.05)',
               borderRadius: 99,
               border: '1px solid rgba(255,255,255,0.1)',
               '& .MuiToggleButton-root': {
                 color: 'rgba(255,255,255,0.6)',
                 border: 'none',
                 borderRadius: '99px !important',
                 px: 3, py: 0.75,
                 fontWeight: 600,
                 textTransform: 'none',
               },
               '& .Mui-selected': {
                 bgcolor: 'primary.main !important',
                 color: '#fff !important',
               },
             }}
           >
             <ToggleButton value="vocab">Vocabulary</ToggleButton>
             <ToggleButton value="rhetoric">Rhetorical Terms</ToggleButton>
           </ToggleButtonGroup>
         </div>
         ```
      5. **Vocab section** (unchanged): wrap existing `{mode === 'input' && ...}`, `{mode === 'flashcards' && ...}` etc. in `{section === 'vocab' && ( … )}`.
      6. **Rhetoric section**: when `section === 'rhetoric'`:
         - If `!rhetoricalData`: render `<RhetoricalInput onGenerate={handleRhetoricalGenerated} onLoadingChange={setIsLoading} />`
         - If `rhetoricalData`: render the rhetoric tabs (`Flashcards | Quiz | Sentence Match | Paragraph`) then the active panel.
         The tabs use the same `<Tabs>` / `<TabsList>` / `<TabsTrigger>` wrapper from `'./components/ui/Tabs'`:
         ```tsx
         <Tabs className="w-full max-w-3xl mx-auto">
           <TabsList
             value={rhetoricalMode}
             onChange={(_: any, val: any) => setRhetoricalMode(val)}
             className="grid w-full grid-cols-4"
           >
             <TabsTrigger value="r-flashcards" className="gap-2"><BookOpen className="h-4 w-4" /> Flashcards</TabsTrigger>
             <TabsTrigger value="r-quiz" className="gap-2"><Brain className="h-4 w-4" /> Quiz</TabsTrigger>
             <TabsTrigger value="r-sentencematch" className="gap-2"><Grid3X3 className="h-4 w-4" /> Sentence Match</TabsTrigger>
             <TabsTrigger value="r-paragraph" className="gap-2"><FileText className="h-4 w-4" /> Paragraph</TabsTrigger>
           </TabsList>
         </Tabs>
         {rhetoricalMode === 'r-flashcards' && <RhetoricalFlashcards flashcards={rhetoricalData.flashcards} />}
         {rhetoricalMode === 'r-quiz' && <RhetoricalQuiz questions={rhetoricalData.quiz} rhetoricalTerms={rhetoricalTerms} />}
         {rhetoricalMode === 'r-sentencematch' && <SentenceMatch items={rhetoricalData.sentenceMatch} />}
         {rhetoricalMode === 'r-paragraph' && <ParagraphPractice paragraphData={rhetoricalData.paragraph} vocabularyWords={rhetoricalTerms} />}
         ```
      Files: `src/App.tsx`
      Verify: `npm run build` — exits 0.

- [ ] 9. Build verification and git push.
      Run `npm run build` in the workspace root. Fix any remaining TypeScript errors (common pitfalls: `RhetoricalQuizQuestion.term` vs `.word`, `SentenceMatchItem` import not re-exported, `ToggleButtonGroup` import path). Once build exits 0:
      ```
      git add src/components/VocabInput.tsx src/services/geminiService.ts src/services/cacheService.ts src/components/RhetoricalFlashcards.tsx src/components/RhetoricalQuiz.tsx src/components/SentenceMatch.tsx src/components/RhetoricalInput.tsx src/App.tsx
      git commit -m "feat: add rhetorical terms study section with sentence matching, remove migration banner"
      git push origin main
      ```
      Files: (none new; build output only)
      Verify: `git push` exits 0, build artifacts clean.

---

## Known edge cases / assumptions

- `extractAndParseJson` is a private function in `geminiService.ts` — `generateRhetoricalContent` is added to the same file so it can call it directly without needing to export it.
- `ParagraphData` is imported into `geminiService.ts` already (`import { ParagraphData } from '../components/ParagraphPractice'`). The `RhetoricalGenerationResult.paragraph` field reuses that exact type.
- The `Flashcards.tsx` confidence-rating system (localStorage key `flashcard-confidence-ratings`) is keyed by `card.word`. The rhetorical version uses `card.term` — do not share that localStorage key to avoid collisions.
- `ToggleButtonGroup` with `exclusive` prop prevents deselecting both buttons (the `if (val)` guard handles the `null` that MUI fires on re-click).
- When `section` changes from `'rhetoric'` back to `'vocab'`, the vocab state (`mode`, `quizData`) is untouched — the user returns to exactly where they left off.
