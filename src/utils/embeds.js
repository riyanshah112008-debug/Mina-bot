'use strict';
const { EmbedBuilder } = require('discord.js');

const COLORS = Object.freeze({ primary: 0x5865F2, success: 0x57F287, warning: 0xFEE75C, danger: 0xED4245 });
const FOOTER = 'Mina • Server Management';

// Wick-style red notices represent an operation blocked by Discord permissions,
// not an internal application crash. Keep the reason visible and actionable.
function classify(message) {
  const value = String(message || '');
  if (/permission|missing access|50013|50001|not authorized|not authorised/i.test(value)) {
    return { title: 'Unsuccessful Operation!', color: COLORS.danger, kind: 'permission' };
  }
  if (/\b(warning|注意)\b/i.test(value) || /[⚠️🚨]/u.test(value)) {
    return { title: 'Mina • Warning', color: COLORS.warning, kind: 'warning' };
  }
  if (/\b(success|enabled|disabled|saved|updated|completed|joined|paused|resumed|skipped|stopped|cancelled|set|purged|banned|kicked|timed out|unbanned)\b|[✅🎉🔓🔒]/i.test(value)) {
    return { title: 'Successful Operation!', color: COLORS.success, kind: 'success' };
  }
  if (/\b(error|failed|exception|could not|invalid)\b|[❌🛑]/i.test(value)) {
    return { title: 'Mina • Operation Failed', color: COLORS.danger, kind: 'failure' };
  }
  return { title: 'Mina • Notice', color: COLORS.primary, kind: 'notice' };
}

function brandEmbed(embed) {
  const result = EmbedBuilder.from(embed);
  const current = result.data.footer?.text;
  result.setFooter({ text: current ? current + ' • ' + FOOTER : FOOTER });
  if (!result.data.timestamp) result.setTimestamp();
  if (!result.data.color) result.setColor(COLORS.primary);
  return result;
}

function brandPayload(payload) {
  if (typeof payload === 'string') payload = { content: payload };
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  const next = { ...payload };
  if (Array.isArray(next.embeds) && next.embeds.length) next.embeds = next.embeds.map(brandEmbed);
  if (typeof next.content === 'string' && next.content.trim()) {
    const status = classify(next.content);
    let description = next.content.length > 4096 ? next.content.slice(0, 4093) + '...' : next.content;
    if (status.kind === 'permission' && !/bot|Mina/i.test(description)) {
      description += '\n\n**Required:** Check Mina’s role permissions and channel-specific permission overrides, then retry.';
    }
    const notice = new EmbedBuilder()
      .setColor(status.color)
      .setTitle(status.title)
      .setDescription(description)
      .setFooter({ text: FOOTER })
      .setTimestamp();
    next.embeds = [...(next.embeds || []), notice];
    delete next.content;
  }
  return next;
}

function brandInteraction(interaction) {
  for (const method of ['reply', 'editReply', 'followUp']) {
    if (typeof interaction[method] !== 'function') continue;
    const original = interaction[method].bind(interaction);
    interaction[method] = (payload, ...args) => original(brandPayload(payload), ...args);
  }
  return interaction;
}

function brandMessage(message) {
  if (!message || typeof message.edit !== 'function' || message.__minaBranded) return message;
  const original = message.edit.bind(message);
  message.edit = (payload, ...args) => original(brandPayload(payload), ...args);
  Object.defineProperty(message, '__minaBranded', { value: true });
  return message;
}

module.exports = { COLORS, classify, brandPayload, brandInteraction, brandMessage, brandEmbed };
