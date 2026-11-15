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

// Settles with the promise, or rejects as soon as the signal aborts
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

// ========================================================
// TIERED MODEL ROUTER CONFIGURATION
// Stacks free-tier quotas across multiple models to push
// capacity from 20 RPD to 30,000+ RPD per API key.
// ========================================================

export type ModelTier =
  | 'fast'
  | 'medium'
  | 'heavy'
  | 'embedding'
  | 'fastDrills'
  | 'passageQuizzes'
  | 'deepReasoning';

export interface ExecutionOptions {
  tier?: ModelTier;
  maxRetries?: number;
  skipRateSmoothing?: boolean;
}

/**
 * Recommended Model Pools for Nativity Revived:
 * - fastDrills: 29,800 combined RPD. Starts with gemini-3.5-flash-lite (~1.1s response, zero thinking tokens)
 * - passageQuizzes: 1,000 combined RPD. Generates whole passage sets in 1 consolidated request
 * - deepReasoning: 80 combined RPD. Flagship models reserved strictly for essay grading & rhetorical analysis
 */
export const MODEL_POOLS = {
  // 29,800 combined RPD — use for GRE Analogies, Vocab & Single-Term Drills
  fastDrills: [
    'gemini-3.5-flash-lite', // 500 RPD, 250K TPM, fastest JSON output (~1.1s)
    'gemini-3.1-flash-lite', // 500 RPD, 250K TPM
    'gemma-4-31b-it',        // 14,400 RPD (keep prompt + output < 16K TPM)
    'gemma-4-26b-a4b-it',    // 14,400 RPD
  ],
  // 1,000 combined RPD — use for Long AP Lang Passages + Multi-Question MCQs
  passageQuizzes: [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
  ],
  // 80 combined RPD — reserve ONLY for Essay Grading & Deep Rhetorical Analysis
  deepReasoning: [
    'gemini-4-hydrogen',     // 20 RPD
    'gemini-3.8-flash',      // 20 RPD
    'gemini-3.6-flash',      // 20 RPD
    'gemini-3-flash',        // 20 RPD
  ],
};

export const TIER_FALLBACKS: Record<string, string[]> = {
  fast: MODEL_POOLS.fastDrills,
  fastDrills: MODEL_POOLS.fastDrills,
  medium: MODEL_POOLS.passageQuizzes,
  passageQuizzes: MODEL_POOLS.passageQuizzes,
  heavy: MODEL_POOLS.deepReasoning,
  deepReasoning: MODEL_POOLS.deepReasoning,
  embedding: ['gemini-embedding-2', 'text-embedding-004']
};

export const TIER_MIN_INTERVAL_MS: Record<string, number> = {
  fast: 2000,
  fastDrills: 2000,
  medium: 4000,
  passageQuizzes: 4000,
  heavy: 5000,
  deepReasoning: 5000,
  embedding: 600
};

// Rate smoothing gate state
const lastRequestTimeByTier: Partial<Record<string, number>> = {};
const tierQueueTails: Partial<Record<string, Promise<void>>> = {};

/**
 * Enforces client-side rate smoothing and debounce queues per tier.
 * Prevents rapid button clicking from hitting AI Studio 429 RPM limits.
 */
export async function scheduleTierTurn(tier: string, signal?: AbortSignal): Promise<void> {
  const minInterval = TIER_MIN_INTERVAL_MS[tier] || 0;
  if (minInterval <= 0) return;

  const prev = tierQueueTails[tier] || Promise.resolve();
  let release: () => void;
  const current = new Promise<void>((res) => {
    release = res;
  });
  tierQueueTails[tier] = current;

  return prev.then(async () => {
    if (signal?.aborted) {
      release!();
      throw cancelledError();
    }
    const now = Date.now();
    const lastTime = lastRequestTimeByTier[tier] || 0;
    const elapsed = now - lastTime;
    if (elapsed < minInterval) {
      try {
        await sleep(minInterval - elapsed, signal);
      } finally {
        lastRequestTimeByTier[tier] = Date.now();
        release!();
      }
    } else {
      lastRequestTimeByTier[tier] = Date.now();
      release!();
    }
  });
}

