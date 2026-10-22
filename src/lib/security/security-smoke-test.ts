import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import {
  checkLoginThrottle,
  clearLoginFailures,
  GLOBAL_MAX_ATTEMPTS,
  GLOBAL_WINDOW_MS,
  isSourceTracked,
  LOCAL_SOURCE_KEY,
  LOGIN_MAX_ATTEMPTS,
  recordLoginFailure,
  resetLoginThrottle,
} from './login-throttle';
import {
  isOperatorTokenConfigured,
  MIN_OPERATOR_TOKEN_LENGTH,
  readOperatorToken,
  tokensMatch,
} from './operator-token';
import {
  MAX_LOGIN_BODY_BYTES,
  isJsonContentType,
  readJsonBody,
  RequestBodyError,
} from './request-limits';
import {
  buildClearedSessionCookie,
  buildSessionCookie,
  createSessionValue,
  DEFAULT_SESSION_TTL_MS,
  getSessionTtlMs,
  isSecureRequest,
  MAX_SESSION_TTL_MS,
  SESSION_COOKIE_NAME,
  SESSION_VERSION,
  verifySessionValue,
} from './session';
import { TRUSTED_PROXY_ENV } from './trusted-proxy';

/**
 * Security smoke test.
 *
 * Deterministic, offline and database-free. It exercises the
 * controls that decide who may reach the data: token
 * comparison, session signing, login throttling and request
 * body limits.
 *
 * No secret is printed, and no value from the environment is
 * read except the operator token variable, which is
 * restored before the test exits.
 */

const TOKEN_ENV = 'KAYDA_OPERATOR_TOKEN';
const TTL_ENV = 'KAYDA_SESSION_TTL_HOURS';

const originalToken = process.env[TOKEN_ENV];
const originalTtl = process.env[TTL_ENV];
const originalTrustedProxy = process.env[TRUSTED_PROXY_ENV];

const TEST_TOKEN = 'test-operator-token-value-0123456789abcdef';

