import { globalKeyPool } from './keyPoolService';

// ==========================================
// ANALOGY QUIZ — AP Lang Analogy Engine
// ==========================================

export type AnalogyIntensity = 'Easy' | 'Standard' | 'Challenging' | 'Advanced';

export interface AnalogyQuestion {
  pair: [string, string];
  choices: [string, string][];
  correctIndex: number;
  bridge: string;
  category: 'DEGREE' | 'FUNCTION' | 'CAUSE_EFFECT' | 'CHARACTERISTIC' | 'PART_WHOLE' | 'SYNONYM_INTENSITY';
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
    const model = genAI.getGenerativeModel({ model: fallbackModel || 'gemini-2.5-flash' });
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
        const model = genAI.getGenerativeModel({ model: fallbackModel || 'gemini-2.5-flash' });
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

export function getCachedAnalogies(intensity?: AnalogyIntensity): AnalogySet | null {
  try {
    // 1. Try specified intensity first
    if (intensity) {
      const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${intensity}`);
      if (raw) {
        const parsed: AnalogySet = JSON.parse(raw);
        if (isValidAnalogySet(parsed)) return parsed;
      }
    }

    // 2. Fallback: check any stored intensity in order
    const allIntensities: AnalogyIntensity[] = ['Standard', 'Easy', 'Challenging', 'Advanced'];
    for (const lvl of allIntensities) {
      const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${lvl}`);
      if (raw) {
        const parsed: AnalogySet = JSON.parse(raw);
        if (isValidAnalogySet(parsed)) return parsed;
      }
    }

    // 3. Fallback: check legacy key
    const legacy = localStorage.getItem('NATIVITY_ANALOGY_CACHE');
    if (legacy) {
      const parsed: AnalogySet = JSON.parse(legacy);
      if (isValidAnalogySet(parsed)) return parsed;
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

const BASE_PROMPT = `You are an expert analogy question author for advanced AP English Language students.
Generate analogy questions that test nuanced relationships between words.

CATEGORY TYPES to distribute:
- DEGREE: words that differ in degree/intensity (lukewarm : scalding, displeased : livid, damp : saturated)
- FUNCTION: an item to its primary instrument/user/purpose (scalpel : surgeon, rudder : vessel, chisel : sculptor)
- CAUSE_EFFECT: action to natural consequence (practice : mastery, negligence : decay, catalyst : reaction)
- CHARACTERISTIC: a quintessential trait of something (stoic : composure, prodigal : extravagance, zephyr : gentle)
- PART_WHOLE: component to containing system (stanza : poem, vertebra : spine, rung : ladder)
- SYNONYM_INTENSITY: subtle gradations of meaning where one is dramatically more potent

RULES:
1. "pair" MUST be an array of two complete English words as strings, e.g. ["displeased", "livid"]. NEVER output single letters, abbreviations, or empty strings!
2. "choices" MUST be an array of 4 option pairs. Each option pair MUST be an array of two complete English words, e.g. [["lukewarm", "boiling"], ["damp", "saturated"], ["chilly", "freezing"], ["annoyed", "enraged"]]. NEVER return single letters!
3. Distractor options MUST be plausible word pairs with distinct logical relationships, not random words.
4. The correct answer must strictly match the relationship syntax and direction of the stem pair.
5. Bridge sentence MUST follow the pattern: "[Word A] is to [Word B] as [Choice A] is to [Choice B] because..."
6. Randomize the correct index (0, 1, 2, or 3).
7. Output ONLY a valid JSON array of objects with fields:
   - "pair": [string, string]
   - "choices": [[string, string], [string, string], [string, string], [string, string]]
   - "correctIndex": number (0 to 3)
   - "bridge": string
   - "category": "DEGREE" | "FUNCTION" | "CAUSE_EFFECT" | "CHARACTERISTIC" | "PART_WHOLE" | "SYNONYM_INTENSITY"
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

  const questions = await globalKeyPool.executeWithRotation(async (genAI, _key, fallbackModel) => {
    const model = genAI.getGenerativeModel({
      model: fallbackModel || 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.85,
        topP: 0.95,
      },
    });

    const fullPrompt = `${BASE_PROMPT}\n\nDifficulty Intensity: ${intensity}. ${intensityInstructions}\nTask: Generate ${count} analogy questions. Return ONLY a valid JSON array matching the schema above.`;

    const result = await model.generateContent(fullPrompt);
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
      return arr.map((item) => ({
        pair: parsePair(item.pair),
        choices: (item.choices || []).map((c: any) => parsePair(c)),
        correctIndex: typeof item.correctIndex === 'number' ? item.correctIndex : 0,
        bridge: String(item.bridge || ''),
        category: item.category || 'DEGREE',
        rationale: String(item.rationale || '')
      }));
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

  const set: AnalogySet = { questions, generatedAt: Date.now(), intensity };
  setCachedAnalogies(set);
  return set;
}
