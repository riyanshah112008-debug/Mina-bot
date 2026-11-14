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

test('permission updates that mention permissions remain successful', () => {
  assert.equal(classify('Permissions updated successfully').kind, 'success');
  const result = brandPayload('Permissions updated successfully');
  assert.equal(result.embeds[0].data.title, 'Successful Operation!');
});

test('explicit failure indicators take precedence over success keywords', () => {
  const result = brandPayload('❌ Could not set slowmode.');
  assert.equal(result.embeds[0].data.title, 'Mina • Operation Failed');
  assert.equal(classify('❌ Could not set slowmode.').kind, 'failure');
});

test('Discord missing-permission API codes are classified as permission notices', () => {
  assert.equal(classify('Discord API error 50013 Missing Permissions').kind, 'permission');
  assert.equal(classify('Missing Access (50001)').kind, 'permission');
  assert.equal(classify('You do not have the required permissions').kind, 'notice');
  assert.equal(classify('Manage Messages permission denied').kind, 'permission');
});

test('generic operational failures are not mislabeled as permission failures', () => {
  const result = brandPayload('The request failed because the supplied ID is invalid.');
  assert.equal(result.embeds[0].data.title, 'Mina • Operation Failed');
});

test('permission guidance stays within Discord description limit near the boundary', () => {
  const source = 'Missing permissions: ' + 'x'.repeat(4080);
  const result = brandPayload(source);
  const description = result.embeds[0].data.description;
  assert.ok(description.length <= 4096);
  assert.match(description, /\*\*Required:\*\*/);
  assert.match(description, /channel-specific permission overrides/);
});

test('existing embeds keep their content and receive the shared footer', () => {
  const result = brandPayload({ embeds: [{ title: 'Music Queue', description: 'Track A', color: 0x5865F2 }], components: [] });
  assert.equal(result.embeds[0].data.title, 'Music Queue');
  assert.equal(result.embeds[0].data.description, 'Track A');
  assert.match(result.embeds[0].data.footer.text, /Mina/);
  assert.deepEqual(result.components, []);
});
