import assert from 'node:assert/strict';

import {
  isTrustedProxyConfigured,
  readForwardedClientAddress,
  readForwardedProto,
  readTrustedForwardedHeader,
  requestScheme,
  TRUSTED_PROXY_ENV,
} from './trusted-proxy';

/**
 * Trusted-proxy smoke test.
 *
 * Deterministic and offline. It proves two things: that the gate
 * is OFF unless the operator turns it on, and that once on it
 * reads a forwarded header the way a single reverse proxy sets it
 * — rightmost value, `http` or `https` only.
 *
 * The env is passed explicitly, so nothing here depends on, or
 * disturbs, the process environment.
 */

const ON = { [TRUSTED_PROXY_ENV]: '1' };

function requestWith(headers: Record<string, string>): Request {
  return new Request('http://127.0.0.1:3102/api/auth/login', {
    method: 'POST',
    headers,
  });
}

// 1. The gate is off unless it is explicitly switched on.
{
  assert.equal(isTrustedProxyConfigured({}), false);
  assert.equal(isTrustedProxyConfigured({ [TRUSTED_PROXY_ENV]: '' }), false);
  assert.equal(isTrustedProxyConfigured({ [TRUSTED_PROXY_ENV]: '0' }), false);
  assert.equal(isTrustedProxyConfigured({ [TRUSTED_PROXY_ENV]: 'no' }), false);
  assert.equal(
    isTrustedProxyConfigured({ [TRUSTED_PROXY_ENV]: 'trueish' }),
    false,
  );

  for (const value of ['1', 'true', 'TRUE', 'Yes', 'on', ' ON ']) {
    assert.equal(
      isTrustedProxyConfigured({ [TRUSTED_PROXY_ENV]: value }),
      true,
      `"${value}" must switch proxy trust on`,
    );
  }
}

// 2. With no proxy trusted, forwarded headers are ignored — this
//    is the default deployment, where the client typed them.
{
  const request = requestWith({
    'x-forwarded-proto': 'https',
    'x-forwarded-for': '203.0.113.9',
  });

  assert.equal(readForwardedProto(request, {}), undefined);
  assert.equal(readForwardedClientAddress(request, {}), undefined);
  assert.equal(
    readTrustedForwardedHeader(request, 'x-forwarded-proto', {}),
    undefined,
  );
}

// 3. With a proxy trusted, only `http` or `https` is accepted,
//    and the rightmost value wins — that is the one the proxy
//    appended after anything the client sent.
{
  assert.equal(
    readForwardedProto(
      requestWith({ 'x-forwarded-proto': 'https' }),
      ON,
    ),
    'https',
  );
  assert.equal(
    readForwardedProto(requestWith({ 'x-forwarded-proto': 'http' }), ON),
    'http',
  );
  assert.equal(
    readForwardedProto(
      requestWith({ 'x-forwarded-proto': 'HTTPS' }),
      ON,
    ),
    'https',
    'the value is case-insensitive',
  );
  assert.equal(
    readForwardedProto(
      requestWith({ 'x-forwarded-proto': 'http, https' }),
      ON,
    ),
    'https',
    'a proxy that appends after a client value must win',
  );
  assert.equal(
    readForwardedProto(
      requestWith({ 'x-forwarded-proto': 'https, garbage' }),
      ON,
    ),
    undefined,
    'a garbage last value is ignored, never trusted',
  );
  assert.equal(
    readForwardedProto(
      requestWith({ 'x-forwarded-proto': 'javascript' }),
      ON,
    ),
    undefined,
  );
  assert.equal(
    readForwardedProto(requestWith({}), ON),
    undefined,
    'an absent header falls back to the connection',
  );
}

// 4. The client address is only read behind a trusted proxy, and
//    is truncated so a huge header cannot become a huge key.
{
  assert.equal(
    readForwardedClientAddress(
      requestWith({ 'x-forwarded-for': '203.0.113.9' }),
      {},
    ),
    undefined,
  );
  assert.equal(
    readForwardedClientAddress(
      requestWith({ 'x-forwarded-for': '198.51.100.4, 203.0.113.9' }),
      ON,
    ),
    '203.0.113.9',
    'the rightmost (proxy-observed) address is the key',
  );
  assert.equal(
    readForwardedClientAddress(
      requestWith({ 'x-forwarded-for': `  ${'a'.repeat(500)}  ` }),
      ON,
    )?.length,
    128,
  );
  assert.equal(
    readForwardedClientAddress(requestWith({ 'x-forwarded-for': ' , ' }), ON),
    undefined,
  );
}

// 5. `requestScheme` decides the scheme through the same trust
//    gate, and never through `request.url`. Next.js rebuilds that
//    URL from `X-Forwarded-Proto` whenever the header is present,
//    so a spoofed header would otherwise move both the `Secure`
//    cookie flag and the origin comparison on state-changing
//    requests. With no proxy trusted it must not move either.
{
  // The URL as Next reports it after folding in the client's
  // own header — the shape a spoofed request really arrives in.
  const nextFolded = new Request(
    'https://127.0.0.1:3102/api/auth/login',
    { method: 'POST', headers: { 'x-forwarded-proto': 'https' } },
  );

  assert.equal(
    requestScheme(nextFolded, {}),
    'http:',
    'an untrusted X-Forwarded-Proto must not change the scheme',
  );
  assert.equal(
    requestScheme(requestWith({}), {}),
    'http:',
    'plain-HTTP loopback stays plain',
  );
  assert.equal(
    requestScheme(
      new Request('https://127.0.0.1:3102/api/auth/login', { method: 'POST' }),
      {},
    ),
    'https:',
    'a direct TLS connection needs no header to be recognised',
  );
  assert.equal(
    requestScheme(nextFolded, ON),
    'https:',
    'a trusted proxy may report https',
  );
  assert.equal(
    requestScheme(requestWith({ 'x-forwarded-proto': 'http' }), ON),
    'http:',
    'a trusted proxy may report plain http',
  );
  assert.equal(
    requestScheme(
      requestWith({ 'x-forwarded-proto': 'javascript' }),
      ON,
    ),
    'http:',
    'a malformed value falls back to the connection, never to the claim',
  );
}

console.log('✓ Trusted-proxy smoke test passed.');
console.log('  Forwarded headers are ignored unless a proxy is trusted,');
console.log('  and only a well-formed http/https scheme is ever honoured.');
