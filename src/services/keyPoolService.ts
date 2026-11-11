import { GoogleGenerativeAI } from '@google/generative-ai';
import { getActiveSignal, cancelledError } from './generationControl';

// Waits ms, but rejects right away if the generation is cancelled
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(cancelledError());
    const id = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(id);
      reject(cancelledError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

// Settles with the promise, or rejects as soon as the signal aborts (the late result is ignored)
function raceAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) return reject(cancelledError());
    const onAbort = () => reject(cancelledError());
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (v) => {
        signal.removeEventListener('abort', onAbort);
        resolve(v);
      },
      (e) => {
        signal.removeEventListener('abort', onAbort);
        reject(e);
      }
    );
  });
}

// ---- Speed: what we've learned about models this session ----
// Daily free quota used up, per key (other keys still have their own quota). Cleared on reload.
const exhaustedModelsByKey = new Map<string, Set<string>>();
// Model names that don't exist for this API (retired/renamed)
const missingModels = new Set<string>();
// Models returning 503 "overloaded": skipped until this timestamp
const busyModelsUntil = new Map<string, number>();
const BUSY_COOLDOWN_MS = 60_000;
// Models that rejected the thinkingConfig field, so we stop sending it to them
const modelsRejectingThinking = new Set<string>();

/**
 * Extra generationConfig for study-set generation. Lower thinking makes Flash models start
 * answering much sooner; temperature 0.2 provides high factual accuracy and adherence to schemas.
 */
export function speedConfig(modelName: string): Record<string, unknown> {
  const base: Record<string, unknown> = {
    temperature: 0.2,
  };
  return modelsRejectingThinking.has(modelName)
    ? base
    : { ...base, thinkingConfig: { thinkingLevel: 'low' } };
}

// Fired on window whenever the saved key list changes, so UI can update without a reload
export const KEYS_CHANGED_EVENT = 'gemini-keys-changed';

export interface KeyPoolStatus {
  totalKeys: number;
  currentIndex: number;
  activeKeyMasked: string;
}

export class KeyPool {
  private keys: string[] = [];
  private currentIndex: number = 0;

  constructor(providedKeys?: string[]) {
    if (providedKeys && providedKeys.length > 0) {
      this.keys = providedKeys.map((k) => k.trim()).filter(Boolean);
    } else {
      this.refreshKeysFromStorage();
    }
  }

  public refreshKeysFromStorage(): void {
    const rawMultiple = localStorage.getItem('GEMINI_API_KEYS');
    let loaded: string[] = [];

    if (rawMultiple) {
      try {
        const parsed = JSON.parse(rawMultiple);
        if (Array.isArray(parsed)) {
          loaded = parsed.map((k: any) => String(k).trim()).filter(Boolean);
        }
      } catch {
        loaded = rawMultiple.split(/[\n,]+/).map((k) => k.trim()).filter(Boolean);
      }
    }

    // Also check single key
    const single = localStorage.getItem('GEMINI_API_KEY');
    if (single && single.trim() && !loaded.includes(single.trim())) {
      loaded.unshift(single.trim());
    }

    // Check env vars - single key
    const envKey = import.meta.env.VITE_GEMINI_API_KEY as string;
    if (envKey && envKey !== 'your_api_key_here' && !loaded.includes(envKey.trim())) {
      loaded.push(envKey.trim());
    }

    // Check env vars - numbered pool keys (VITE_GEMINI_API_KEY_1 through _5)
    for (let i = 1; i <= 5; i++) {
      const numberedKey = (import.meta.env as Record<string, string>)[`VITE_GEMINI_API_KEY_${i}`];
      if (numberedKey && numberedKey.trim() && numberedKey !== 'your_api_key_here' && !loaded.includes(numberedKey.trim())) {
        loaded.push(numberedKey.trim());
      }
    }

    this.keys = loaded;
    if (this.currentIndex >= this.keys.length) {
      this.currentIndex = 0;
    }
  }

  public getKeys(): string[] {
    this.refreshKeysFromStorage();
    return [...this.keys];
  }

  public setKeys(newKeys: string[]): void {
    const cleaned = newKeys.map((k) => k.trim()).filter(Boolean);
    this.keys = cleaned;
    this.currentIndex = 0;
    localStorage.setItem('GEMINI_API_KEYS', JSON.stringify(cleaned));
    if (cleaned.length > 0) {
      localStorage.setItem('GEMINI_API_KEY', cleaned[0]);
    } else {
      localStorage.removeItem('GEMINI_API_KEY');
    }
    window.dispatchEvent(new Event(KEYS_CHANGED_EVENT));
  }

