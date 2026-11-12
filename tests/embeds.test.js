'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { brandPayload } = require('../src/utils/embeds');

test('plain command replies become branded NovaBot embeds', () => {
  const result = brandPayload({ content: 'Settings saved.', ephemeral: true });
  assert.equal(result.content, undefined);
  assert.equal(result.ephemeral, true);
  assert.equal(result.embeds.length, 1);
  assert.equal(result.embeds[0].data.title, 'NovaBot • Success');
  assert.match(result.embeds[0].data.footer.text, /NovaBot/);
});

test('error replies use the danger theme', () => {
  const result = brandPayload('❌ Missing permission.');
  assert.equal(result.embeds[0].data.color, 0xED4245);
});

test('existing embeds keep their content and receive the shared footer', () => {
  const result = brandPayload({ embeds: [{ title: 'Music Queue', description: 'Track A', color: 0x5865F2 }], components: [] });
  assert.equal(result.embeds[0].data.title, 'Music Queue');
  assert.equal(result.embeds[0].data.description, 'Track A');
  assert.match(result.embeds[0].data.footer.text, /NovaBot/);
  assert.deepEqual(result.components, []);
});
