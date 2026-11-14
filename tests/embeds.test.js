'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { brandPayload, classify } = require('../src/utils/embeds');

test('ordinary success replies become branded Mina embeds', () => {
  const result = brandPayload({ content: 'Settings saved.', ephemeral: true });
  assert.equal(result.content, undefined);
  assert.equal(result.ephemeral, true);
  assert.equal(result.embeds.length, 1);
  assert.equal(result.embeds[0].data.title, 'Successful Operation!');
  assert.match(result.embeds[0].data.footer.text, /Mina/);
});

test('permission-denied notices use Wick-style unsuccessful operation title', () => {
  const result = brandPayload('Mina is missing Manage Messages permission.');
  assert.equal(result.embeds[0].data.title, 'Unsuccessful Operation!');
  assert.equal(result.embeds[0].data.color, 0xED4245);
  assert.match(result.embeds[0].data.description, /Manage Messages/);
});

test('Discord missing-permission API codes are classified as permission notices', () => {
  assert.equal(classify('Discord API error 50013 Missing Permissions').kind, 'permission');
  assert.equal(classify('Missing Access (50001)').kind, 'permission');
});

test('generic operational failures are not mislabeled as permission failures', () => {
  const result = brandPayload('The request failed because the supplied ID is invalid.');
  assert.equal(result.embeds[0].data.title, 'Mina • Operation Failed');
});

test('existing embeds keep their content and receive the shared footer', () => {
  const result = brandPayload({ embeds: [{ title: 'Music Queue', description: 'Track A', color: 0x5865F2 }], components: [] });
  assert.equal(result.embeds[0].data.title, 'Music Queue');
  assert.equal(result.embeds[0].data.description, 'Track A');
  assert.match(result.embeds[0].data.footer.text, /Mina/);
  assert.deepEqual(result.components, []);
});