  public addKey(key: string): void {
    const trimmed = key.trim();
    if (!trimmed) return;
    const current = this.getKeys();
    if (!current.includes(trimmed)) {
      current.push(trimmed);
      this.setKeys(current);
    }
  }

  public removeKey(index: number): void {
    const current = this.getKeys();
    if (index >= 0 && index < current.length) {
      current.splice(index, 1);
      this.setKeys(current);
    }
  }

  public getCurrentKey(): string {
    this.refreshKeysFromStorage();
    if (this.keys.length === 0) {
      throw new Error('Please configure at least one Gemini API key.');
    }
    return this.keys[this.currentIndex];
  }

  public rotateKey(): string {
    if (this.keys.length <= 1) return this.getCurrentKey();
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    console.warn(`[KeyPool] Rate limit or quota hit. Automatically rotating to key index: ${this.currentIndex + 1}/${this.keys.length}`);
    return this.getCurrentKey();
  }

  /**
   * Cooperatively advances to next key in pool so traffic is evenly load-balanced across all keys
   */
  public advanceNextKey(): void {
    if (this.keys.length > 1) {
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    }
  }

  public getStatus(): KeyPoolStatus {
    this.refreshKeysFromStorage();
    const active = this.keys[this.currentIndex] || '';
    const masked = active
      ? active.slice(0, 6) + '••••••••' + active.slice(-4)
      : 'None';
    return {
      totalKeys: this.keys.length,
      currentIndex: this.currentIndex,
      activeKeyMasked: masked,
    };
  }