async function main(): Promise<void> {
  // 1. The token is read from the environment, and a short
  //    token is refused outright.
  delete process.env[TOKEN_ENV];

  assert.equal(readOperatorToken(), undefined);
  assert.equal(isOperatorTokenConfigured(), false);

  process.env[TOKEN_ENV] = 'too-short';

  assert.equal(readOperatorToken(), undefined);
  assert.equal(isOperatorTokenConfigured(), false);

  process.env[TOKEN_ENV] = TEST_TOKEN;

  assert.equal(readOperatorToken(), TEST_TOKEN);
  assert.equal(isOperatorTokenConfigured(), true);
  assert.ok(TEST_TOKEN.length >= MIN_OPERATOR_TOKEN_LENGTH);

  // 2. Constant-time comparison accepts only the exact token.
  assert.equal(tokensMatch(TEST_TOKEN, TEST_TOKEN), true);
  assert.equal(tokensMatch(`${TEST_TOKEN} `, TEST_TOKEN), false);
  assert.equal(tokensMatch(TEST_TOKEN.slice(0, -1), TEST_TOKEN), false);
  assert.equal(tokensMatch('', TEST_TOKEN), false);
  assert.equal(tokensMatch('x'.repeat(TEST_TOKEN.length), TEST_TOKEN), false);

  // 3. A session round-trips, and a tampered or expired one
  //    does not.
  const now = Date.now();
  const session = createSessionValue(TEST_TOKEN, now);

  assert.equal(verifySessionValue(session, TEST_TOKEN, now), true);
  assert.equal(
    verifySessionValue(session, TEST_TOKEN, now + DEFAULT_SESSION_TTL_MS),
    false,
    'a session must not outlive its expiry',
  );
  assert.equal(
    verifySessionValue(session, 'a-different-token-value-0123456789ab', now),
    false,
    'a session signed with another token must be refused',
  );
  assert.equal(
    verifySessionValue(`${session}x`, TEST_TOKEN, now),
    false,
    'a tampered signature must be refused',
  );
  assert.equal(verifySessionValue(undefined, TEST_TOKEN, now), false);
  assert.equal(verifySessionValue('', TEST_TOKEN, now), false);
  assert.equal(verifySessionValue('not-a-session', TEST_TOKEN, now), false);

  // 4. The session lifetime is bounded and configurable.
  delete process.env[TTL_ENV];

  assert.equal(getSessionTtlMs(), DEFAULT_SESSION_TTL_MS);

  process.env[TTL_ENV] = '1';

  assert.equal(getSessionTtlMs(), 60 * 60 * 1000);

  process.env[TTL_ENV] = 'not-a-number';

  assert.equal(
    getSessionTtlMs(),
    DEFAULT_SESSION_TTL_MS,
    'a nonsensical lifetime must fall back to the default',
  );

  process.env[TTL_ENV] = '99999';

  assert.ok(
    getSessionTtlMs() <= 30 * 24 * 60 * 60 * 1000,
    'a configured lifetime must still be capped',
  );

  delete process.env[TTL_ENV];

  // 5. The login throttle locks a source out after repeated
  //    failures and lets it back in once the window passes.
  resetLoginThrottle();

  const key = '198.51.100.10';

  for (let attempt = 0; attempt < LOGIN_MAX_ATTEMPTS - 1; attempt += 1) {
    assert.equal(checkLoginThrottle(key, now).allowed, true);
    recordLoginFailure(key, now);
  }

  assert.equal(checkLoginThrottle(key, now).allowed, true);

  recordLoginFailure(key, now);

  const blocked = checkLoginThrottle(key, now);

  assert.equal(blocked.allowed, false, 'the source must be locked out');
  assert.ok(blocked.retryAfterSeconds > 0);

  // A different source is unaffected.
  assert.equal(checkLoginThrottle('203.0.113.9', now).allowed, true);

  // The lockout expires.
  assert.equal(
    checkLoginThrottle(key, now + 16 * 60 * 1000).allowed,
    true,
    'the lockout must expire',
  );

  // A success clears the counter.
  resetLoginThrottle();

  recordLoginFailure(key, now);
  clearLoginFailures(key);

  assert.equal(
    checkLoginThrottle(key, now).remainingAttempts,
    LOGIN_MAX_ATTEMPTS,
  );

  resetLoginThrottle();

  // 4b. A session that claims a longer life than any
  //     configuration can issue is refused, even when its
  //     signature is otherwise valid. The issuer cannot produce
  //     one, so verification must not accept one.
  {
    const issuedAt = now - 1_000;
    const expiresAt = issuedAt + MAX_SESSION_TTL_MS + 60_000;
    const payload = `${SESSION_VERSION}.${issuedAt}.${expiresAt}`;
    const signature = createHmac('sha256', TEST_TOKEN)
      .update(payload)
      .digest('base64url');

    assert.equal(
      verifySessionValue(`${payload}.${signature}`, TEST_TOKEN, now),
      false,
      'a session longer than the maximum lifetime must be refused',
    );

    const withinLimit =
      MAX_SESSION_TTL_MS - 60_000;
    const okPayload = `${SESSION_VERSION}.${now}.${now + withinLimit}`;
    const okSignature = createHmac('sha256', TEST_TOKEN)
      .update(okPayload)
      .digest('base64url');

    assert.equal(
      verifySessionValue(`${okPayload}.${okSignature}`, TEST_TOKEN, now),
      true,
      'a session at the maximum lifetime is accepted',
    );
  }

  // 4c. The `Secure` cookie attribute follows the connection
  //     unless a reverse proxy is explicitly trusted. A client
  //     cannot turn it on or off with a header.
  {
    const plain = new Request('http://127.0.0.1:3102/api/auth/login', {
      method: 'POST',
    });
    const claimedHttps = new Request(
      'http://127.0.0.1:3102/api/auth/login',
      {
        method: 'POST',
        headers: { 'x-forwarded-proto': 'https' },
      },
    );
    const claimedHttp = new Request('http://127.0.0.1:3102/api/auth/login', {
      method: 'POST',
      headers: { 'x-forwarded-proto': 'http' },
    });

    try {
      delete process.env[TRUSTED_PROXY_ENV];

      assert.equal(
        isSecureRequest(plain),
        false,
        'plain-HTTP loopback stays plain, so the cookie is storable',
      );
      assert.equal(
        isSecureRequest(claimedHttps),
        false,
        'an untrusted X-Forwarded-Proto must not set Secure',
      );

      process.env[TRUSTED_PROXY_ENV] = '1';

      assert.equal(
        isSecureRequest(claimedHttps),
        true,
        'a trusted proxy may report HTTPS',
      );
      assert.equal(
        isSecureRequest(claimedHttp),
        false,
        'a trusted proxy may report plain HTTP',
      );
      assert.equal(
        isSecureRequest(plain),
        false,
        'no header at all falls back to the connection',
      );
    } finally {
      if (originalTrustedProxy === undefined) {
        delete process.env[TRUSTED_PROXY_ENV];
      } else {
        process.env[TRUSTED_PROXY_ENV] = originalTrustedProxy;
      }
    }
  }

  // 5b. THE M2 REGRESSION: the global ceiling cannot be reset by
  //     changing the source. Whatever key an attacker reaches
  //     for, the endpoint is locked for everyone.
  {
    resetLoginThrottle();

    for (let attempt = 0; attempt < GLOBAL_MAX_ATTEMPTS - 1; attempt += 1) {
      recordLoginFailure(`rotating-${attempt}`, now);
    }

    assert.equal(
      checkLoginThrottle('a-fresh-key', now).allowed,
      true,
      'below the ceiling the endpoint is still open',
    );

    recordLoginFailure('rotating-last', now);

    const globalBlocked = checkLoginThrottle('a-fresh-key', now);

    assert.equal(
      globalBlocked.allowed,
      false,
      'the global ceiling must lock every source',
    );
    assert.equal(globalBlocked.global, true);
    assert.ok(globalBlocked.retryAfterSeconds > 0);
    assert.equal(
      checkLoginThrottle(LOCAL_SOURCE_KEY, now).allowed,
      false,
    );
    assert.equal(
      checkLoginThrottle(`attacker-${now}`, now).allowed,
      false,
      'a brand-new source key must not escape the ceiling',
    );

    // The ceiling expires on its own window.
    assert.equal(
      checkLoginThrottle('a-fresh-key', now + GLOBAL_WINDOW_MS + 1_000).allowed,
      true,
      'the global window must expire',
    );
  }

  // 5c. A successful sign-in clears the per-source counter but
  //     deliberately NOT the global ceiling: nothing that fails
  //     may hand back an allowance.
  {
    resetLoginThrottle();

    for (let attempt = 0; attempt < GLOBAL_MAX_ATTEMPTS - 1; attempt += 1) {
      recordLoginFailure(LOCAL_SOURCE_KEY, now);
    }

    clearLoginFailures(LOCAL_SOURCE_KEY);

    assert.equal(
      checkLoginThrottle(LOCAL_SOURCE_KEY, now).allowed,
      true,
      'a success clears the per-source counter',
    );

    recordLoginFailure(LOCAL_SOURCE_KEY, now);

    assert.equal(
      checkLoginThrottle(LOCAL_SOURCE_KEY, now).allowed,
      false,
      'a success must not hand back a fresh global allowance',
    );
  }

  // 5d. Bucket exhaustion cannot evict an active lockout. With
  //     no trusted proxy every caller shares one key; even when
  //     many keys are tracked, a locked source keeps its bucket
  //     and the oldest unlocked ones are dropped instead.
  {
    resetLoginThrottle();

    for (let attempt = 0; attempt < LOGIN_MAX_ATTEMPTS; attempt += 1) {
      recordLoginFailure(LOCAL_SOURCE_KEY, now);
    }

    assert.equal(
      checkLoginThrottle(LOCAL_SOURCE_KEY, now).allowed,
      false,
      'the shared source is locked out',
    );

    for (let attempt = 0; attempt < 2_500; attempt += 1) {
      recordLoginFailure(`spam-${attempt}`, now);
    }

    assert.equal(
      isSourceTracked(LOCAL_SOURCE_KEY),
      true,
      'an active lockout must survive table pressure',
    );
    assert.equal(
      isSourceTracked('spam-0'),
      false,
      'the oldest unlocked source is evicted instead',
    );
    assert.equal(
      isSourceTracked('spam-2499'),
      true,
      'the newest sources are retained',
    );
    assert.equal(
      checkLoginThrottle(LOCAL_SOURCE_KEY, now).global,
      true,
      'after 2 500 failures the global ceiling is also engaged',
    );
  }

  // 5e. Concurrent failures at the same instant still stop at
  //     the limit: once locked, no further attempt is allowed.
  {
    resetLoginThrottle();

    const before = Array.from({ length: 50 }, () =>
      checkLoginThrottle(LOCAL_SOURCE_KEY, now),
    );

    assert.equal(
      before.every((decision) => decision.allowed),
      true,
    );

    for (let attempt = 0; attempt < LOGIN_MAX_ATTEMPTS; attempt += 1) {
      recordLoginFailure(LOCAL_SOURCE_KEY, now);
    }

    const after = Array.from({ length: 50 }, () =>
      checkLoginThrottle(LOCAL_SOURCE_KEY, now),
    );

    assert.equal(
      after.every((decision) => !decision.allowed),
      true,
      'no attempt may slip through after the limit is reached',
    );
    assert.ok(after.every((decision) => decision.remainingAttempts === 0));

    // Recovery: the lockout ends once the window has passed.
    assert.equal(
      checkLoginThrottle(LOCAL_SOURCE_KEY, now + 16 * 60 * 1000).allowed,
      true,
      'the source must recover once the window passes',
    );
  }

  resetLoginThrottle();

  // 6. Content type gating.
  assert.equal(isJsonContentType('application/json'), true);
  assert.equal(isJsonContentType('application/json; charset=utf-8'), true);
  assert.equal(isJsonContentType('text/plain'), false);
  assert.equal(isJsonContentType(null), false);

  // 7. A body that is not JSON is refused before it is parsed.
  {
    const request = new Request('http://127.0.0.1/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: '{"token":"x"}',
    });

    await assert.rejects(
      readJsonBody(request, MAX_LOGIN_BODY_BYTES),
      (error: unknown) => {
        assert.ok(error instanceof RequestBodyError);
        assert.equal(error.status, 415);
        return true;
      },
    );
  }

  // 8. A declared body larger than the limit is refused
  //    before it is read.
  {
    const request = new Request('http://127.0.0.1/api/workspace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(MAX_LOGIN_BODY_BYTES + 1),
      },
      body: '{}',
    });

    await assert.rejects(
      readJsonBody(request, MAX_LOGIN_BODY_BYTES),
      (error: unknown) => {
        assert.ok(error instanceof RequestBodyError);
        assert.equal(error.status, 413);
        return true;
      },
    );
  }

  // 9. A body that lies about its length is still capped while
  //    it is streamed.
  {
    const oversized = 'x'.repeat(MAX_LOGIN_BODY_BYTES + 1024);
    const request = new Request('http://127.0.0.1/api/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ detail: oversized }),
    });

    // The Request constructor sets an accurate Content-Length,
    // so remove it to exercise the streaming cap specifically.
    request.headers.delete('content-length');

    await assert.rejects(
      readJsonBody(request, MAX_LOGIN_BODY_BYTES),
      (error: unknown) => {
        assert.ok(error instanceof RequestBodyError);
        assert.equal(error.status, 413);
        return true;
      },
    );
  }

  // 10. A valid JSON body is parsed.
  {
    const request = new Request('http://127.0.0.1/api/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"type":"tasks","title":"A task"}',
    });

    assert.deepEqual(await readJsonBody(request, MAX_LOGIN_BODY_BYTES), {
      type: 'tasks',
      title: 'A task',
    });
  }

  // 11. A malformed JSON body is refused.
  {
    const request = new Request('http://127.0.0.1/api/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });

    await assert.rejects(
      readJsonBody(request, MAX_LOGIN_BODY_BYTES),
      (error: unknown) => {
        assert.ok(error instanceof RequestBodyError);
        assert.equal(error.status, 400);
        return true;
      },
    );
  }

  // 12. The session cookie is HTTP-only, SameSite=Strict and
  //     scoped to the application.
  {
    const cookie = buildSessionCookie('value', false);

    assert.ok(cookie.includes(`${SESSION_COOKIE_NAME}=value`));
    assert.ok(cookie.includes('HttpOnly'));
    assert.ok(cookie.includes('SameSite=Strict'));
    assert.ok(cookie.includes('Path=/'));
    assert.ok(!cookie.includes('Secure'), 'no Secure flag without HTTPS');

    const secureCookie = buildSessionCookie('value', true);

    assert.ok(secureCookie.includes('Secure'));

    const cleared = buildClearedSessionCookie(false);

    assert.ok(cleared.includes('Max-Age=0'));
    assert.ok(cleared.includes('HttpOnly'));
  }
}

main()
  .then(() => {
    console.log('✓ Security smoke test passed.');
    console.log('  Tokens compare in constant time; sessions are signed,');
    console.log('  expiring and HTTP-only; login is throttled; oversized');
    console.log('  and non-JSON bodies are refused before parsing.');
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    if (originalToken === undefined) {
      delete process.env[TOKEN_ENV];
    } else {
      process.env[TOKEN_ENV] = originalToken;
    }

    if (originalTtl === undefined) {
      delete process.env[TTL_ENV];
    } else {
      process.env[TTL_ENV] = originalTtl;
    }

    if (originalTrustedProxy === undefined) {
      delete process.env[TRUSTED_PROXY_ENV];
    } else {
      process.env[TRUSTED_PROXY_ENV] = originalTrustedProxy;
    }

    resetLoginThrottle();
  });