// Daily free quota used up, per key. Cleared on reload.
const exhaustedModelsByKey = new Map<string, Set<string>>();
// Model names that don't exist for this API
const missingModels = new Set<string>();
// Models returning 503 "overloaded" or timed out: skipped until this timestamp
const busyModelsUntil = new Map<string, number>();
const BUSY_COOLDOWN_MS = 30_000;
// Models that rejected thinkingConfig
const modelsRejectingThinking = new Set<string>();

/**
 * GenerationConfig tailored for high speed and quota efficiency:
 * - Uses thinkingLevel: 'low' for fast responses on reasoning-capable models.
 * - Numerical thinkingBudget is avoided as it triggers 400 Invalid Argument on Gemini 3+ endpoints.
 * - On Gemma models or models that reject thinking, thinkingConfig is omitted.
 */
export function speedConfig(modelName: string, tier: string = 'medium'): Record<string, unknown> {
  const isDeep = tier === 'heavy' || tier === 'deepReasoning';
  const base: Record<string, unknown> = {
    temperature: isDeep ? 0.35 : 0.2,
  };
  const isGemma = modelName.toLowerCase().startsWith('gemma');
  if (isGemma || modelsRejectingThinking.has(modelName)) {
    return base;
  }

  // Gemini 3.x models use categorical thinkingLevel ('low'), not numerical thinkingBudget
  return { ...base, thinkingConfig: { thinkingLevel: 'low' } };
}

/**
 * Generates clean generationConfig tailored for the target model.
 * - Omits thinkingConfig for Gemma models and models that reject it.
 * - Omits responseMimeType for Gemma models (prevents 400 Bad Request on open-weights endpoints).
 * - Explicitly removes search grounding tools (Gemini 3.x/4.x free tier has 0/0 grounding quota).
 */
