import { globalKeyPool, speedConfig } from './keyPoolService';

// ==========================================
// ANALOGY QUIZ — AP Lang Analogy Engine
// ==========================================

export type AnalogyIntensity = 'Easy' | 'Standard' | 'Challenging' | 'Advanced';

export type AnalogyCategory =
  | 'DEFINITION'
  | 'SYNONYM'
  | 'ANTONYM'
  | 'TYPE_KIND'
  | 'DEGREE'
  | 'FUNCTION'
  | 'PART_WHOLE'
  | 'CAUSE_EFFECT';

export const ANALOGY_CATEGORIES: AnalogyCategory[] = [
  'DEFINITION',
  'SYNONYM',
  'ANTONYM',
  'TYPE_KIND',
  'DEGREE',
  'FUNCTION',
  'PART_WHOLE',
  'CAUSE_EFFECT'
];

export const CATEGORY_LABELS: Record<string, string> = {
  DEFINITION: 'Definition / Evidence',
  SYNONYM: 'Synonym',
  ANTONYM: 'Antonym',
  TYPE_KIND: 'Type / Kind',
  DEGREE: 'Degree / Intensity',
  FUNCTION: 'Purpose / Function',
  PART_WHOLE: 'Component / Part',
  CAUSE_EFFECT: 'Cause & Effect',
  // Legacy categories from older cached sets
  CHARACTERISTIC: 'Characteristic',
  SYNONYM_INTENSITY: 'Synonym Intensity'
};

export const ANALOGY_CHOICE_COUNT = 5;

export interface AnalogyQuestion {
  pair: [string, string];
  choices: [string, string][];
  correctIndex: number;
  // General sentence with blanks that expresses the stem relationship, e.g.
  // "A ____ does something as one part of a ____ as a whole." Absent on older cached sets.
  generalSentence?: string;
  bridge: string;
  category: AnalogyCategory | string;
  rationale: string;
}

export interface AnalogySet {
  questions: AnalogyQuestion[];
  generatedAt: number;
  intensity: AnalogyIntensity;
}

export interface WordDefinitionResult {
  word: string;
  partOfSpeech: string;
  definition: string;
  example?: string;
}

const DEFINITION_CACHE: Record<string, WordDefinitionResult> = {};

// Helper to look up a single token via DictionaryAPI with timeout
async function fetchDictionaryApiSingle(term: string): Promise<WordDefinitionResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2800); // 2.8s fast timeout

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const entry = data[0];
        const meaning = entry.meanings?.[0];
        const defObj = meaning?.definitions?.[0];
        if (defObj?.definition) {
          return {
            word: entry.word || term,
            partOfSpeech: meaning?.partOfSpeech || 'definition',
            definition: defObj.definition,
            example: defObj.example,
          };
        }
      }
    }
  } catch {
    clearTimeout(timeoutId);
  }
  return null;
}

// Helper to look up via Wiktionary API (reliable open fallback)
async function fetchWiktionarySingle(term: string): Promise<WordDefinitionResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(term)}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NativityRevived/1.0' }
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const posGroup = data.en?.[0];
      const defObj = posGroup?.definitions?.[0];
      if (defObj?.definition) {
        const cleanDef = defObj.definition.replace(/<[^>]+>/g, '').trim();
        return {
          word: term,
          partOfSpeech: posGroup.partOfSpeech || 'definition',
          definition: cleanDef,
          example: undefined
        };
      }
    }
  } catch {
    clearTimeout(timeoutId);
  }
  return null;
}

