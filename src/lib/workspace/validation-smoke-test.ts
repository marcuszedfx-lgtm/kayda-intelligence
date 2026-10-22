import assert from 'node:assert/strict';

import {
  MAX_DETAIL_LENGTH,
  MAX_IMPORT_RECORDS,
  MAX_TITLE_LENGTH,
  WorkspaceValidationError,
} from './types';
import {
  parseCreateWorkspaceInput,
  parseLegacyCollections,
} from './validation';

/**
 * Workspace validation smoke test.
 *
 * Deterministic and database-free: this exercises the layer
 * that decides whether a request may reach Prisma at all.
 */

function rejects(run: () => unknown, pattern: RegExp): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof WorkspaceValidationError);
    assert.match(error.message, pattern);
    return true;
  });
}

// 1. A minimal, valid task is accepted and trimmed.
{
  const input = parseCreateWorkspaceInput({
    type: 'tasks',
    title: '  Follow up with supplier  ',
  });

  assert.deepEqual(input, {
    type: 'tasks',
    title: 'Follow up with supplier',
    detail: '',
  });
}

// 2. Detail is optional, trimmed and preserved.
{
  const input = parseCreateWorkspaceInput({
    type: 'deals',
    title: 'Port expansion',
    detail: '  Awaiting counter-offer  ',
  });

  assert.equal(input.detail, 'Awaiting counter-offer');
}

// 3. Control characters cannot be stored verbatim.
{
  const input = parseCreateWorkspaceInput({
    type: 'contacts',
    title: 'A\u0000B\u001fC',
  });

  assert.equal(input.title, 'A B C');
}

// 4. Invalid shapes are rejected before any database call.
rejects(() => parseCreateWorkspaceInput(null), /JSON object/);
rejects(() => parseCreateWorkspaceInput([]), /JSON object/);
rejects(
  () => parseCreateWorkspaceInput({ type: 'signals', title: 'x' }),
  /must be one of/,
);
rejects(
  () => parseCreateWorkspaceInput({ type: 'tasks' }),
  /"title" must be a string/,
);
rejects(
  () => parseCreateWorkspaceInput({ type: 'tasks', title: '   ' }),
  /must not be empty/,
);
rejects(
  () =>
    parseCreateWorkspaceInput({
      type: 'tasks',
      title: 'x'.repeat(MAX_TITLE_LENGTH + 1),
    }),
  new RegExp(`at most ${MAX_TITLE_LENGTH}`),
);
rejects(
  () =>
    parseCreateWorkspaceInput({
      type: 'tasks',
      title: 'ok',
      detail: 42,
    }),
  /"detail" must be a string/,
);
rejects(
  () =>
    parseCreateWorkspaceInput({
      type: 'tasks',
      title: 'ok',
      detail: 'x'.repeat(MAX_DETAIL_LENGTH + 1),
    }),
  new RegExp(`at most ${MAX_DETAIL_LENGTH}`),
);

// 5. Legacy import accepts a partial snapshot, wrapped or raw.
{
  const raw = parseLegacyCollections({
    tasks: [{ id: 't1', title: 'Task' }],
  });

  assert.equal(raw.tasks.length, 1);
  assert.equal(raw.businesses.length, 0);

  const wrapped = parseLegacyCollections({
    state: { businesses: [{ id: 'b1', name: 'Acme' }] },
  });

  assert.equal(wrapped.businesses.length, 1);
}

// 6. `priorities` is ignored: there is no Priority model.
{
  const parsed = parseLegacyCollections({
    state: {
      priorities: [{ id: 'p1', title: 'Not importable' }],
    },
  });

  assert.deepEqual(Object.keys(parsed).sort(), [
    'activities',
    'businesses',
    'contacts',
    'deals',
    'projects',
    'tasks',
  ]);
}

// 7. Oversized or malformed legacy payloads are refused.
rejects(() => parseLegacyCollections('nope'), /JSON object/);
rejects(
  () => parseLegacyCollections({ tasks: 'not-an-array' }),
  /must be an array/,
);
rejects(
  () =>
    parseLegacyCollections({
      tasks: Array.from(
        { length: MAX_IMPORT_RECORDS + 1 },
        (_, index) => ({ id: `t${index}` }),
      ),
    }),
  new RegExp(`at most ${MAX_IMPORT_RECORDS}`),
);
rejects(
  () => parseLegacyCollections({ tasks: ['not-an-object'] }),
  /must be an object/,
);

console.log('✓ Workspace validation smoke test passed.');
console.log('  Valid payloads are trimmed; invalid, oversized and');
console.log('  control-character inputs are refused before Prisma.');
