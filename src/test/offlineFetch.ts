/**
 * Deterministic stand-in for a restricted network: every fetch is blackholed.
 *
 * Mirrors what undici does on a blocked socket — the request neither connects nor
 * fails until either the caller's signal aborts or undici's own connect timeout
 * (~10s) fires, then rejects with ConnectTimeoutError / UND_ERR_SOCKET.
 */
import { vi } from 'vitest';

export type TimerHandle = ReturnType<typeof setTimeout>;

/** undici's default connect timeout, i.e. how long a signal-less fetch hangs. */
export const CONNECT_TIMEOUT_MS = 10_000;

export interface Blackhole {
  calls: string[];
  restore: () => void;
}

export function installBlackholeFetch(): Blackhole {
  const calls: string[] = [];
  const timers = new Set<TimerHandle>();

  const stub = (input: unknown, init?: RequestInit) => {
    calls.push(String(input));
    const signal = init?.signal ?? undefined;
    const { promise, reject } = Promise.withResolvers<Response>();
    const fail = () =>
      reject(Object.assign(new Error('ConnectTimeoutError: 10000ms'), { name: 'ConnectTimeoutError', code: 'UND_ERR_SOCKET' }));

    if (signal?.aborted) fail();
    else {
      signal?.addEventListener('abort', fail, { once: true });
      const timer = setTimeout(fail, CONNECT_TIMEOUT_MS);
      timers.add(timer);
      signal?.addEventListener('abort', () => clearTimeout(timer), { once: true });
    }
    return promise;
  };

  vi.stubGlobal('fetch', stub);
  return {
    calls,
    restore: () => {
      for (const t of timers) clearTimeout(t);
      timers.clear();
      vi.unstubAllGlobals();
    },
  };
}

export interface BudgetResult<T> {
  value: T;
  elapsedMs: number;
}

/**
 * Resolves with the handler's value and its wall-clock cost, or rejects when the
 * handler is still pending after `budgetMs` — a 200 that arrives after 24s is
 * still the user's broken request.
 */
export async function withinBudget<T>(work: Promise<T>, budgetMs: number, label: string): Promise<BudgetResult<T>> {
  const startedAt = Date.now();
  const { promise: deadline, reject } = Promise.withResolvers<never>();
  const timer = setTimeout(
    () => reject(new Error(`${label}: still pending after ${budgetMs}ms wall-clock budget`)),
    budgetMs,
  );
  try {
    const value = await Promise.race([work, deadline]);
    return { value, elapsedMs: Date.now() - startedAt };
  } finally {
    clearTimeout(timer);
  }
}
