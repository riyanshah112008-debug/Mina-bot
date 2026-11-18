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
  assert.ok(names.includes('punishment-setup'));
  assert.equal(typeof lilgrave.verifyPunishment, 'function');
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
  assert.match(source, /active\.status = 'returned'/);
  assert.match(source, /async function processDeadlines/);
  assert.match(source, /async function handleDemotionButton/);
});

test('staff submit leave forms through a panel and reviewers approve or reject with buttons', () => {
  const source = require('node:fs').readFileSync(require.resolve('../src/lilgrave'), 'utf8');
  for (const expected of [
    'lilgrave_leave:post-panel',
    'lilgrave_leave:apply',
    'lilgrave_leave:application',
    'Reason for leave',
    'Start date (YYYY-MM-DD)',
    'How many days?',
    'lilgrave_leave:decision:approve:',
    'lilgrave_leave:decision:reject:',
    'Only configured reviewer roles can approve or reject',
    'request.dueAt = Math.max(Date.now(), request.startAt) + request.durationMs',
    'Your leave application has been submitted to the reviewers',
    'async function handleApplicationSubmit',
    'async function handleApplicationDecision'
  ]) assert.ok(source.includes(expected), 'Missing leave form behavior: ' + expected);
});
test('leave setup supports Discord channel and role pickers plus manual ID fallback', () => {
  const source = require('node:fs').readFileSync(require.resolve('../src/lilgrave'), 'utf8');
  const router = require('node:fs').readFileSync(require.resolve('../src/index'), 'utf8');
  assert.match(source, /new ChannelSelectMenuBuilder\(\)/);
  assert.match(source, /new RoleSelectMenuBuilder\(\)/);
  assert.match(source, /lilgrave_leave:select-authority/);
  assert.match(source, /lilgrave_leave:select-staff/);
  assert.match(source, /lilgrave_leave:select-demoted/);
  assert.match(source, /Leave channel ID/);
  assert.match(source, /Reviewer role IDs/);
  assert.match(router, /isChannelSelectMenu\(\) \|\| interaction\.isRoleSelectMenu\(\)/);
});
