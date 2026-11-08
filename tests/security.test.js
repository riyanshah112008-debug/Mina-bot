'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const store = require('../src/store');

test('guild defaults enable baseline protection', () => {
  const cfg = store.defaults();
  assert.equal(cfg.enabled, true);
  assert.equal(cfg.antiNuke.enabled, true);
  assert.equal(cfg.antiRaid.enabled, true);
  assert.equal(cfg.automod.enabled, true);
  assert.deepEqual(cfg.trusted, []);
});
