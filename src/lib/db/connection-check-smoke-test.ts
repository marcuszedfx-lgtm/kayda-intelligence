import assert from 'node:assert/strict';

import {
  KAYDA_DB_PORT,
  evaluateConnectionTarget,
  getConfiguredPort,
} from './connection-check';

/**
 * Connection-check smoke test.
 *
 * Deterministic and side-effect free: every case here is
 * rejected before any connection is attempted, so no database
 * needs to exist. The `reachable` / `unreachable` paths are
 * deliberately not exercised here.
 */

const originalUrl = process.env.DATABASE_URL;

try {
  // 1. No DATABASE_URL is an honest state, not a failure.
  delete process.env.DATABASE_URL;

  assert.equal(getConfiguredPort(), undefined);

  {
    const target = evaluateConnectionTarget();
    assert.equal(target.allowed, false);
    assert.equal(target.result?.status, 'not_configured');
    assert.match(target.result?.detail ?? '', /DATABASE_URL is not set/);
  }

  // 2. Port 5432 — the trading platform — is refused, with no
  //    connection attempt.
  process.env.DATABASE_URL =
    'postgresql://kayda:secret@localhost:5432/kayda_intelligence';

  {
    const target = evaluateConnectionTarget();
    assert.equal(target.allowed, false);
    assert.equal(target.result?.status, 'refused_wrong_port');
    assert.equal(target.result?.port, '5432');
    assert.match(target.result?.detail ?? '', /reserved for the trading platform/);
    assert.ok(
      !JSON.stringify(target).includes('secret'),
      'the check must never echo credentials',
    );
  }

  // 3. A URL with no explicit port defaults to 5432 and is
  //    therefore refused too.
  process.env.DATABASE_URL =
    'postgresql://kayda:secret@localhost/kayda_intelligence';

  {
    const target = evaluateConnectionTarget();
    assert.equal(target.allowed, false);
    assert.equal(target.result?.status, 'refused_wrong_port');
    assert.equal(target.result?.port, '5432');
  }

  // 4. Any other port is refused as well.
  process.env.DATABASE_URL =
    'postgresql://kayda:secret@localhost:5544/kayda_intelligence';

  {
    const target = evaluateConnectionTarget();
    assert.equal(target.allowed, false);
    assert.equal(target.result?.status, 'refused_wrong_port');
    assert.match(target.result?.detail ?? '', /5544/);
  }

  // 5. Kayda's dedicated port is allowed through the guard.
  process.env.DATABASE_URL = `postgresql://kayda:secret@localhost:${KAYDA_DB_PORT}/kayda_intelligence`;

  assert.equal(getConfiguredPort(), KAYDA_DB_PORT);
  assert.equal(evaluateConnectionTarget().allowed, true);

  // 6. An unparseable URL is treated as not configured rather
  //    than crashing.
  process.env.DATABASE_URL = 'not-a-url';

  {
    const target = evaluateConnectionTarget();
    assert.equal(target.allowed, false);
    assert.equal(target.result?.status, 'not_configured');
  }

  console.log('✓ Database connection guard smoke test passed.');
  console.log('  Port 5432 (trading platform), portless URLs and');
  console.log('  unknown ports are refused; only 5433 is allowed.');
} finally {
  if (originalUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalUrl;
  }
}