// Helper to look up via Datamuse API (fast, high TPM, zero auth required)
async function fetchDatamuseSingle(term: string): Promise<WordDefinitionResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const res = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(term)}&md=d&max=1`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0].defs) && data[0].defs.length > 0) {
        const rawDef = String(data[0].defs[0] || '');
        const tabIdx = rawDef.indexOf('\t');
        let pos = '';
        let defText = rawDef;
        if (tabIdx !== -1) {
          const rawPos = rawDef.slice(0, tabIdx).trim();
          pos = rawPos === 'n' ? 'noun' : rawPos === 'v' ? 'verb' : rawPos === 'adj' ? 'adjective' : rawPos === 'adv' ? 'adverb' : rawPos;
          defText = rawDef.slice(tabIdx + 1).trim();
        }
        if (defText) {
          return {
            word: data[0].word || term,
            partOfSpeech: pos || 'definition',
            definition: defText,
            example: undefined
          };
        }
      }
    }
  } catch {
    clearTimeout(timeoutId);
  }
  return null;
}

export async function lookupWordDefinition(rawQuery: string): Promise<WordDefinitionResult> {
  // 1. Clean query string
  const cleaned = rawQuery.replace(/[^a-zA-Z\s-]/g, ' ').trim().toLowerCase();
  if (!cleaned) {
    return {
      word: rawQuery,
      partOfSpeech: '',
      definition: 'No valid word specified.'
    };
  }

  // 2. Check memory cache first
  if (DEFINITION_CACHE[cleaned]) {
    return DEFINITION_CACHE[cleaned];
  }

  // 3. Try localStorage cache for instant access
  try {
    const stored = localStorage.getItem(`NATIVITY_DICT_${cleaned}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      DEFINITION_CACHE[cleaned] = parsed;
      return parsed;
    }
  } catch {}

  // 4. If query is multiple words (e.g. "scalpel and surgeon" or "lukewarm : scalding"),
  // split and try looking up key words first
  const words = cleaned
    .split(/\s+(?:and|or|to|is|vs)?\s+|\s*[:\-,]\s*/)
    .map(w => w.trim())
    .filter(w => w.length > 1 && !['and', 'or', 'to', 'is', 'the', 'a', 'an'].includes(w));

  const targetWord = words[0] || cleaned;

  // Try public dictionary API first (<200ms)
  const directResult = await fetchDictionaryApiSingle(targetWord);
  if (directResult) {
    DEFINITION_CACHE[cleaned] = directResult;
    try {
      localStorage.setItem(`NATIVITY_DICT_${cleaned}`, JSON.stringify(directResult));
    } catch {}
    return directResult;
  }

  // Try Wiktionary API second (<300ms, avoids AI quota)
  const wikiResult = await fetchWiktionarySingle(targetWord);
  if (wikiResult) {
    DEFINITION_CACHE[cleaned] = wikiResult;
    try {
      localStorage.setItem(`NATIVITY_DICT_${cleaned}`, JSON.stringify(wikiResult));
    } catch {}
    return wikiResult;
  }

  // If query had a second word and first didn't hit, try second word
  if (words.length > 1) {
    const secondResult = (await fetchDictionaryApiSingle(words[1])) || (await fetchWiktionarySingle(words[1]));
    if (secondResult) {
      DEFINITION_CACHE[cleaned] = secondResult;
      try {
        localStorage.setItem(`NATIVITY_DICT_${cleaned}`, JSON.stringify(secondResult));
      } catch {}
      return secondResult;
    }
  }

  // 5. Fallback to Gemini with rotating keys
  return globalKeyPool.executeWithRotation(async (genAI, _key, fallbackModel) => {
    const model = genAI.getGenerativeModel({ model: fallbackModel || 'gemini-3.8-flash' });
    const prompt = `Provide a concise dictionary definition for "${targetWord}".
Return ONLY JSON:
{
  "word": "${targetWord}",
  "partOfSpeech": "noun/adj/verb",
  "definition": "Clear concise definition (10-20 words)",
  "example": "Brief illustrative sentence."
}`;
    const res = await model.generateContent(prompt);
    const text = res.response.text().trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(text);
    const result: WordDefinitionResult = {
      word: parsed.word || targetWord,
      partOfSpeech: parsed.partOfSpeech || '',
      definition: parsed.definition || 'Definition unavailable.',
      example: parsed.example || undefined
    };
    DEFINITION_CACHE[cleaned] = result;
    try {
      localStorage.setItem(`NATIVITY_DICT_${cleaned}`, JSON.stringify(result));
    } catch {}
    return result;
  });
}

