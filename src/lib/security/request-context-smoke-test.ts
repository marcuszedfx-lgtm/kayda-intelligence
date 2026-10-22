import assert from 'node:assert/strict';

import {
  APP_PORT_ENV,
  evaluateOrigin as evaluateOriginWithHost,
  getExpectedAppPort,
  isAllowedHostHeader,
  isAllowedHostname,
  isStateChangingMethod,
  parseEffectiveOrigin,
  parseHostHeader,
  requestEffectiveOrigin,
} from './request-context';

/**
 * Runs the origin check for a request to `url`, supplying the
 * scheme and `Host` header a browser would send for that URL.
 * Every case below is therefore one coherent request in which
 * the URL, scheme and Host header agree — which is how a browser
 * issues them.
 *
 * The cases that matter when they disagree use
 * `evaluateOriginWithHost` directly and are marked as such.
 */
function evaluateOrigin(
  originHeader: string | null,
  url: string,
  extraAllowedHosts: string[] = [],
) {
  let scheme = 'http:';
  let host: string | null = null;

  try {
    const parsed = new URL(url);

    scheme = parsed.protocol;
    host = parsed.host || null;
  } catch {
    host = null;
  }

  return evaluateOriginWithHost(originHeader, scheme, host, extraAllowedHosts);
}

/**
 * Request-context smoke test.
 *
 * Deterministic and offline: it covers the Host and Origin
 * decisions that stand between an untrusted website and the
 * workspace. No server, no database, no network.
 *
 * The Origin section is the regression suite for the M1 fix: an
 * origin that omits its port used to be compared by hostname
 * alone and silently accepted against an application on a
 * non-default port. Every shape of that gap is asserted here.
 */

// 1. Host headers are parsed into hostname and port.
{
  assert.deepEqual(parseHostHeader('localhost:3100'), {
    hostname: 'localhost',
    port: '3100',
  });
  assert.deepEqual(parseHostHeader('127.0.0.1:3100'), {
    hostname: '127.0.0.1',
    port: '3100',
  });
  assert.deepEqual(parseHostHeader('localhost'), {
    hostname: 'localhost',
  });
  assert.deepEqual(parseHostHeader('[::1]:3100'), {
    hostname: '::1',
    port: '3100',
  });
  assert.equal(parseHostHeader(null), null);
  assert.equal(parseHostHeader(''), null);
  assert.equal(
    parseHostHeader('::1'),
    null,
    'an unbracketed IPv6 literal is malformed in a Host header',
  );
  assert.equal(parseHostHeader('[::1'), null);
}

// 2. Only local hosts are allowed, unless explicitly listed.
{
  assert.equal(isAllowedHostname('localhost'), true);
  assert.equal(isAllowedHostname('127.0.0.1'), true);
  assert.equal(isAllowedHostname('::1'), true);
  assert.equal(isAllowedHostname('attacker.example'), false);
  assert.equal(isAllowedHostname('192.168.1.77'), false);
  assert.equal(isAllowedHostname('localhost.evil.com'), false);
  assert.equal(
    isAllowedHostname('kayda.internal', ['kayda.internal']),
    true,
    'an explicitly allowed host is accepted',
  );

  assert.equal(isAllowedHostHeader('localhost:3100'), true);
  assert.equal(isAllowedHostHeader('127.0.0.1:3100'), true);
  assert.equal(isAllowedHostHeader('attacker.example:3100'), false);
  assert.equal(isAllowedHostHeader('192.168.1.77:3100'), false);
  assert.equal(isAllowedHostHeader(null), false);
}

// 3. State-changing methods are identified.
{
  assert.equal(isStateChangingMethod('POST'), true);
  assert.equal(isStateChangingMethod('put'), true);
  assert.equal(isStateChangingMethod('PATCH'), true);
  assert.equal(isStateChangingMethod('DELETE'), true);
  assert.equal(isStateChangingMethod('GET'), false);
  assert.equal(isStateChangingMethod('HEAD'), false);
  assert.equal(isStateChangingMethod('OPTIONS'), false);
}

// 4. Origins resolve to an EFFECTIVE port: an origin that names
//    no port means 80 or 443, never "whatever the app is on".
{
  assert.deepEqual(parseEffectiveOrigin('http://localhost'), {
    scheme: 'http:',
    hostname: 'localhost',
    port: '80',
  });
  assert.deepEqual(parseEffectiveOrigin('https://localhost'), {
    scheme: 'https:',
    hostname: 'localhost',
    port: '443',
  });
  assert.deepEqual(parseEffectiveOrigin('http://localhost:3102'), {
    scheme: 'http:',
    hostname: 'localhost',
    port: '3102',
  });
  assert.deepEqual(
    parseEffectiveOrigin('http://localhost:80'),
    { scheme: 'http:', hostname: 'localhost', port: '80' },
    'an explicit default port resolves to itself',
  );
  assert.deepEqual(parseEffectiveOrigin('https://[::1]:3102'), {
    scheme: 'https:',
    hostname: '::1',
    port: '3102',
  });
  assert.equal(parseEffectiveOrigin('file:///etc/passwd'), null);
  assert.equal(parseEffectiveOrigin('not a url'), null);
  assert.equal(parseEffectiveOrigin(''), null);
}

