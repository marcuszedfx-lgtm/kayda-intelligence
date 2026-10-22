/**
 * =========================================================
 * KAYDA INTELLIGENCE — LOGIN THROTTLE
 * =========================================================
 *
 * Brute-force protection for the operator login.
 *
 * The throttle is deliberately small and in-process: Kayda is a
 * single-operator, single-process, loopback-bound application, so
 * a shared store would add a dependency without adding
 * protection. Restarting the server clears it, which is the
 * documented trade-off.
 *
 * HOW THE SOURCE KEY IS CHOSEN (see `trusted-proxy.ts`):
 *
 * The key must not be attacker-controlled. Kayda does not read
 * the socket peer address — a Next.js route handler is not given
 * one — so when no reverse proxy is configured the key is the
 * constant `LOCAL_SOURCE_KEY`: every caller shares one bucket.
 * That is the honest answer for an application whose only
 * possible peer is the operator's own machine.
 *
 * A forwarded address is used as the key ONLY when the operator
 * has explicitly configured `KAYDA_TRUSTED_PROXY`, because only
 * then is `X-Forwarded-For` the observation of a proxy rather
 * than a value the client typed. Even then the bucket count is
 * capped and an existing lockout is never evicted to make room.
 *
 * THE GLOBAL CEILING is the control that survives any key:
 * `GLOBAL_MAX_ATTEMPTS` failures from every source combined lock
 * the whole endpoint for `GLOBAL_BLOCK_MS`. Rotating a source
 * header cannot reset it, and a successful sign-in deliberately
 * does not clear it either, so no caller can buy themselves a
 * fresh allowance.
 *
 * Server-only.
 */

/** Failed attempts allowed from one source inside the window. */
export const LOGIN_MAX_ATTEMPTS = 5;

/** Length of the per-source attempt window. */
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/** How long a source stays locked out after the limit. */
export const LOGIN_BLOCK_MS = 15 * 60 * 1000;

/**
 * Failed attempts allowed from every source combined before the
 * whole endpoint locks. This is the bound that a source key
 * cannot bypass.
 */
export const GLOBAL_MAX_ATTEMPTS = 20;

/** Length of the global attempt window. */
export const GLOBAL_WINDOW_MS = 15 * 60 * 1000;

/** How long the endpoint stays locked after the global limit. */
export const GLOBAL_BLOCK_MS = 15 * 60 * 1000;

/**
 * The source key used when no reverse proxy is trusted. A
 * constant on purpose: with no trustworthy peer address there is
 * one honest bucket, not a bucket per header value.
 */
export const LOCAL_SOURCE_KEY = 'local';

/**
 * Hard cap on tracked sources, so the table cannot grow without
 * bound when a trusted proxy is in front.
 */
const MAX_TRACKED_SOURCES = 1024;

/** Longest source key kept in the table. */
const MAX_SOURCE_KEY_LENGTH = 128;

interface Bucket {
  failures: number;
  firstFailureAt: number;
  blockedUntil: number;
}

const buckets = new Map<string, Bucket>();

let globalFailures = 0;
let globalFirstFailureAt = 0;
let globalBlockedUntil = 0;

export interface ThrottleDecision {
  /** Whether the attempt may proceed. */
  allowed: boolean;
  /** Seconds the caller should wait before retrying. */
  retryAfterSeconds: number;
  /** Attempts still available in the current window. */
  remainingAttempts: number;
  /** True when the refusal came from the global ceiling. */
  global: boolean;
}

/** Removes buckets that can no longer affect a decision. */
function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    const expired =
      bucket.blockedUntil <= now &&
      now - bucket.firstFailureAt > LOGIN_WINDOW_MS;

    if (expired) {
      buckets.delete(key);
    }
  }

  if (buckets.size <= MAX_TRACKED_SOURCES) {
    return;
  }

  // Over the cap, evict the OLDEST sources that are not
  // currently locked out. An active lockout is never dropped to
  // make room, so filling the table cannot be used to clear one.
  const excess = buckets.size - MAX_TRACKED_SOURCES;

  let removed = 0;

  for (const [key, bucket] of buckets) {
    if (bucket.blockedUntil > now) {
      continue;
    }

    buckets.delete(key);
    removed += 1;

    if (removed >= excess) {
      break;
    }
  }
}

