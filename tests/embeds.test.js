'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { brandPayload, buildModerationEmbed } = require('../src/utils/embeds');

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

test('moderation actions use a structured Wick-inspired case embed', () => {
  const target = { id: '123456789012345678', tag: 'member#1234', displayAvatarURL: () => 'https://cdn.example/member.png' };
  const moderator = { id: '987654321098765432', tag: 'mod#1234', displayAvatarURL: () => 'https://cdn.example/mod.png' };
  const embed = buildModerationEmbed({
    action: 'kick', target, moderator, reason: 'Spam', caseId: 'ABC123', guild: { name: 'Test server' }
  });
  assert.equal(embed.data.author.name, 'Member Kicked');
  assert.equal(embed.data.color, 0xED4245);
  assert.match(embed.data.fields[0].value, /123456789012345678/);
  assert.match(embed.data.fields[1].value, /987654321098765432/);
  assert.equal(embed.data.fields[2].value, 'Spam');
  assert.match(embed.data.fields[3].value, /ABC123/);
  assert.match(embed.data.footer.text, /Test server.*NovaBot Moderation/);
  assert.ok(embed.data.timestamp);
});
