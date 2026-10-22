import assert from 'node:assert/strict';

import {
  toActivity,
  toBusiness,
  toContact,
  toDeal,
  toProject,
  toTask,
} from './workspace-repository';

/**
 * Workspace mapping smoke test.
 *
 * Row → domain mapping is pure, so it is tested here without
 * a database and without any write.
 */

// 1. Business: description is omitted when null, preserved
//    when present.
{
  assert.deepEqual(
    toBusiness({
      id: 'b1',
      name: 'Acme',
      category: 'Trade',
      status: 'Active',
      description: null,
    }),
    {
      id: 'b1',
      name: 'Acme',
      category: 'Trade',
      status: 'Active',
    },
  );

  assert.equal(
    toBusiness({
      id: 'b2',
      name: 'Beta',
      category: 'Logistics',
      status: 'Planned',
      description: 'Noted',
    }).description,
    'Noted',
  );
}

// 2. Contact: optional channels are only present when set.
{
  const contact = toContact({
    id: 'c1',
    name: 'Ada',
    organization: 'Acme',
    role: 'Buyer',
    lastContact: 'Never',
    nextAction: 'Call',
    email: null,
    phone: null,
  });

  assert.deepEqual(contact, {
    id: 'c1',
    name: 'Ada',
    organization: 'Acme',
    role: 'Buyer',
    lastContact: 'Never',
    nextAction: 'Call',
  });
}

// 3. Deal: a missing business relation must never render as
//    an empty string; the domain expects 'Unassigned'.
{
  const unattached = toDeal({
    id: 'd1',
    name: 'Expansion',
    counterparty: 'Acme',
    value: 'TBD',
    stage: 'Qualification',
    probability: 10,
    health: 'Watch',
    nextAction: 'Qualify',
    risk: 'Incomplete',
    business: null,
  });

  assert.equal(unattached.business, 'Unassigned');

  const attached = toDeal({
    id: 'd2',
    name: 'Supply',
    counterparty: 'Beta',
    value: 'USD 10k',
    stage: 'Proposal',
    probability: 40,
    health: 'On track',
    nextAction: 'Send terms',
    risk: 'Timing',
    business: { name: 'Acme' },
  });

  assert.equal(attached.business, 'Acme');
  assert.equal(attached.health, 'On track');
}

// 4. Project: progress and health survive mapping.
{
  const project = toProject({
    id: 'p1',
    name: 'Warehouse',
    status: 'Building',
    progress: 35,
    health: 'Attention',
    blocker: 'Permit',
    business: { name: 'Acme' },
  });

  assert.equal(project.business, 'Acme');
  assert.equal(project.progress, 35);
  assert.equal(project.health, 'Attention');
}

// 5. Task and Activity map their enumerated string fields.
{
  assert.deepEqual(
    toTask({
      id: 't1',
      title: 'Call supplier',
      status: 'Open',
      priority: 'urgent',
      due: 'Today',
    }),
    {
      id: 't1',
      title: 'Call supplier',
      status: 'Open',
      priority: 'urgent',
      due: 'Today',
    },
  );

  assert.deepEqual(
    toActivity({
      id: 'a1',
      title: 'Deal updated',
      detail: 'Stage moved',
      time: '09:30',
      type: 'Deal',
    }),
    {
      id: 'a1',
      title: 'Deal updated',
      detail: 'Stage moved',
      time: '09:30',
      type: 'Deal',
    },
  );
}

console.log('✓ Workspace mapping smoke test passed.');
console.log('  Prisma rows map to domain records deterministically,');
console.log('  with missing relations rendered honestly.');