/**
 * Bulk Pre-fetches and caches all definitions for a question or quiz set.
 * Uses fast parallel public APIs with fallback to a single batch Gemini call for un-cached words.
 */
export async function bulkPreloadDefinitions(
  wordList: string[],
  onProgress?: (loaded: number, total: number) => void
): Promise<Record<string, WordDefinitionResult>> {
  const uniqueWords = Array.from(
    new Set(
      wordList
        .map(w => w.replace(/[^a-zA-Z-]/g, '').trim().toLowerCase())
        .filter(w => w.length > 1)
    )
  );

  const results: Record<string, WordDefinitionResult> = {};
  const missingWords: string[] = [];

  // Check cache first
  for (const w of uniqueWords) {
    if (DEFINITION_CACHE[w]) {
      results[w] = DEFINITION_CACHE[w];
    } else {
      try {
        const stored = localStorage.getItem(`NATIVITY_DICT_${w}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          DEFINITION_CACHE[w] = parsed;
          results[w] = parsed;
          continue;
        }
      } catch {}
      missingWords.push(w);
    }
  }

  if (onProgress) onProgress(Object.keys(results).length, uniqueWords.length);
  if (missingWords.length === 0) return results;

  // Parallel fetch missing from public APIs in chunks of 5
  const unresolved: string[] = [];
  const chunkSize = 5;
  for (let i = 0; i < missingWords.length; i += chunkSize) {
    const chunk = missingWords.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (word) => {
        const direct = (await fetchDictionaryApiSingle(word)) || (await fetchWiktionarySingle(word));
        if (direct) {
          DEFINITION_CACHE[word] = direct;
          results[word] = direct;
          try {
            localStorage.setItem(`NATIVITY_DICT_${word}`, JSON.stringify(direct));
          } catch {}
        } else {
          unresolved.push(word);
        }
      })
    );
    if (onProgress) onProgress(Object.keys(results).length, uniqueWords.length);
  }

  // If any words were not found in free APIs, batch fetch all of them in ONE single Gemini call
  if (unresolved.length > 0) {
    try {
      await globalKeyPool.executeWithRotation(async (genAI, _key, fallbackModel) => {
        const model = genAI.getGenerativeModel({ model: fallbackModel || 'gemini-3.8-flash' });
        const prompt = `Provide concise collegiate dictionary definitions for each of these words: ${JSON.stringify(unresolved)}.
Return ONLY a JSON array of objects with schema:
[
  {
    "word": "example",
    "partOfSpeech": "noun/adj/verb",
    "definition": "Clear concise definition (10-20 words)",
    "example": "Brief sentence."
  }
]`;
        const res = await model.generateContent(prompt);
        const text = res.response.text().trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed: any[] = JSON.parse(text);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const w = String(item.word || '').trim().toLowerCase();
            if (w) {
              const defRes: WordDefinitionResult = {
                word: item.word,
                partOfSpeech: item.partOfSpeech || '',
                definition: item.definition || 'Definition unavailable.',
                example: item.example || undefined
              };
              DEFINITION_CACHE[w] = defRes;
              results[w] = defRes;
              try {
                localStorage.setItem(`NATIVITY_DICT_${w}`, JSON.stringify(defRes));
              } catch {}
            }
          }
        }
      });
    } catch {}
  }

  if (onProgress) onProgress(uniqueWords.length, uniqueWords.length);
  return results;
}

const CACHE_KEY_PREFIX = 'NATIVITY_ANALOGY_CACHE_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Returns the saved set for exactly this difficulty, or null. Never substitutes a set from another difficulty.
export function getCachedAnalogies(intensity: AnalogyIntensity): AnalogySet | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${intensity}`);
    if (raw) {
      const parsed: AnalogySet = JSON.parse(raw);
      if (isValidAnalogySet(parsed)) return parsed;
    }

    // Legacy single-slot key, only if it was saved at this difficulty
    const legacy = localStorage.getItem('NATIVITY_ANALOGY_CACHE');
    if (legacy) {
      const parsed: AnalogySet = JSON.parse(legacy);
      if (parsed?.intensity === intensity && isValidAnalogySet(parsed)) return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

export function isValidAnalogySet(set: any): boolean {
  if (!set || !Array.isArray(set.questions) || set.questions.length === 0) return false;
  const first = set.questions[0];
  if (!first || !Array.isArray(first.pair) || first.pair.length < 2) return false;
  // Verify that pair words are not single truncated letters or empty
  if (String(first.pair[0]).trim().length <= 1 || String(first.pair[1]).trim().length <= 1) return false;
  if (!Array.isArray(first.choices) || first.choices.length < 2) return false;
  // Verify choices contain full words
  const firstChoice = first.choices[0];
  if (Array.isArray(firstChoice)) {
    if (String(firstChoice[0]).trim().length <= 1 && String(firstChoice[1]).trim().length <= 1) return false;
  }
  return true;
}

export function setCachedAnalogies(set: AnalogySet): void {
  try {
    if (!isValidAnalogySet(set)) return;
    localStorage.setItem(`${CACHE_KEY_PREFIX}${set.intensity}`, JSON.stringify(set));
    localStorage.setItem('NATIVITY_ANALOGY_CACHE', JSON.stringify(set));
  } catch {}
}

const BASE_PROMPT = `You are an expert author of GRE-style verbal analogy questions for advanced AP English Language students.
An analogy compares two things that seem unrelated but are related in some respect. Each question tests whether the student can
recognize the relationship in a stem pair and identify the answer pair with the parallel relationship.

METHOD — ESTABLISH THE RELATIONSHIP WITH A GENERAL SENTENCE:
For every question, write a "general sentence" that states the stem relationship precisely, with blanks in place of the words.
Be specific: "A musician plays in an orchestra" is too loose; "A ____ does something as one part of a ____ as a whole" is precise.
Exactly one answer pair must fit the general sentence. Each distractor should fit a loose version of the sentence at most, never the precise one.
Example — MUSICIAN : ORCHESTRA :: (A) mechanic : car (B) songwriter : lyrics (C) desk : office (D) player : team (E) actor : screen
General sentence: "A ____ does something as one part of a ____ as a whole." Correct: player : team.

RELATIONSHIP TYPES — spread questions across these categories:
- DEFINITION: one word defines the other, or is a defining characteristic of it (paragon : excellence)
- SYNONYM: the words have similar meanings (fascination : interest)
- ANTONYM: the words have opposite meanings (stingy : generous)
- TYPE_KIND: one word is a type or example of the other (French : language)
- DEGREE: same concept, different intensity, size or extent (phobia : fear)
- FUNCTION: one word is the purpose or function of the other (needle : stitch)
- PART_WHOLE: one word is a member, part or component of the other (actor : cast, flour : bread)
- CAUSE_EFFECT: one word leads to or results in the other (preparation : success)

RULES:
1. "pair" MUST be an array of two complete English words, e.g. ["phobia", "fear"]. NEVER output single letters, abbreviations, or empty strings.
2. "choices" MUST be an array of exactly ${ANALOGY_CHOICE_COUNT} option pairs, each an array of two complete English words.
3. Choices must keep the same order and direction as the stem (if the stem is PART : WHOLE, the answer is PART : WHOLE, not WHOLE : PART).
4. Distractors must be plausible pairs with clear but different relationships: a reversed direction, a related but different category,
   or a loose association (like actor : screen). No random words.
5. "generalSentence" is the blank-filled sentence described above, using "____" for each word.
6. "bridge" applies the general sentence to both the stem and the correct answer, e.g.
   "A musician performs as one part of an orchestra as a whole, just as a player participates as one part of a team as a whole."
7. "rationale" explains briefly why each distractor fails the general sentence.
8. Randomize "correctIndex" (0 to ${ANALOGY_CHOICE_COUNT - 1}).
9. Output ONLY a valid JSON array of objects with fields:
   - "pair": [string, string]
   - "choices": [[string, string] x ${ANALOGY_CHOICE_COUNT}]
   - "correctIndex": number
   - "generalSentence": string
   - "bridge": string
   - "category": ${ANALOGY_CATEGORIES.map((c) => `"${c}"`).join(' | ')}
   - "rationale": string`;

export async function generateAnalogies(
  count: number = 8,
  intensity: AnalogyIntensity = 'Standard'
): Promise<AnalogySet> {
  const intensityInstructions = {
    'Easy': 'Target clear, accessible high-school vocabulary with straightforward, intuitive relational bridges and clear distinction from distractors.',
    'Standard': 'Target standard AP Lang vocabulary with clear, well-defined relational bridges.',
    'Challenging': 'Use sophisticated collegiate vocabulary with subtle distractor traps.',
    'Advanced': 'Use advanced AP Lang vocabulary testing subtle gradations of intensity, secondary word definitions, and nuanced syntactic parallels.'
  }[intensity];

  const questions = await globalKeyPool.executeWithRotation(async (genAI, _key, fallbackModel, signal) => {
    const modelName = fallbackModel || 'gemini-3.8-flash';
    const model = genAI.getGenerativeModel({
      model: modelName,
      // JSON mode avoids malformed replies (which force a full retry); lower thinking answers sooner
      generationConfig: {
        temperature: 0.85,
        topP: 0.95,
        responseMimeType: 'application/json',
        ...speedConfig(modelName),
      },
    });

    const fullPrompt = `${BASE_PROMPT}\n\nDifficulty Intensity: ${intensity}. ${intensityInstructions}\nTask: Generate ${count} analogy questions. Return ONLY a valid JSON array matching the schema above.`;

    const result = await model.generateContent(fullPrompt, { signal });
    const raw = result.response.text().trim();
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const jsonStr = cleaned.startsWith('[') ? cleaned : '[' + cleaned;

    const parsePair = (raw: any): [string, string] => {
      if (Array.isArray(raw)) {
        return [String(raw[0] || '').trim(), String(raw[1] || '').trim()];
      }
      if (typeof raw === 'string') {
        const parts = raw.split(/\s*:\s*|\s+is to\s+|\s+to\s+/i);
        return [parts[0]?.trim() || '', parts[1]?.trim() || ''];
      }
      return ['', ''];
    };

    const sanitize = (arr: any[]): AnalogyQuestion[] => {
      return arr
        .map((item) => ({
          pair: parsePair(item.pair),
          choices: (item.choices || []).map((c: any) => parsePair(c)),
          correctIndex: typeof item.correctIndex === 'number' ? item.correctIndex : 0,
          generalSentence: String(item.generalSentence || ''),
          bridge: String(item.bridge || ''),
          category: ANALOGY_CATEGORIES.includes(item.category) ? item.category : 'DEFINITION',
          rationale: String(item.rationale || '')
        }))
        // Drop malformed questions rather than showing an unanswerable one
        .filter(
          (q: AnalogyQuestion) =>
            q.pair[0] &&
            q.pair[1] &&
            q.choices.length >= 2 &&
            q.correctIndex >= 0 &&
            q.correctIndex < q.choices.length
        );
    };

    try {
      const parsed = JSON.parse(jsonStr) as any[];
      return sanitize(parsed);
    } catch {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]) as any[];
        return sanitize(parsed);
      }
      throw new Error('Analogy generator returned malformed JSON. Please try again.');
    }
  });

  if (questions.length === 0) {
    throw new Error('Analogy generator returned no usable questions. Please try again.');
  }

  const set: AnalogySet = { questions, generatedAt: Date.now(), intensity };
  setCachedAnalogies(set);
  return set;
}
