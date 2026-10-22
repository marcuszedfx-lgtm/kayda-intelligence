import assert from 'node:assert/strict';

import {
  assertAllowedDatabaseTarget,
  DatabaseTargetError,
  evaluateDatabaseTarget,
  FORBIDDEN_DB_PORT,
  KAYDA_DB_PORT,
} from './port-guard';

/**
 * Database target guard smoke test.
 *
 * Deterministic and side-effect free: every case is decided
 * before any socket could be opened, so no database needs to
 * exist and the trading platform on port 5432 is never
 * contacted.
 */

const originalUrl = process.env.DATABASE_URL;
const originalHosts = process.env.KAYDA_ALLOWED_DB_HOSTS;

try {
  // 1. No DATABASE_URL is an honest state, not a failure.
  delete process.env.DATABASE_URL;

  {
    const target = evaluateDatabaseTarget();

    assert.equal(target.allowed, false);
    assert.equal(target.status, 'not_configured');
    assert.match(target.detail, /DATABASE_URL is not set/);
  }

  // 2. Port 5432 — the trading platform — is refused.
  process.env.DATABASE_URL =
    'postgresql://kayda:secret@localhost:5432/kayda_intelligence';

  {
    const target = evaluateDatabaseTarget();

    assert.equal(target.allowed, false);
    assert.equal(target.status, 'refused_wrong_port');
    assert.equal(target.port, FORBIDDEN_DB_PORT);
    assert.match(target.detail, /reserved for the trading platform/);
    assert.ok(
      !JSON.stringify(target).includes('secret'),
      'the guard must never echo credentials',
    );
  }

  // 3. A URL with no explicit port defaults to 5432 and is
  //    therefore refused too.
  process.env.DATABASE_URL =
    'postgresql://kayda:secret@localhost/kayda_intelligence';

  {
    const target = evaluateDatabaseTarget();

    assert.equal(target.allowed, false);
    assert.equal(target.status, 'refused_wrong_port');
    assert.equal(target.port, FORBIDDEN_DB_PORT);
  }

  // 4. Any other port is refused as well.
  process.env.DATABASE_URL =
    'postgresql://kayda:secret@localhost:5544/kayda_intelligence';

  {
    const target = evaluateDatabaseTarget();

    assert.equal(target.allowed, false);
    assert.equal(target.status, 'refused_wrong_port');
    assert.match(target.detail, /5544/);
  }

  // 5. Kayda's dedicated port on a local host is allowed.
  process.env.DATABASE_URL = `postgresql://kayda:secret@localhost:${KAYDA_DB_PORT}/kayda_intelligence`;

  {
    const target = evaluateDatabaseTarget();

    assert.equal(target.allowed, true);
    assert.equal(target.status, 'allowed');
    assert.equal(target.port, KAYDA_DB_PORT);
    assert.equal(
      assertAllowedDatabaseTarget().port,
      KAYDA_DB_PORT,
      'the validated URL must be handed to Prisma',
    );
  }

  // 6. A non-local host is refused, even on the right port.
  process.env.DATABASE_URL = `postgresql://kayda:secret@db.internal:${KAYDA_DB_PORT}/kayda_intelligence`;

  {
    const target = evaluateDatabaseTarget();

    assert.equal(target.allowed, false);
    assert.equal(target.status, 'refused_wrong_host');
    assert.match(target.detail, /db\.internal/);
  }

  // 7. ...unless it is explicitly allowed.
  process.env.KAYDA_ALLOWED_DB_HOSTS = 'db.internal';

  {
    const target = evaluateDatabaseTarget();

    assert.equal(target.allowed, true);
    assert.equal(target.status, 'allowed');
  }

  delete process.env.KAYDA_ALLOWED_DB_HOSTS;

  // 8. The assertion used by the Prisma client creation path
  //    refuses a disallowed target loudly, with no socket.
  process.env.DATABASE_URL =
    'postgresql://kayda:secret@localhost:5432/kayda_intelligence';

  assert.throws(
    () => assertAllowedDatabaseTarget(),
    (error: unknown) => {
      assert.ok(error instanceof DatabaseTargetError);
      assert.equal(error.status, 'refused_wrong_port');
      assert.match(error.message, /reserved for the trading platform/);
      assert.ok(
        !error.message.includes('secret'),
        'the error must never echo credentials',
      );
      return true;
    },
  );

  console.log('✓ Database target guard smoke test passed.');
  console.log('  Port 5432 (trading platform), portless URLs, unknown');
  console.log('  ports and non-local hosts are refused; only 5433 on a');
  console.log('  local host is allowed.');
} finally {
  if (originalUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalUrl;
  }

  if (originalHosts === undefined) {
    delete process.env.KAYDA_ALLOWED_DB_HOSTS;
  } else {
    process.env.KAYDA_ALLOWED_DB_HOSTS = originalHosts;
  }
}