/** Expires the global window once it has gone quiet. */
function rollGlobalWindow(now: number): void {
  if (!globalFirstFailureAt) {
    return;
  }

  if (now - globalFirstFailureAt <= GLOBAL_WINDOW_MS) {
    return;
  }

  globalFailures = 0;
  globalFirstFailureAt = 0;
  globalBlockedUntil = 0;
}

/**
 * Normalises a source key: bounded length, and never blank.
 */
function normalizeKey(key: string): string {
  const trimmed = key.trim().slice(0, MAX_SOURCE_KEY_LENGTH);

  return trimmed || LOCAL_SOURCE_KEY;
}

/**
 * Decides whether a login attempt from `key` may proceed.
 */
export function checkLoginThrottle(
  key: string = LOCAL_SOURCE_KEY,
  now = Date.now(),
): ThrottleDecision {
  prune(now);
  rollGlobalWindow(now);

  if (globalBlockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((globalBlockedUntil - now) / 1000),
      remainingAttempts: 0,
      global: true,
    };
  }

  const globalRemaining = Math.max(0, GLOBAL_MAX_ATTEMPTS - globalFailures);
  const bucket = buckets.get(normalizeKey(key));

  if (!bucket) {
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remainingAttempts: Math.min(LOGIN_MAX_ATTEMPTS, globalRemaining),
      global: false,
    };
  }

  if (bucket.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.blockedUntil - now) / 1000),
      remainingAttempts: 0,
      global: false,
    };
  }

  const elapsed = now - bucket.firstFailureAt;

  if (elapsed > LOGIN_WINDOW_MS) {
    buckets.delete(normalizeKey(key));

    return {
      allowed: true,
      retryAfterSeconds: 0,
      remainingAttempts: Math.min(LOGIN_MAX_ATTEMPTS, globalRemaining),
      global: false,
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remainingAttempts: Math.min(
      Math.max(0, LOGIN_MAX_ATTEMPTS - bucket.failures),
      globalRemaining,
    ),
    global: false,
  };
}

/**
 * Records a failed login attempt for `key` and advances the
 * global ceiling.
 */
export function recordLoginFailure(
  key: string = LOCAL_SOURCE_KEY,
  now = Date.now(),
): void {
  prune(now);

  const bucketKey = normalizeKey(key);
  const bucket = buckets.get(bucketKey);

  if (!bucket || now - bucket.firstFailureAt > LOGIN_WINDOW_MS) {
    buckets.set(bucketKey, {
      failures: 1,
      firstFailureAt: now,
      blockedUntil: 0,
    });
  } else {
    bucket.failures += 1;

    if (bucket.failures >= LOGIN_MAX_ATTEMPTS) {
      bucket.blockedUntil = now + LOGIN_BLOCK_MS;
    }
  }

  rollGlobalWindow(now);

  if (!globalFirstFailureAt) {
    globalFirstFailureAt = now;
  }

  globalFailures += 1;

  if (globalFailures >= GLOBAL_MAX_ATTEMPTS) {
    globalBlockedUntil = now + GLOBAL_BLOCK_MS;
  }
}

/**
 * Clears the failure counter for `key` after a success.
 *
 * The global ceiling is deliberately left standing: a successful
 * sign-in is not a reason to hand every other source a fresh
 * allowance, and nothing that fails can clear it.
 */
export function clearLoginFailures(key: string = LOCAL_SOURCE_KEY): void {
  buckets.delete(normalizeKey(key));
}

/** Clears every tracked source and the global counter. Test-only. */
export function resetLoginThrottle(): void {
  buckets.clear();

  globalFailures = 0;
  globalFirstFailureAt = 0;
  globalBlockedUntil = 0;
}

/** Whether a source still has a bucket. Test-only. */
export function isSourceTracked(key: string): boolean {
  return buckets.has(normalizeKey(key));
}
