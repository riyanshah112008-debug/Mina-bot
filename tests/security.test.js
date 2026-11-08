'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const store = require('../src/store');
const { isSuspiciousLink } = require('../src/security');

test('guild defaults enable baseline protection and verification is opt-in', () => {
  const cfg = store.defaults();
  assert.equal(cfg.enabled, true);
  assert.equal(cfg.antiNuke.enabled, true);
  assert.equal(cfg.antiRaid.enabled, true);
  assert.equal(cfg.automod.enabled, true);
  assert.equal(cfg.automod.linkFilter, true);
  assert.equal(cfg.verification.enabled, false);
  assert.deepEqual(cfg.trusted, []);
});

test('suspicious-link filter detects IP hosts and punycode domains', () => {
  assert.equal(isSuspiciousLink('click https://192.0.2.4/login', []), true);
  assert.equal(isSuspiciousLink('visit https://xn--pple-43d.com/account', []), true);
});

test('suspicious-link filter ignores ordinary and explicitly allowed domains', () => {
  assert.equal(isSuspiciousLink('https://example.com/news', []), false);
  assert.equal(isSuspiciousLink('https://bit.ly/short', ['bit.ly']), false);
  assert.equal(isSuspiciousLink('https://192.0.2.4/login', ['192.0.2.4']), false);
});

test('malformed links do not crash link inspection', () => {
  assert.equal(isSuspiciousLink('text https://[broken-url', []), false);
});
