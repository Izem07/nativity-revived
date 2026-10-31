import { useEffect, useState } from 'react';
import { globalKeyPool, KEYS_CHANGED_EVENT } from '../services/keyPoolService';

const hasAnyKey = () => globalKeyPool.getKeys().length > 0;

// True when at least one Gemini key is available (saved in this browser or built in via env),
// and stays current as keys are added or removed.
export function useHasApiKey(): boolean {
  const [hasKey, setHasKey] = useState(hasAnyKey);

  useEffect(() => {
    const refresh = () => setHasKey(hasAnyKey());
    window.addEventListener(KEYS_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(KEYS_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return hasKey;
}
