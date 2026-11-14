'use strict';
const { EmbedBuilder } = require('discord.js');

const COLORS = Object.freeze({ primary: 0x5865F2, success: 0x57F287, warning: 0xFEE75C, danger: 0xED4245 });
const FOOTER = 'NovaBot • Server Management';

const MODERATION_ACTIONS = Object.freeze({
  warn: { label: 'Member Warned', color: 0xFEE75C },
  timeout: { label: 'Member Timed Out', color: 0xED4245 },
  kick: { label: 'Member Kicked', color: 0xED4245 },
  ban: { label: 'Member Banned', color: 0xED4245 },
  unban: { label: 'Member Unbanned', color: 0x57F287 },
  nick: { label: 'Nickname Updated', color: 0x5865F2 },
  clearwarnings: { label: 'Warnings Cleared', color: 0x57F287 }
});

function buildModerationEmbed({ action, target, moderator, reason, caseId, duration, guild }) {
  const style = MODERATION_ACTIONS[action] || { label: 'Moderation Action', color: COLORS.primary };
  const user = target?.user || target;
  const targetId = user?.id || target?.id || 'Unknown';
  const targetTag = user?.tag || user?.username || 'Unknown user';
  const modUser = moderator?.user || moderator;
  const embed = new EmbedBuilder()
    .setColor(style.color)
    .setAuthor({ name: style.label, iconURL: modUser?.displayAvatarURL?.({ size: 128 }) || undefined })
    .setDescription('A moderation action has been successfully completed.')
    .setThumbnail(user?.displayAvatarURL?.({ size: 256 }) || undefined)
    .addFields(
      { name: 'Member', value: '<@' + targetId + '>\n`' + targetTag + '`', inline: true },
      { name: 'Moderator', value: (modUser?.id ? '<@' + modUser.id + '>' : 'Unknown') + (modUser?.tag ? '\n`' + modUser.tag + '`' : ''), inline: true },
      { name: 'Reason', value: String(reason || 'No reason provided').slice(0, 1024), inline: false }
    );
  if (duration) embed.addFields({ name: 'Duration', value: String(duration), inline: true });
  if (caseId) embed.addFields({ name: 'Case', value: '`#' + caseId + '`', inline: true });
  embed.setFooter({ text: (guild?.name || 'Server') + ' • NovaBot Moderation' }).setTimestamp();
  return embed;
}
function classify(message) {
  const value = String(message || '');
  if (/\b(error|failed|cannot|could not|missing permission|not found|invalid)\b/i.test(value) || /[❌🛑]/u.test(value)) return { title: 'NovaBot • Error', color: COLORS.danger };
  if (/\b(warning|注意)\b/i.test(value) || /[⚠️🚨]/u.test(value)) return { title: 'NovaBot • Warning', color: COLORS.warning };
  if (/\b(success|enabled|disabled|saved|updated|completed|joined|paused|resumed|skipped|stopped|cancelled|set)\b|[✅🎉🔓🔒]/i.test(value)) return { title: 'NovaBot • Success', color: COLORS.success };
  return { title: 'NovaBot • Notice', color: COLORS.primary };
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
  if (!message || typeof message.edit !== 'function' || message.__novaBranded) return message;
  const original = message.edit.bind(message);
  message.edit = (payload, ...args) => original(brandPayload(payload), ...args);
  Object.defineProperty(message, '__novaBranded', { value: true });
  return message;
}

module.exports = { COLORS, MODERATION_ACTIONS, buildModerationEmbed, brandPayload, brandInteraction, brandMessage, brandEmbed };