export function getTierGenerationConfig(
  modelName: string,
  overrides: Record<string, any> = {},
  tier: string = 'medium'
): Record<string, any> {
  const isGemma = modelName.toLowerCase().startsWith('gemma');
  const base = speedConfig(modelName, tier);
  const merged: Record<string, any> = {
    ...base,
    ...overrides,
  };

  // Gemma models reject thinkingConfig and responseMimeType
  if (isGemma) {
    delete merged.thinkingConfig;
    delete merged.responseMimeType;
  }

  // Grounding tool protection: never pass googleSearch to Gemini 3.x/4.x or Gemma
  delete merged.tools;

  return merged;
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
    console.warn(`[KeyPool] Rotating to key index: ${this.currentIndex + 1}/${this.keys.length}`);
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
   * Executes a Gemini API call with:
   * 1. Tiered model routing (fastDrills, passageQuizzes, deepReasoning)
   * 2. Per-attempt timeout of 13s to prevent 90-second stalls
   * 3. Automatic waterfall fallback across models on HTTP 429 / RESOURCE_EXHAUSTED / quota limits
   * 4. Multi-key rotation when all tier candidates on the active key are exhausted
   */
  public async executeWithRotation<T>(
    operation: (
      genAI: GoogleGenerativeAI,
      activeKey: string,
      activeModelName: string,
      signal?: AbortSignal
    ) => Promise<T>,
    optionsOrMaxRetries?: number | ExecutionOptions
  ): Promise<T> {
    const signal = getActiveSignal();
    this.refreshKeysFromStorage();
    if (this.keys.length === 0) {
      throw new Error('No API key found. Please connect your free Gemini API key to proceed.');
    }

    const options: ExecutionOptions =
      typeof optionsOrMaxRetries === 'number'
        ? { maxRetries: optionsOrMaxRetries }
        : optionsOrMaxRetries || {};

    const tierKey: string = options.tier || 'medium';
    const modelCandidates = TIER_FALLBACKS[tierKey] || MODEL_POOLS.passageQuizzes;

    // Apply tier rate smoothing to avoid hitting RPM limits
    if (!options.skipRateSmoothing) {
      await scheduleTierTurn(tierKey, signal);
    }

    const isUsable = (model: string, key: string) =>
      !missingModels.has(model) &&
      !exhaustedModelsByKey.get(key)?.has(model) &&
      (busyModelsUntil.get(model) ?? 0) <= Date.now();

    const findFirstUsableIndex = (key: string) => {
      for (let i = 0; i < modelCandidates.length; i++) {
        if (isUsable(modelCandidates[i], key)) return i;
      }
      return 0;
    };

    const nextModel = (from: number, key: string) => {
      for (let step = 1; step <= modelCandidates.length; step++) {
        const i = (from + step) % modelCandidates.length;
        if (isUsable(modelCandidates[i], key)) return i;
      }
      return (from + 1) % modelCandidates.length;
    };

    const firstKey = this.getCurrentKey();
    let modelIndex = findFirstUsableIndex(firstKey);

    const retries = options.maxRetries ?? Math.max(this.keys.length * modelCandidates.length * 2, 8);
    let attempts = 0;
    let lastError: any = null;

    let backoffStep = 0;
    const backoff = () => {
      const delay = Math.min(500 * 2 ** backoffStep, 8000) + Math.random() * 250;
      backoffStep++;
      return sleep(delay, signal);
    };

    // 13-second per-attempt timeout: eliminates 90-second stalls
    const ATTEMPT_TIMEOUT_MS = 13_000;

    while (attempts < retries) {
      if (signal?.aborted) throw cancelledError();
      const activeKey = this.getCurrentKey();
      const genAI = new GoogleGenerativeAI(activeKey);
      const activeModelName = modelCandidates[modelIndex];

      // Per-attempt abort controller enforcing 13-second timeout
      const attemptController = new AbortController();
      let attemptTimedOut = false;
      const timeoutTimer = setTimeout(() => {
        attemptTimedOut = true;
        attemptController.abort();
      }, ATTEMPT_TIMEOUT_MS);

      const onParentAbort = () => attemptController.abort();
      signal?.addEventListener('abort', onParentAbort, { once: true });

      try {
        const result = await raceAbort(
          operation(genAI, activeKey, activeModelName, attemptController.signal),
          attemptController.signal
        );
        clearTimeout(timeoutTimer);
        signal?.removeEventListener('abort', onParentAbort);
        // Successful API call: advance key pool cooperatively
        this.advanceNextKey();
        return result;
      } catch (err: any) {
        clearTimeout(timeoutTimer);
        signal?.removeEventListener('abort', onParentAbort);

        if (signal?.aborted) throw cancelledError();

        // Stalled past 13s timeout: waterfall immediately to next model
        if (attemptTimedOut) {
          console.warn(
            `[KeyPool] [${tierKey.toUpperCase()}] ${activeModelName} stalled past ${ATTEMPT_TIMEOUT_MS / 1000}s. Waterfalling to next model...`
          );
          busyModelsUntil.set(activeModelName, Date.now() + BUSY_COOLDOWN_MS);
          modelIndex = nextModel(modelIndex, activeKey);
          attempts++;
          continue;
        }

        lastError = err;
        attempts++;
        const errMsg = String(err?.message || err);

        const isServerBusy =
          errMsg.includes('503') ||
          errMsg.includes('[500') ||
          errMsg.includes('high demand') ||
          errMsg.includes('temporarily unavailable') ||
          errMsg.includes('overloaded');

        const isModelMissing =
          errMsg.includes('404') ||
          errMsg.includes('is not found') ||
          errMsg.includes('not supported for generateContent');

        const isBadKey =
          errMsg.includes('API_KEY_INVALID') ||
          errMsg.includes('API key not valid') ||
          errMsg.includes('PERMISSION_DENIED') ||
          errMsg.includes('403');

        const isModelQuotaExhausted =
          errMsg.includes('Quota exceeded for metric') ||
          errMsg.includes('GenerateRequestsPerDay') ||
          errMsg.includes('free_tier_requests');

        const isInvalidArgument =
          errMsg.includes('400') ||
          errMsg.includes('INVALID_ARGUMENT') ||
          errMsg.includes('invalid argument');

        const isRateLimit =
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('Quota exceeded') ||
          errMsg.includes('rate limit');

        if (isInvalidArgument) {
          if (!modelsRejectingThinking.has(activeModelName)) {
            console.warn(`[KeyPool] ${activeModelName} rejected configuration (400 Invalid Argument). Retrying without thinkingConfig...`);
            modelsRejectingThinking.add(activeModelName);
            continue;
          }
          // If still failing with 400 even without thinkingConfig, waterfall to next model
          console.warn(`[KeyPool] [${tierKey.toUpperCase()}] ${activeModelName} failed with 400. Waterfalling to next model...`);
          missingModels.add(activeModelName);
          modelIndex = nextModel(modelIndex, activeKey);
          continue;
        }

        if (isBadKey) {
          if (this.keys.length > 1) {
            console.warn(`[KeyPool] Key ${this.currentIndex + 1} was rejected. Rotating to next key in pool...`);
            this.rotateKey();
            modelIndex = findFirstUsableIndex(this.getCurrentKey());
            continue;
          }
          throw new Error("Your Gemini API key was rejected. Open the API key screen and add a valid key.");
        }

        if (isModelMissing) {
          console.warn(`[KeyPool] [${tierKey.toUpperCase()}] Model ${activeModelName} unavailable. Waterfalling to next model...`);
          missingModels.add(activeModelName);
          modelIndex = nextModel(modelIndex, activeKey);
          continue;
        }

        if (isServerBusy) {
          console.warn(`[KeyPool] [${tierKey.toUpperCase()}] ${activeModelName} is busy (503). Backing off, then waterfalling...`);
          busyModelsUntil.set(activeModelName, Date.now() + BUSY_COOLDOWN_MS);
          modelIndex = nextModel(modelIndex, activeKey);
          await backoff();
          continue;
        }

        if (isModelQuotaExhausted || isRateLimit) {
          // Record model quota exhaustion on this key
          if (!exhaustedModelsByKey.has(activeKey)) {
            exhaustedModelsByKey.set(activeKey, new Set());
          }
          exhaustedModelsByKey.get(activeKey)!.add(activeModelName);

          // Check if another model in this tier is still usable on this key
          let hasAnotherUsableInTier = false;
          for (const m of modelCandidates) {
            if (isUsable(m, activeKey)) {
              hasAnotherUsableInTier = true;
              break;
            }
          }

          if (hasAnotherUsableInTier) {
            const nextIdx = nextModel(modelIndex, activeKey);
            console.warn(
              `[KeyPool] [${tierKey.toUpperCase()}] 429/Quota on ${activeModelName}. Waterfalling to ${modelCandidates[nextIdx]}...`
            );
            modelIndex = nextIdx;
            await sleep(350, signal);
            continue;
          }

          // All models in this tier exhausted on this key: rotate key if multiple keys exist
          if (this.keys.length > 1) {
            console.warn(
              `[KeyPool] [${tierKey.toUpperCase()}] All models in tier exhausted on key ${this.currentIndex + 1}. Rotating to next API key...`
            );
            this.rotateKey();
            const newKey = this.getCurrentKey();
            modelIndex = findFirstUsableIndex(newKey);
            await sleep(500, signal);
            continue;
          }

          // Single key and all tier models exhausted: backoff
          console.warn(`[KeyPool] [${tierKey.toUpperCase()}] Rate limited across all models. Backing off (attempt ${attempts}/${retries})...`);
          await backoff();
          continue;
        }

        // Other errors: retry shortly
        if (attempts >= retries) throw err;
        await sleep(1000, signal);
      }
    }

    throw lastError || new Error(`All API keys and fallback models in ${tierKey.toUpperCase()} tier exceeded their rate limits or daily quota.`);
  }

  /**
   * Generates vector embeddings using the embedding tier (gemini-embedding-2 / text-embedding-004)
   * without consuming text generation quotas.
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    return this.executeWithRotation(async (genAI, _key, fallbackModel) => {
      const model = genAI.getGenerativeModel({ model: fallbackModel || 'gemini-embedding-2' });
      const result = await model.embedContent(text);
      return result.embedding.values;
    }, { tier: 'embedding' });
  }
}

// Global Singleton instance
export const globalKeyPool = new KeyPool();
