import { QuizGenerationResult, RhetoricalGenerationResult } from './geminiService';

const CACHE_PREFIX = 'vocab_cache_';
const CACHE_KEYS_KEY = 'vocab_cache_keys';
const RHETORICAL_CACHE_PREFIX = 'rhetorical_cache_';
const RHETORICAL_CACHE_KEYS_KEY = 'rhetorical_cache_keys';
const MAX_CACHE_ENTRIES = 5;

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

export function getCachedResult(words: string[]): QuizGenerationResult | null {
  try {
    const key = getCacheKey(words);
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as QuizGenerationResult;
  } catch {
    return null;
  }
}

export function setCachedResult(words: string[], result: QuizGenerationResult): void {
  try {
    const key = getCacheKey(words);
    const keys = getStoredKeys(CACHE_KEYS_KEY);

    // Remove existing entry for this key if present
    const existingIndex = keys.indexOf(key);
    if (existingIndex !== -1) keys.splice(existingIndex, 1);

    // Add to front (most recent)
    keys.unshift(key);

    // Evict oldest entries beyond the limit
    while (keys.length > MAX_CACHE_ENTRIES) {
      const evicted = keys.pop();
      if (evicted) localStorage.removeItem(CACHE_PREFIX + evicted);
    }

    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(result));
    saveStoredKeys(CACHE_KEYS_KEY, keys);
  } catch {
    // localStorage might be full or unavailable — fail silently
  }
}

export function getCachedRhetoricalResult(terms: string[]): RhetoricalGenerationResult | null {
  try {
    const key = getCacheKey(terms);
    const raw = localStorage.getItem(RHETORICAL_CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as RhetoricalGenerationResult;
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
    saveStoredKeys(RHETORICAL_CACHE_KEYS_KEY, keys);
  } catch {
    // Fail silently if storage is restricted
  }
}
