// Tracks the one study-set generation that can run at a time (navigation is locked while it runs),
// so a Cancel button anywhere can stop it without threading callbacks through every component.

let active: AbortController | null = null;

/** Starts a new generation and returns its signal. Any previous one is aborted. */
export function beginGeneration(): AbortSignal {
  active?.abort();
  active = new AbortController();
  return active.signal;
}

/** Clears the active generation if it is the one that just finished. */
export function endGeneration(signal: AbortSignal): void {
  if (active?.signal === signal) active = null;
}

/** Stops the active generation, if any. */
export function cancelGeneration(): void {
  active?.abort();
  active = null;
}

/** Signal of the running generation, picked up automatically by the key pool. */
export function getActiveSignal(): AbortSignal | undefined {
  return active?.signal;
}

export function isCancelledError(err: unknown): boolean {
  return (err as { name?: string } | null)?.name === 'AbortError';
}

export function cancelledError(): Error {
  const err = new Error('Generation cancelled.');
  err.name = 'AbortError';
  return err;
}
