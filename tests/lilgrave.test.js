'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const lilgrave = require('../src/lilgrave');
const store = require('../src/store');

test('leave parser accepts explicit leave duration and rejects ordinary chat', () => {
  assert.equal(lilgrave.parseLeave('I want a leave for having fever I need a 2 day leave.').durationMs, 2 * 86400000);
  assert.equal(lilgrave.parseLeave('Bruh shush I am testing'), null);
  assert.equal(lilgrave.parseLeave('I need leave'), null);
});

test('leave setup exposes the management panel and return command', () => {
  const names = lilgrave.commands.map(command => command.name);
  assert.ok(names.includes('staff-leave-setup'));
  assert.ok(names.includes('leave-return'));
});

test('leave configuration defaults include role authority and persistent request tracking', () => {
  const cfg = store.defaults();
  assert.deepEqual(cfg.lilgrave.leave.authorityRoleIds, []);
  assert.deepEqual(cfg.lilgrave.leave.staffRoleIds, []);
  assert.deepEqual(cfg.lilgrave.leave.requests, []);
  assert.equal(cfg.lilgrave.leave.reminderHours, 12);
});

test('leave workflow supports approval, return reporting and deadline processing', () => {
  const source = require('node:fs').readFileSync(require.resolve('../src/lilgrave'), 'utf8');
  assert.match(source, /request\.status = decision/);
  assert.match(source, /request\.dueAt = Date\.now\(\) \+ request\.durationMs/);
  assert.match(source, /request\.status = 'returned'/);
  assert.match(source, /async function processDeadlines/);
  assert.match(source, /async function handleDemotionButton/);
});

test('leave request acknowledgement is a single-line reply and only follows a recognized duration request', () => {
  const source = require('node:fs').readFileSync(require.resolve('../src/lilgrave'), 'utf8');
  assert.match(source, /await message\.react\('✅'\)/);
  assert.match(source, /Leave request received — awaiting staff review\./);
  assert.match(source, /if \(!parsed\) return/);
  assert.match(source, /if \(await handleReply\(message\)\) return/);
});
