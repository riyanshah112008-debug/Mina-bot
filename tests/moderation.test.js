'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novabot-moderation-'));
process.env.DATA_DIR = dataDir;
const moderation = require('../src/moderation');

test('warning cases are persisted and can be listed/cleared per member', () => {
  const first = moderation.addWarning('guild-a', 'member-a', 'mod-a', 'spam');
  moderation.addWarning('guild-a', 'member-b', 'mod-a', 'off-topic');
  assert.equal(first.id, 1);
  assert.equal(moderation.getWarnings('guild-a', 'member-a').length, 1);
  assert.equal(moderation.clearWarnings('guild-a', 'member-a', 'mod-b'), 1);
  assert.equal(moderation.getWarnings('guild-a', 'member-a').length, 0);
  assert.equal(moderation.getWarnings('guild-a', 'member-b').length, 1);
});

test('moderation hierarchy blocks owner and equal/higher roles', () => {
  const guild = { ownerId: 'owner' };
  const role = position => ({ highest: { position } });
  const bot = { roles: role(10) };
  const actor = { id: 'mod', roles: role(8) };
  const target = { id: 'member', guild, roles: role(4) };
  assert.equal(moderation.canActOnTarget(actor, target, bot).ok, true);
  assert.equal(moderation.canActOnTarget(actor, { ...target, roles: role(8) }, bot).ok, false);
  assert.equal(moderation.canActOnTarget(actor, { ...target, id: 'owner' }, bot).ok, false);
  assert.equal(moderation.canActOnTarget(actor, { ...target, roles: role(10) }, bot).ok, false);
});

test('warnings are isolated between guilds', () => {
  moderation.addWarning('guild-b', 'member-a', 'mod-a', 'test');
  assert.equal(moderation.getWarnings('guild-a', 'member-a').length, 0);
  assert.equal(moderation.getWarnings('guild-b', 'member-a').length, 1);
});
