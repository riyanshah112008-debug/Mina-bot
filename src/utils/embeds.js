'use strict';
const { EmbedBuilder } = require('discord.js');

const COLORS = Object.freeze({ primary: 0x5865F2, success: 0x57F287, warning: 0xFEE75C, danger: 0xED4245 });
const FOOTER = 'Mina Bot • Server Management';

function classify(message) {
  const value = String(message || '');

  // Wick-style red embeds communicate a missing Discord permission or role
  // hierarchy requirement; they are not generic command/runtime failures.
  if (/\b(permission required|missing permission|missing permissions|lacks? (?:the )?(?:required )?permission|not have permission|cannot manage|role hierarchy|move (?:the )?mina bot role)\b/i.test(value) || /\b50013\b/.test(value)) {
    return { title: 'Mina Bot • Permission Required', color: COLORS.danger };
  }
  if (/\b(error|failed|cannot|could not|not found|invalid)\b/i.test(value) || /[❌🛑]/u.test(value)) {
    return { title: 'Mina Bot • Unsuccessful Operation', color: COLORS.danger };
  }
  if (/\b(warning|注意)\b/i.test(value) || /[⚠️🚨]/u.test(value)) {
    return { title: 'Mina Bot • Warning', color: COLORS.warning };
  }
  if (/\b(success|enabled|disabled|saved|updated|completed|joined|paused|resumed|skipped|stopped|cancelled|set)\b|[✅🎉🔓🔒]/i.test(value)) {
    return { title: 'Mina Bot • Successful Operation', color: COLORS.success };
  }
  return { title: 'Mina Bot • Notice', color: COLORS.primary };
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
    const description = next.content.length > 4096 ? next.content.slice(0, 4093) + '...' : next.content;
    const notice = new EmbedBuilder().setColor(status.color).setTitle(status.title).setDescription(description).setFooter({ text: FOOTER }).setTimestamp();
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
