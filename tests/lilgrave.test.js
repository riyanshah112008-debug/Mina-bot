'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Lilgrave module exposes exactly the two requested setup commands', () => {
  const source = fs.readFileSync(require.resolve('../src/lilgrave'), 'utf8');
  assert.match(source, /setName\('punishment-setup'\)/);
  assert.match(source, /setName\('staff-leave-setup'\)/);
  assert.doesNotMatch(source, /setName\('(?:evidence|leave|punishment|staff-leave)'\)/);
});

test('punishment verification is fail-closed and only reacts after high-confidence positive analysis', () => {
  const source = fs.readFileSync(require.resolve('../src/lilgrave'), 'utf8');
  assert.match(source, /result\.verified === true && Number\(result\.confidence\) >= 0\.92/);
  assert.match(source, /if \(parts\.length === 1\) return/);
  assert.match(source, /leaving unverified/);
});

test('staff leave handler reacts directly without calling Gemini', async () => {
  const store = require('../src/store');
  const lilgrave = require('../src/lilgrave');
  const originalGet = store.get;
  let reactedWith = null;
  store.get = () => ({ lilgrave: { leave: { channelId: 'leave-channel', enabled: true } } });
  try {
    await lilgrave.handleStaffLeave({
      guildId: 'guild',
      channelId: 'leave-channel',
      react: async emoji => { reactedWith = emoji; }
    });
    assert.equal(reactedWith, '✅');
  } finally {
    store.get = originalGet;
  }
});

test('staff leave handler ignores disabled configuration and messages outside its channel', async () => {
  const store = require('../src/store');
  const lilgrave = require('../src/lilgrave');
  const originalGet = store.get;
  let reactionCount = 0;
  try {
    store.get = () => ({ lilgrave: { leave: { channelId: 'leave-channel', enabled: false } } });
    await lilgrave.handleStaffLeave({ guildId: 'guild', channelId: 'leave-channel', react: async () => { reactionCount++; } });
    store.get = () => ({ lilgrave: { leave: { channelId: 'leave-channel', enabled: true } } });
    await lilgrave.handleStaffLeave({ guildId: 'guild', channelId: 'other-channel', react: async () => { reactionCount++; } });
    assert.equal(reactionCount, 0);
  } finally {
    store.get = originalGet;
  }
});

test('Lilgrave defaults to a supported Gemini model and replaces retired Gemini 2.0 overrides', () => {
  const source = fs.readFileSync(require.resolve('../src/lilgrave'), 'utf8');
  assert.match(source, /process\.env\.GEMINI_MODEL \|\| 'gemini-3\.8-flash'/);
  assert.match(source, /retiredModels\.has\(configuredModel\) \? 'gemini-3\.8-flash'/);
  assert.match(source, /responseMimeType: 'application\/json'/);
});

test('enabling staff leave also enables the Lilgrave feature group', () => {
  const source = fs.readFileSync(require.resolve('../src/lilgrave'), 'utf8');
  assert.match(source, /if \(enabled\) cfg\.features\.lilgrave = true/);
});
