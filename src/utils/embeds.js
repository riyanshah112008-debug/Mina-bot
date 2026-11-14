'use strict';
const { EmbedBuilder } = require('discord.js');

const COLORS = Object.freeze({ primary: 0x5865F2, success: 0x57F287, warning: 0xFEE75C, danger: 0xED4245 });
const FOOTER = 'Mina • Server Management';
const MAX_DESCRIPTION_LENGTH = 4096;
const PERMISSION_GUIDANCE = '\n\n**Required:** Check Mina’s role permissions and channel-specific permission overrides, then retry.';

function truncateDescription(value, maxLength = MAX_DESCRIPTION_LENGTH) {
  if (value.length <= maxLength) return value;
  if (maxLength <= 3) return value.slice(0, maxLength);
  return value.slice(0, maxLength - 3) + '...';
}

// Wick-style red notices represent an operation blocked by Discord permissions,
// not an internal application crash. Keep the reason visible and actionable.
function classify(message) {
  const value = String(message || '');
  if (/\b(?:missing|lacking|lack(?:s)?|denied|insufficient|not granted)\s+(?:(?:[a-z][a-z'-]*\s+){0,5})permissions?\b|\bpermissions?\s+(?:are\s+)?(?:missing|denied|not granted)\b|\bmissing access\b|\bnot authori[sz]ed\b|\b50013\b|\b50001\b/i.test(value)) {
    return { title: 'Unsuccessful Operation!', color: COLORS.danger, kind: 'permission' };
  }
  // Explicit failure markers must win over success words such as "set" or "updated".
  if (/\b(error|failed|failure|exception|could not|cannot|unable to|invalid)\b|[❌🛑]/i.test(value)) {
    return { title: 'Mina • Operation Failed', color: COLORS.danger, kind: 'failure' };
  }
  if (/\b(warning|注意)\b/i.test(value) || /[⚠️🚨]/u.test(value)) {
    return { title: 'Mina • Warning', color: COLORS.warning, kind: 'warning' };
  }
  if (/\b(success|enabled|disabled|saved|updated|completed|joined|paused|resumed|skipped|stopped|cancelled|set|purged|banned|kicked|timed out|unbanned)\b|[✅🎉🔓🔒]/i.test(value)) {
    return { title: 'Successful Operation!', color: COLORS.success, kind: 'success' };
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
    let description = next.content;
    const guidance = status.kind === 'permission' && !/bot|Mina/i.test(description)
      ? PERMISSION_GUIDANCE
      : '';
    // Reserve room for the guidance before truncating so it remains visible.
    description = guidance
      ? truncateDescription(description, MAX_DESCRIPTION_LENGTH - guidance.length) + guidance
      : truncateDescription(description);
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
