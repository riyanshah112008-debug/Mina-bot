'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const store = require('./store');

const punishmentCommand = new SlashCommandBuilder()
  .setName('punishment-setup')
  .setDescription('Configure Lilgrave punishment evidence verification')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(o => o.setName('channel').setDescription('Channel where staff submit punishment evidence').addChannelTypes(ChannelType.GuildText).setRequired(true))
  .addBooleanOption(o => o.setName('enabled').setDescription('Enable evidence verification').setRequired(true));

const leaveCommand = new SlashCommandBuilder()
  .setName('staff-leave-setup')
  .setDescription('Configure Lilgrave staff leave assistant')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(o => o.setName('channel').setDescription('Staff leave request channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
  .addBooleanOption(o => o.setName('enabled').setDescription('Enable the leave assistant').setRequired(true));

const commands = [punishmentCommand.toJSON(), leaveCommand.toJSON()];
const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/';
const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

async function askGemini(parts, instruction) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error('Gemini API key is not configured');
  const response = await fetch(endpoint + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: instruction }, ...parts] }], generationConfig: { temperature: 0.1, maxOutputTokens: 180 } }),
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error('Gemini request failed with HTTP ' + response.status);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
  if (!text) throw new Error('Gemini returned an empty response');
  return text;
}

function parseJson(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
}

async function verifyPunishment(message) {
  const cfg = store.get(message.guildId).lilgrave.punishment;
  if (!cfg.enabled || message.channelId !== cfg.channelId) return;
  const idMatch = message.content.match(/(?:user(?:\s*id)?|member|target)\s*[:：= -]*\s*(\d{17,20})/i) || message.content.match(/\b(\d{17,20})\b/);
  const reasonMatch = message.content.match(/reason\s*[:：=]\s*([\s\S]+)/i);
  const actionMatch = message.content.match(/\b(ban|banned|kick|kicked)\b/i);
  const attachments = [...message.attachments.values()].filter(a => /^image\//i.test(a.contentType || '')).slice(0, 3);
  if (!idMatch || !reasonMatch || !actionMatch || attachments.length === 0) return;
  const parts = [{ text: 'Claimed action: ' + (/ban/i.test(actionMatch[1]) ? 'ban' : 'kick') + '\nTarget Discord ID: ' + idMatch[1] + '\nClaimed reason: ' + reasonMatch[1].slice(0, 1000) }];
  for (const attachment of attachments) {
    try {
      const result = await fetch(attachment.url, { signal: AbortSignal.timeout(15000) });
      if (!result.ok) continue;
      const bytes = Buffer.from(await result.arrayBuffer());
      if (bytes.length > 8 * 1024 * 1024) continue;
      const mimeType = (result.headers.get('content-type') || attachment.contentType || 'image/png').split(';')[0];
      if (!mimeType.startsWith('image/')) continue;
      parts.push({ inlineData: { mimeType, data: bytes.toString('base64') } });
    } catch (_) { /* Unavailable attachment: do not verify. */ }
  }
  if (parts.length === 1) return;
  try {
    const answer = await askGemini(parts, 'You are a strict evidence reviewer, not a moderator. Inspect the supplied screenshot/photo. Determine whether it clearly and consistently proves that the stated Discord ban or kick was actually applied to the exact target Discord ID and supports the stated reason. Reject cropped, edited-looking, ambiguous, unrelated, incomplete, or contradictory evidence. A claim or text typed by the submitter is not proof. Respond ONLY as JSON: {"verified":true|false,"confidence":0-1}. verified may be true only when the image visibly proves the action and target identity; otherwise false.');
    const result = parseJson(answer);
    if (result.verified === true && Number(result.confidence) >= 0.92) {
      await message.react('✅');
    }
  } catch (error) {
    console.error('[Lilgrave] Punishment evidence analysis failed; leaving unverified:', error.message);
  }
}

async function handleStaffLeave(message) {
  const cfg = store.get(message.guildId).lilgrave.leave;
  if (!cfg.enabled || message.channelId !== cfg.channelId) return;
  const text = message.content.trim();
  if (!text || text.length < 8) return;
  try {
    const answer = await askGemini([{ text: text.slice(0, 2500) }], 'You are Lilgrave, a concise formal staff leave assistant. Decide whether this message is genuinely a staff leave/absence request. If unrelated, respond with exactly {"relevant":false}. If relevant, write one polite, professional, empathetic one-line acknowledgement or ask one concise clarification if duration/details are unclear. Never approve or reject leave, promise coverage, request sensitive medical details, or add explanations/emojis. Respond ONLY as JSON: {"relevant":true|false,"reply":"one line"}');
    const result = parseJson(answer);
    if (result.relevant === true && typeof result.reply === 'string') {
      const reply = result.reply.replace(/[\r\n]+/g, ' ').trim().slice(0, 350);
      if (reply) await message.reply({ content: reply, allowedMentions: { repliedUser: false } });
    }
  } catch (error) {
    console.error('[Lilgrave] Staff leave assistant failed:', error.message);
    await message.reply({ content: 'Thank you for informing us. Could you please clarify the expected duration of your absence?', allowedMentions: { repliedUser: false } }).catch(() => null);
  }
}

async function handleMessage(message) {
  if (!message.guild || message.author.bot || message.webhookId) return;
  const cfg = store.get(message.guildId).lilgrave;
  if (message.channelId === cfg.punishment.channelId) await verifyPunishment(message);
  if (message.channelId === cfg.leave.channelId) await handleStaffLeave(message);
}

async function execute(interaction) {
  if (!interaction.inGuild()) return interaction.reply({ content: 'Use this command in a server.', ephemeral: true });
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: 'Administrator permission required.', ephemeral: true });
  const channel = interaction.options.getChannel('channel', true);
  const enabled = interaction.options.getBoolean('enabled', true);
  if (interaction.commandName === 'punishment-setup') {
    store.update(interaction.guildId, cfg => { cfg.lilgrave.punishment = { channelId: channel.id, enabled }; });
    return interaction.reply({ content: 'Lilgrave punishment evidence verification ' + (enabled ? 'enabled' : 'disabled') + ' in ' + channel.toString() + '.', ephemeral: true });
  }
  if (interaction.commandName === 'staff-leave-setup') {
    store.update(interaction.guildId, cfg => { cfg.lilgrave.leave = { channelId: channel.id, enabled }; });
    return interaction.reply({ content: 'Lilgrave staff leave assistant ' + (enabled ? 'enabled' : 'disabled') + ' in ' + channel.toString() + '.', ephemeral: true });
  }
  return null;
}

module.exports = { commands, execute, handleMessage, verifyPunishment, handleStaffLeave, askGemini };
