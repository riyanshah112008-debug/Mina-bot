'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { moderationCaseEmbed } = require('../src/commands');

test('moderation result follows Wick-style layout and emoji labels', () => {
  const embed = moderationCaseEmbed({
    action: 'kick',
    target: { id: '12345678901234567', user: { id: '12345678901234567', tag: 'Member#0001' } },
    moderator: { id: '22345678901234567', tag: 'Mod#0001' },
    reason: 'Repeated spam',
    guild: { name: 'Test Server', iconURL: () => 'https://example.com/icon.png' }
  });
  const data = embed.toJSON();
  assert.equal(data.title, 'Kick result:');
  assert.match(data.author.name, /Test Server ★ •\\nModeration/);
  assert.match(data.description, /📋 \\*\\*Reason:\\*\\* Repeated spam/);
  assert.match(data.description, /👤 \\*\\*Moderator:\\*\\* <@22345678901234567>/);
  assert.match(data.description, /✅ \\*\\*Successful kicks\\*\\*/);
  assert.match(data.description, /▶️ <@12345678901234567>/);
  assert.match(data.description, /❌ \\*\\*Unsuccessful kicks\\*\\*/);
  assert.match(data.footer.text, /Mina Moderation • 12345678901234567/);
});
