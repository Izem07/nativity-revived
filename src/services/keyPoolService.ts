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

    // Check env vars
    const envKey = import.meta.env.VITE_GEMINI_API_KEY as string;
    if (envKey && envKey !== 'your_api_key_here' && !loaded.includes(envKey.trim())) {
      loaded.push(envKey.trim());
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
   * Executes a Gemini API call with automatic key rotation on 429/ResourceExhausted or quota errors
   */
  public async executeWithRotation<T>(
    operation: (genAI: GoogleGenerativeAI, activeKey: string) => Promise<T>,
    maxRetries?: number
  ): Promise<T> {
    this.refreshKeysFromStorage();
    if (this.keys.length === 0) {
      throw new Error('No API key found. Please connect your free Gemini API key to proceed.');
    }

    const retries = maxRetries ?? Math.max(this.keys.length * 2, 3);
    let attempts = 0;
    let lastError: any = null;

    while (attempts < retries) {
      const activeKey = this.getCurrentKey();
      const genAI = new GoogleGenerativeAI(activeKey);

      try {
        return await operation(genAI, activeKey);
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        const isRateLimit =
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('Quota exceeded') ||
          errMsg.includes('rate limit') ||
          errMsg.includes('403');

        if (isRateLimit && this.keys.length > 1) {
          console.warn(`[KeyPool] Key ${this.currentIndex + 1} exhausted. Rotating to next pool key...`);
          this.rotateKey();
          attempts++;
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }

        if (isRateLimit) {
          // Single key rate limit
          attempts++;
          console.warn(`[KeyPool] Rate limit encountered on sole key. Pausing before retry attempt ${attempts}/${retries}...`);
          await new Promise((r) => setTimeout(r, 2000 * attempts));
          continue;
        }

        // Other errors (e.g. malformed model response)
        attempts++;
        if (attempts >= retries) throw err;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    throw lastError || new Error('All API keys in the pool failed or exceeded their rate limits.');
  }
}

// Global Singleton instance
export const globalKeyPool = new KeyPool();
