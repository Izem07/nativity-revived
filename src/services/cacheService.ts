import { QuizGenerationResult } from './geminiService';

const CACHE_PREFIX = 'vocab_cache_';
const CACHE_KEYS_KEY = 'vocab_cache_keys';
const MAX_CACHE_ENTRIES = 5;

function getCacheKey(words: string[]): string {
  return words
    .map((w) => w.toLowerCase().trim())
    .sort()
    .join('|');
}

function getStoredKeys(): string[] {
  try {
    const raw = localStorage.getItem(CACHE_KEYS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredKeys(keys: string[]): void {
  localStorage.setItem(CACHE_KEYS_KEY, JSON.stringify(keys));
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
    const keys = getStoredKeys();

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
    saveStoredKeys(keys);
  } catch {
    // localStorage might be full or unavailable — fail silently
  }
}
