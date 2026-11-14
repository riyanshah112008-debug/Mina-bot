'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { brandPayload } = require('../src/utils/embeds');

test('plain success replies become branded Mina Bot success embeds', () => {
  const result = brandPayload({ content: 'Settings saved.', ephemeral: true });
  assert.equal(result.content, undefined);
  assert.equal(result.ephemeral, true);
  assert.equal(result.embeds.length, 1);
  assert.equal(result.embeds[0].data.title, 'Mina Bot • Successful Operation');
  assert.match(result.embeds[0].data.footer.text, /Mina Bot/);
});

test('missing permissions use Wick-style red permission notice, not generic error', () => {
  const result = brandPayload({ content: 'Manage Messages permission required.', ephemeral: true });
  assert.equal(result.embeds[0].data.color, 0xED4245);
  assert.equal(result.embeds[0].data.title, 'Mina Bot • Permission Required');
  assert.match(result.embeds[0].data.description, /Manage Messages/);
});

test('role hierarchy notices are classified as missing permission requirements', () => {
  const result = brandPayload('Move Mina Bot role above the target member.');
  assert.equal(result.embeds[0].data.title, 'Mina Bot • Permission Required');
});

test('unrelated operation failures retain unsuccessful-operation wording', () => {
  const result = brandPayload('The operation failed because the user was not found.');
  assert.equal(result.embeds[0].data.title, 'Mina Bot • Unsuccessful Operation');
});

test('existing embeds keep their content and receive the shared footer', () => {
  const result = brandPayload({ embeds: [{ title: 'Music Queue', description: 'Track A', color: 0x5865F2 }], components: [] });
  assert.equal(result.embeds[0].data.title, 'Music Queue');
  assert.equal(result.embeds[0].data.description, 'Track A');
  assert.match(result.embeds[0].data.footer.text, /Mina Bot/);
  assert.deepEqual(result.components, []);
});
