import { QuizGenerationResult, RhetoricalGenerationResult } from './geminiService';

const CACHE_PREFIX = 'vocab_cache_';
const CACHE_KEYS_KEY = 'vocab_cache_keys';
const LATEST_VOCAB_KEY = 'vocab_latest_stored';

const RHETORICAL_CACHE_PREFIX = 'rhetorical_cache_';
const RHETORICAL_CACHE_KEYS_KEY = 'rhetorical_cache_keys';
const LATEST_RHETORICAL_KEY = 'rhetorical_latest_stored';

const MAX_CACHE_ENTRIES = 10;

function getCacheKey(words: string[]): string {
  return words
    .map((w) => w.toLowerCase().trim())
    .sort()
    .join('|');
}

function getStoredKeys(storageKey: string = CACHE_KEYS_KEY): string[] {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredKeys(storageKey: string, keys: string[]): void {
  localStorage.setItem(storageKey, JSON.stringify(keys));
}

// ========================================================
// VOCABULARY CACHE
// ========================================================

export function getCachedResult(words?: string[]): { data: QuizGenerationResult; words: string[] } | null {
  try {
    // If specific words provided, look up exact key
    if (words && words.length > 0) {
      const key = getCacheKey(words);
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      if (raw) {
        return { data: JSON.parse(raw) as QuizGenerationResult, words };
      }
    }

    // Otherwise find the latest stored vocab set
    const latestRaw = localStorage.getItem(LATEST_VOCAB_KEY);
    if (latestRaw) {
      const parsed = JSON.parse(latestRaw);
      if (parsed && parsed.data && Array.isArray(parsed.words)) {
        return parsed;
      }
    }

    // Fallback: check any keys in registry
    const keys = getStoredKeys(CACHE_KEYS_KEY);
    for (const k of keys) {
      const itemRaw = localStorage.getItem(CACHE_PREFIX + k);
      if (itemRaw) {
        const data = JSON.parse(itemRaw) as QuizGenerationResult;
        const extractedWords = data.quiz?.map((q) => q.word).filter(Boolean) || [];
        return { data, words: extractedWords };
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function setCachedResult(words: string[], result: QuizGenerationResult): void {
  try {
    const key = getCacheKey(words);
    const keys = getStoredKeys(CACHE_KEYS_KEY);

    const existingIndex = keys.indexOf(key);
    if (existingIndex !== -1) keys.splice(existingIndex, 1);
    keys.unshift(key);

    while (keys.length > MAX_CACHE_ENTRIES) {
      const evicted = keys.pop();
      if (evicted) localStorage.removeItem(CACHE_PREFIX + evicted);
    }

    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(result));
    localStorage.setItem(LATEST_VOCAB_KEY, JSON.stringify({ data: result, words }));
    saveStoredKeys(CACHE_KEYS_KEY, keys);
  } catch {}
}

// ========================================================
// RHETORICAL CACHE
// ========================================================

export function getCachedRhetoricalResult(terms?: string[]): { data: RhetoricalGenerationResult; terms: string[] } | null {
  try {
    if (terms && terms.length > 0) {
      const key = getCacheKey(terms);
      const raw = localStorage.getItem(RHETORICAL_CACHE_PREFIX + key);
      if (raw) {
        return { data: JSON.parse(raw) as RhetoricalGenerationResult, terms };
      }
    }

    const latestRaw = localStorage.getItem(LATEST_RHETORICAL_KEY);
    if (latestRaw) {
      const parsed = JSON.parse(latestRaw);
      if (parsed && parsed.data && Array.isArray(parsed.terms)) {
        return parsed;
      }
    }

    const keys = getStoredKeys(RHETORICAL_CACHE_KEYS_KEY);
    for (const k of keys) {
      const itemRaw = localStorage.getItem(RHETORICAL_CACHE_PREFIX + k);
      if (itemRaw) {
        const data = JSON.parse(itemRaw) as RhetoricalGenerationResult;
        const extractedTerms = data.flashcards?.map((f) => f.term).filter(Boolean) || [];
        return { data, terms: extractedTerms };
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function setCachedRhetoricalResult(terms: string[], result: RhetoricalGenerationResult): void {
  try {
    const key = getCacheKey(terms);
    const keys = getStoredKeys(RHETORICAL_CACHE_KEYS_KEY);

    const existingIndex = keys.indexOf(key);
    if (existingIndex !== -1) keys.splice(existingIndex, 1);
    keys.unshift(key);

    while (keys.length > MAX_CACHE_ENTRIES) {
      const evicted = keys.pop();
      if (evicted) localStorage.removeItem(RHETORICAL_CACHE_PREFIX + evicted);
    }

    localStorage.setItem(RHETORICAL_CACHE_PREFIX + key, JSON.stringify(result));
    localStorage.setItem(LATEST_RHETORICAL_KEY, JSON.stringify({ data: result, terms }));
    saveStoredKeys(RHETORICAL_CACHE_KEYS_KEY, keys);
  } catch {}
}