// 5. A same-origin request is allowed — the deployment's real
//    shape: 127.0.0.1:3102 and localhost:3102.
{
  assert.equal(
    evaluateOrigin('http://127.0.0.1:3102', 'http://127.0.0.1:3102/workspace')
      .allowed,
    true,
  );
  assert.equal(
    evaluateOrigin(
      'http://localhost:3102',
      'http://localhost:3102/api/workspace',
    ).allowed,
    true,
  );
  assert.equal(
    evaluateOrigin('http://localhost:3102', 'http://localhost:3102/').allowed,
    true,
  );
}

// 6. THE M1 REGRESSION. An origin that omits its port is on the
//    default port — 80 — so it can never be this application on
//    3102, no matter that the hostname matches.
{
  const verdict = evaluateOrigin(
    'http://127.0.0.1',
    'http://127.0.0.1:3102/api/workspace',
  );

  assert.equal(verdict.allowed, false);
  assert.ok(!('reason' in verdict) || verdict.reason.length > 0);

  assert.equal(
    evaluateOrigin('http://localhost', 'http://localhost:3102/api/workspace')
      .allowed,
    false,
    'the localhost shape of the same gap must also be refused',
  );

  assert.equal(
    evaluateOrigin('https://127.0.0.1', 'https://127.0.0.1:3102/api/workspace')
      .allowed,
    false,
    'the gap exists over https too',
  );
}

// 7. When both sides really are on the default port, they match.
{
  assert.equal(
    evaluateOrigin('http://localhost', 'http://localhost/api/workspace').allowed,
    true,
    'a default-port origin matches a default-port request',
  );
}

// 8. An explicit port mismatch is refused.
{
  assert.equal(
    evaluateOrigin('http://localhost:9999', 'http://localhost:3100/api/workspace')
      .allowed,
    false,
  );
  assert.equal(
    evaluateOrigin(
      'http://localhost:3102',
      'http://localhost:3103/api/workspace',
    ).allowed,
    false,
  );
}

// 9. A scheme mismatch is refused: an https origin is not this
//    plain-HTTP application, even on the same host and port.
{
  assert.equal(
    evaluateOrigin('https://127.0.0.1:3102', 'http://127.0.0.1:3102/api/workspace')
      .allowed,
    false,
  );
  assert.equal(
    evaluateOrigin('http://127.0.0.1:3102', 'https://127.0.0.1:3102/api/workspace')
      .allowed,
    false,
  );
}

// 10. A foreign origin is refused.
{
  const verdict = evaluateOrigin(
    'http://attacker.example',
    'http://localhost:3100/api/workspace',
  );

  assert.equal(verdict.allowed, false);
  assert.ok(!('reason' in verdict) || verdict.reason.length > 0);
}

// 11. A local origin that does not match the request host is
//     refused: same machine, different origin.
{
  assert.equal(
    evaluateOrigin(
      'http://127.0.0.1:3100',
      'http://localhost:3100/api/workspace',
    ).allowed,
    false,
  );
}

// 12. An opaque origin is refused.
{
  assert.equal(
    evaluateOrigin('null', 'http://localhost:3100/api/workspace').allowed,
    false,
  );
}

// 13. A non-http scheme is refused.
{
  assert.equal(
    evaluateOrigin(
      'file:///etc/passwd',
      'http://localhost:3100/api/workspace',
    ).allowed,
    false,
  );
}

// 14. A malformed origin is refused.
{
  assert.equal(
    evaluateOrigin('not a url', 'http://localhost:3100/api/workspace').allowed,
    false,
  );
}

// 15. A request with no Origin header is REFUSED. Every browser
//     sends Origin on POST/PUT/PATCH/DELETE, including for
//     same-origin requests, so normal operation is unaffected.
{
  assert.equal(
    evaluateOrigin(null, 'http://localhost:3100/api/workspace').allowed,
    false,
  );
  assert.equal(
    evaluateOrigin('', 'http://localhost:3100/api/workspace').allowed,
    false,
  );
  assert.equal(
    evaluateOrigin('   ', 'http://localhost:3100/api/workspace').allowed,
    false,
  );
}

