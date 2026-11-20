/**
 * One shared egress guard for every external feed.
 *
 * On a restricted network undici waits ~10s for the socket and then rejects with
 * ConnectTimeoutError / UND_ERR_SOCKET; sequential calls stack that latency into a
 * request the user experiences as a broken stream. 3s is the ceiling we promise the
 * client, so every call here is bounded by it and returns `null` instead of throwing.
 */

export const EXTERNAL_TIMEOUT_MS = 3000;

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = EXTERNAL_TIMEOUT_MS,
): Promise<Response | null> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}
