import { GoogleGenerativeAI } from '@google/generative-ai';

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
    operation: (genAI: GoogleGenerativeAI, activeKey: string, activeModelName: string) => Promise<T>,
    maxRetries?: number
  ): Promise<T> {
    this.refreshKeysFromStorage();
    if (this.keys.length === 0) {
      throw new Error('No API key found. Please connect your free Gemini API key to proceed.');
    }

    // Cascade models when a model daily free tier quota (e.g. 20 RPD on 3.8-flash) is depleted
    const modelCandidates = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite'];
    let modelIndex = 0;

    const retries = maxRetries ?? Math.max(this.keys.length * modelCandidates.length * 2, 8);
    let attempts = 0;
    let lastError: any = null;

    while (attempts < retries) {
      const activeKey = this.getCurrentKey();
      const genAI = new GoogleGenerativeAI(activeKey);
      const activeModelName = modelCandidates[modelIndex % modelCandidates.length];

      try {
        return await operation(genAI, activeKey, activeModelName);
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        const isQuotaOrRateLimit =
          errMsg.includes('429') ||
          errMsg.includes('503') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('Quota exceeded') ||
          errMsg.includes('high demand') ||
          errMsg.includes('temporarily unavailable') ||
          errMsg.includes('rate limit') ||
          errMsg.includes('403');

        // Check if a specific model free tier quota was exhausted (like 20 RPD limit on 3.8-flash)
        const isModelQuotaExhausted =
          errMsg.includes('Quota exceeded for metric') ||
          errMsg.includes('GenerateRequestsPerDay') ||
          errMsg.includes('free_tier_requests');

        if (isModelQuotaExhausted) {
          console.warn(`[KeyPool] Model ${activeModelName} daily quota exhausted. Falling back to alternative model...`);
          modelIndex++;
          attempts++;
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }

        if (isQuotaOrRateLimit && this.keys.length > 1) {
          console.warn(`[KeyPool] Key ${this.currentIndex + 1} hit rate-limit or quota. Rotating to next key in pool...`);
          this.rotateKey();
          attempts++;
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }

        if (isQuotaOrRateLimit) {
          // If single key hit rate limit, try falling back to next available model first
          if (modelIndex < modelCandidates.length - 1) {
            modelIndex++;
            attempts++;
            console.warn(`[KeyPool] Attempting fallback to ${modelCandidates[modelIndex]}...`);
            await new Promise((r) => setTimeout(r, 800));
            continue;
          }

          attempts++;
          console.warn(`[KeyPool] Temporary rate limit. Retrying in ${1.2 * attempts}s (attempt ${attempts}/${retries})...`);
          await new Promise((r) => setTimeout(r, 1200 * attempts));
          continue;
        }

        // Other errors (e.g. malformed model response)
        attempts++;
        if (attempts >= retries) throw err;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    throw lastError || new Error('All API keys and fallback models exceeded their rate limits or daily quota.');
  }
}

// Global Singleton instance
export const globalKeyPool = new KeyPool();