  /**
   * Executes a Gemini API call with automatic key rotation and model fallback on 429/ResourceExhausted or quota errors
   */
  public async executeWithRotation<T>(
    operation: (
      genAI: GoogleGenerativeAI,
      activeKey: string,
      activeModelName: string,
      // Pass to generateContent(request, { signal }) so Cancel stops the network request too
      signal?: AbortSignal
    ) => Promise<T>,
    maxRetries?: number
  ): Promise<T> {
    // Set when this call is part of a cancellable study-set generation
    const signal = getActiveSignal();
    this.refreshKeysFromStorage();
    if (this.keys.length === 0) {
      throw new Error('No API key found. Please connect your free Gemini API key to proceed.');
    }

    // Cascade models using available free models:
    // gemini-3.8-flash & gemini-3.6-flash (flagship flash models)
    // gemini-3.5-flash-lite & gemini-3.1-flash-lite (high throughput, light token spending)
    const modelCandidates = [
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite'
    ];
    const isUsable = (model: string, key: string) =>
      !missingModels.has(model) &&
      !exhaustedModelsByKey.get(key)?.has(model) &&
      (busyModelsUntil.get(model) ?? 0) <= Date.now();

    // Next model after `from` that's worth trying with this key (or simply the next one if none are)
    const nextModel = (from: number, key: string) => {
      for (let step = 1; step <= modelCandidates.length; step++) {
        const i = (from + step) % modelCandidates.length;
        if (isUsable(modelCandidates[i], key)) return i;
      }
      return (from + 1) % modelCandidates.length;
    };

    // Start on the first model we haven't already seen fail this session
    const firstKey = this.getCurrentKey();
    let modelIndex = isUsable(modelCandidates[0], firstKey) ? 0 : nextModel(0, firstKey);
    let rateLimitFallbacks = 0;

    const retries = maxRetries ?? Math.max(this.keys.length * modelCandidates.length * 2, 8);
    let attempts = 0;
    let lastError: any = null;

    // Exponential backoff with jitter for transient server errors: ~0.5s, 1s, 2s, 4s, then 8s max
    let backoffStep = 0;
    const backoff = () => {
      const delay = Math.min(500 * 2 ** backoffStep, 8000) + Math.random() * 250;
      backoffStep++;
      return sleep(delay, signal);
    };

    while (attempts < retries) {
      if (signal?.aborted) throw cancelledError();
      const activeKey = this.getCurrentKey();
      const genAI = new GoogleGenerativeAI(activeKey);
      const activeModelName = modelCandidates[modelIndex];

      try {
        const result = await raceAbort(operation(genAI, activeKey, activeModelName, signal), signal);
        // Successful API call: advance to next key so traffic is evenly distributed across all keys in pool
        this.advanceNextKey();
        return result;
      } catch (err: any) {
        // A cancel is never retried or reported as a failure
        if (signal?.aborted) throw cancelledError();
        lastError = err;
        attempts++;
        const errMsg = String(err?.message || err);

        // Google is overloaded or hiccuping (503 / 500): try another model after a growing wait
        const isServerBusy =
          errMsg.includes('503') ||
          errMsg.includes('[500') ||
          errMsg.includes('high demand') ||
          errMsg.includes('temporarily unavailable') ||
          errMsg.includes('overloaded');

        // This model name doesn't exist (retired or not available to this key): skip it
        const isModelMissing =
          errMsg.includes('404') || errMsg.includes('is not found') || errMsg.includes('not supported for generateContent');

        // The key itself is bad or lacks Gemini access: retrying the same key can't help
        const isBadKey =
          errMsg.includes('API_KEY_INVALID') ||
          errMsg.includes('API key not valid') ||
          errMsg.includes('PERMISSION_DENIED') ||
          errMsg.includes('403');

        // A specific model's free-tier daily quota is used up (e.g. requests-per-day limit)
        const isModelQuotaExhausted =
          errMsg.includes('Quota exceeded for metric') ||
          errMsg.includes('GenerateRequestsPerDay') ||
          errMsg.includes('free_tier_requests');

        // This model doesn't accept the thinkingConfig we sent (see speedConfig)
        const isThinkingRejected = /thinking/i.test(errMsg) && (errMsg.includes('400') || errMsg.includes('INVALID_ARGUMENT'));

        const isRateLimit =
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('Quota exceeded') ||
          errMsg.includes('rate limit');

        if (isThinkingRejected && !modelsRejectingThinking.has(activeModelName)) {
          console.warn(`[KeyPool] ${activeModelName} doesn't accept thinkingConfig. Retrying without it...`);
          modelsRejectingThinking.add(activeModelName);
          continue;
        }

        if (isBadKey) {
          if (this.keys.length > 1) {
            console.warn(`[KeyPool] Key ${this.currentIndex + 1} was rejected. Rotating to next key in pool...`);
            this.rotateKey();
            continue;
          }
          throw new Error("Your Gemini API key was rejected. Open the API key screen and add a valid key.");
        }

        if (isModelMissing) {
          console.warn(`[KeyPool] Model ${activeModelName} is unavailable. Trying the next model...`);
          missingModels.add(activeModelName);
          modelIndex = nextModel(modelIndex, activeKey);
          continue;
        }

        if (isServerBusy) {
          console.warn(`[KeyPool] ${activeModelName} is busy (503). Backing off, then trying the next model...`);
          busyModelsUntil.set(activeModelName, Date.now() + BUSY_COOLDOWN_MS);
          modelIndex = nextModel(modelIndex, activeKey);
          await backoff();
          continue;
        }

        if (isModelQuotaExhausted) {
          console.warn(`[KeyPool] ${activeModelName} daily quota used up. Switching to the next model...`);
          if (!exhaustedModelsByKey.has(activeKey)) exhaustedModelsByKey.set(activeKey, new Set());
          exhaustedModelsByKey.get(activeKey)!.add(activeModelName);
          modelIndex = nextModel(modelIndex, activeKey);
          await sleep(400, signal);
          continue;
        }

        if (isRateLimit) {
          if (this.keys.length > 1) {
            console.warn(`[KeyPool] Key ${this.currentIndex + 1} hit a rate limit. Rotating to next key in pool...`);
            this.rotateKey();
            await sleep(500, signal);
            continue;
          }
          // Single key: try a lighter model first, then wait it out
          if (rateLimitFallbacks < modelCandidates.length - 1) {
            rateLimitFallbacks++;
            modelIndex = nextModel(modelIndex, activeKey);
            console.warn(`[KeyPool] Rate limited. Falling back to ${modelCandidates[modelIndex]}...`);
            await sleep(600, signal);
            continue;
          }
          console.warn(`[KeyPool] Rate limited. Backing off (attempt ${attempts}/${retries})...`);
          await backoff();
          continue;
        }

        // Other errors (e.g. malformed model output): retry shortly
        if (attempts >= retries) throw err;
        await sleep(1000, signal);
      }
    }

    throw lastError || new Error('All API keys and fallback models exceeded their rate limits or daily quota.');
  }
}

// Global Singleton instance
export const globalKeyPool = new KeyPool();