// 16. A request whose own origin cannot be determined is refused.
{
  assert.equal(evaluateOrigin('http://localhost:3100', 'not-a-url').allowed, false);
  assert.equal(evaluateOrigin('http://localhost:3100', '').allowed, false);
  assert.equal(
    evaluateOrigin('http://localhost:3100', 'file:///etc/passwd').allowed,
    false,
  );
}

// 17. A request that does not arrive on a local host is refused
//     even if its Origin agrees — defence in depth behind the
//     Host check in the proxy.
{
  assert.equal(
    evaluateOrigin(
      'http://kayda.example:3100',
      'http://kayda.example:3100/api/workspace',
    ).allowed,
    false,
  );
}

// 18. KAYDA_APP_PORT pins the port. Unset it does nothing; a
//     value that is not a number is ignored rather than fatal.
{
  const original = process.env[APP_PORT_ENV];

  try {
    delete process.env[APP_PORT_ENV];

    assert.equal(getExpectedAppPort(), undefined);
    assert.equal(
      evaluateOrigin('http://localhost:3102', 'http://localhost:3102/api/workspace')
        .allowed,
      true,
    );

    process.env[APP_PORT_ENV] = '3102';

    assert.equal(getExpectedAppPort(), '3102');
    assert.equal(
      evaluateOrigin('http://localhost:3102', 'http://localhost:3102/api/workspace')
        .allowed,
      true,
      'a pinned port that matches is accepted',
    );
    assert.equal(
      evaluateOrigin('http://localhost:9999', 'http://localhost:9999/api/workspace')
        .allowed,
      false,
      'a request and origin that agree on a non-application port are still refused',
    );

    process.env[APP_PORT_ENV] = 'not-a-number';

    assert.equal(getExpectedAppPort(), undefined);
    assert.equal(
      evaluateOrigin('http://localhost:3102', 'http://localhost:3102/api/workspace')
        .allowed,
      true,
      'a malformed pin must not lock the operator out',
    );
  } finally {
    if (original === undefined) {
      delete process.env[APP_PORT_ENV];
    } else {
      process.env[APP_PORT_ENV] = original;
    }
  }
}

// 19. Next.js rewrites every loopback hostname in `request.url`
//     to `localhost` (NextURL normalises 127.0.0.1 and ::1), so
//     the URL alone reports `localhost:3102` for a request the
//     browser addressed to `127.0.0.1:3102`. Identity therefore
//     comes from the Host header: the operator's own request
//     over 127.0.0.1 is accepted, and a request whose Host names
//     a different origin than its Origin is refused.
{
  assert.equal(
    evaluateOriginWithHost(
      'http://127.0.0.1:3102',
      'http:',
      '127.0.0.1:3102',
    ).allowed,
    true,
    'a NextURL-normalised URL must not refuse the operator over 127.0.0.1',
  );

  assert.equal(
    evaluateOriginWithHost(
      'http://[::1]:3102',
      'http:',
      '[::1]:3102',
    ).allowed,
    true,
    'the same holds for the IPv6 loopback',
  );

  assert.equal(
    evaluateOriginWithHost(
      'http://localhost:3102',
      'http:',
      '127.0.0.1:3102',
    ).allowed,
    false,
    'an Origin naming a different loopback alias than the Host is a different origin',
  );

  assert.equal(
    evaluateOriginWithHost(
      'http://localhost:3102',
      'http:',
      null,
    ).allowed,
    false,
    'a request with no Host header has no origin to match against',
  );
}

// 20. `requestEffectiveOrigin` takes the scheme the request
//     arrived with and the identity from the Host header,
//     resolving the default port for whatever scheme it was
//     given.
{
  assert.deepEqual(
    requestEffectiveOrigin('http:', 'localhost:3102'),
    { scheme: 'http:', hostname: 'localhost', port: '3102' },
  );
  assert.deepEqual(
    requestEffectiveOrigin('http:', 'localhost'),
    { scheme: 'http:', hostname: 'localhost', port: '80' },
  );
  assert.deepEqual(
    requestEffectiveOrigin('https:', 'localhost'),
    { scheme: 'https:', hostname: 'localhost', port: '443' },
  );
  assert.deepEqual(
    requestEffectiveOrigin('http:', '[::1]:3102'),
    { scheme: 'http:', hostname: '::1', port: '3102' },
    'the Host header supplies the identity even for IPv6',
  );
  assert.equal(requestEffectiveOrigin('http:', null), null);
  assert.equal(requestEffectiveOrigin('http:', ''), null);
  assert.equal(
    requestEffectiveOrigin('file:', 'localhost:3102'),
    null,
    'a non-http scheme names no origin',
  );
  assert.equal(requestEffectiveOrigin('gopher:', 'localhost:3102'), null);
}

console.log('✓ Request context smoke test passed.');
console.log('  Foreign Host values and cross-origin writes are refused;');
console.log('  only local hosts and this exact origin are accepted.');
