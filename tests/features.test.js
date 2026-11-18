'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('feature control panel exposes one admin-only /features command', () => {
  const source = fs.readFileSync(require.resolve('../src/features'), 'utf8');
  assert.match(source, /setName\('features'\)/);
  assert.match(source, /setDefaultMemberPermissions\(PermissionFlagsBits\.Administrator\)/);
  assert.match(source, /disable_all/);
  assert.match(source, /enable_all/);
});

test('all supported feature groups have persistent default-on settings and command routing gates', () => {
  const store = fs.readFileSync(require.resolve('../src/store'), 'utf8');
  const index = fs.readFileSync(require.resolve('../src/index'), 'utf8');
  for (const key of ['security','verification','moderation','music','utilities','reminders','lilgrave']) {
    assert.match(store, new RegExp(key + ': true'));
  }
  assert.match(index, /features\.commandFeature/);
  assert.match(index, /features\.isEnabled/);
  assert.match(index, /features\.handleComponent/);
});
