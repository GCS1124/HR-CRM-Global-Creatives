const LOGIN_BROADCAST_KEY = "hrcrm_login_broadcast_ts";
const LOGIN_BROADCAST_TTL_MS = 30_000;

export function markLoginBroadcastStart(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LOGIN_BROADCAST_KEY, String(Date.now()));
  } catch {
    // Ignore storage failures (private mode, blocked storage, etc.).
  }
} 

export function clearLoginBroadcastStart(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(LOGIN_BROADCAST_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function getLoginBroadcastRemainingMs(): number {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const raw = window.localStorage.getItem(LOGIN_BROADCAST_KEY);
    if (!raw) {
      return 0;
    }

    const start = Number(raw);
    if (!Number.isFinite(start)) {
      return 0;
    }

    const elapsed = Date.now() - start;
    return Math.max(LOGIN_BROADCAST_TTL_MS - elapsed, 0);
  } catch {
    return 0;
  }
}
