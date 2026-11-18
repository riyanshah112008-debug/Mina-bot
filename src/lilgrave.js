'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const store = require('./store');

const punishmentCommand = new SlashCommandBuilder()
  .setName('punishment-setup')
  .setDescription('Configure Lilgrave punishment evidence verification')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(o => o.setName('channel').setDescription('Channel where staff submit punishment evidence').addChannelTypes(ChannelType.GuildText).setRequired(true))
  .addBooleanOption(o => o.setName('enabled').setDescription('Enable evidence verification').setRequired(true));

const setupCommand = new SlashCommandBuilder().setName('staff-leave-setup').setDescription('Open the complete staff leave management panel').setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
const returnCommand = new SlashCommandBuilder().setName('leave-return').setDescription('Report that you have returned from approved leave');
const commands = [punishmentCommand.toJSON(), setupCommand.toJSON(), returnCommand.toJSON()];
const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/';
const retiredModels = new Set(['gemini-2.0-flash', 'gemini-2.0-flash-001', 'gemini-2.0-flash-lite', 'gemini-2.0-flash-lite-001']);
const configuredModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const model = retiredModels.has(configuredModel) ? 'gemini-3.8-flash' : configuredModel; 
async function askGemini(parts, instruction) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error('Gemini API key is not configured (set GEMINI_API_KEY)');
  const response = await fetch(endpoint + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key), {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: instruction }, ...parts] }], generationConfig: { temperature: 0.1, maxOutputTokens: 180, responseMimeType: 'application/json' } }),
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error('Gemini request failed with HTTP ' + response.status);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
  if (!text) throw new Error('Gemini returned an empty response');
  return text;
}
function parseJson(text) { return JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()); }
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
      if (mimeType.startsWith('image/')) parts.push({ inlineData: { mimeType, data: bytes.toString('base64') } });
    } catch (_) { /* Unavailable attachment: fail closed. */ }
  }
  if (parts.length === 1) return;
  try {
    const answer = await askGemini(parts, 'You are a strict evidence reviewer. Verify whether the image visibly proves the stated ban or kick for the exact target ID. Reject ambiguous, cropped, unrelated or contradictory evidence. Respond ONLY as JSON: {"verified":true|false,"confidence":0-1}.');
    const result = parseJson(answer);
    if (result.verified === true && Number(result.confidence) >= 0.92) await message.react('✅');
  } catch (error) { console.error('[Lilgrave] Punishment evidence analysis failed; leaving unverified:', error.message); }
}

function isAuthority(member, cfg) {
  return member?.permissions?.has(PermissionFlagsBits.Administrator) ||
    (cfg.authorityRoleIds || []).some(id => member?.roles?.cache?.has(id));
}
function parseLeave(text) {
  const value = String(text || '').trim();
  if (!/(\bleave\b|\boff\b|\babsence\b|\bsick\b)/i.test(value)) return null;
  const duration = value.match(/\b(\d{1,2})\s*(day|days|d|hour|hours|hr|hrs)\b/i);
  if (!duration) return null;
  const amount = Number(duration[1]);
  const unit = duration[2].toLowerCase();
  const ms = /hour|hr/.test(unit) ? amount * 3600000 : amount * 86400000;
  if (!Number.isFinite(ms) || ms < 3600000 || ms > 30 * 86400000) return null;
  return { durationMs: ms, durationLabel: amount + ' ' + (ms < 86400000 ? 'hour(s)' : 'day(s)') };
}
function panelPayload(guild, cfg) {
  const leave = cfg.lilgrave.leave;
  const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('Staff Leave Management')
    .setDescription([
      '**Request channel:** ' + (leave.channelId ? '<#' + leave.channelId + '>' : 'Not configured'),
      '**Status:** ' + (leave.enabled ? 'Enabled' : 'Disabled'),
      '**Demotion authority:** ' + ((leave.authorityRoleIds || []).length ? leave.authorityRoleIds.map(id => '<@&' + id + '>').join(', ') : 'Administrators only'),
      '**Staff roles:** ' + ((leave.staffRoleIds || []).length ? leave.staffRoleIds.map(id => '<@&' + id + '>').join(', ') : 'Not configured'),
      '**Demoted role:** ' + (leave.demotedRoleId ? '<@&' + leave.demotedRoleId + '>' : 'Not configured'),
      '**Reminder:** ' + (leave.reminderHours ?? 12) + ' hour(s) before return',
      '**Open cases:** ' + (leave.requests || []).filter(item => ['pending','approved'].includes(item.status)).length,
      '',
      'Requests are detected from messages containing leave/absence wording and a duration (for example: “I need sick leave for 2 days”). The bot acknowledges only detected requests.'
    ].join('\n'));
  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('lilgrave_leave:settings').setLabel('Configure panel').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('lilgrave_leave:toggle').setLabel(leave.enabled ? 'Disable' : 'Enable').setStyle(leave.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder().setCustomId('lilgrave_leave:refresh').setLabel('Refresh').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('lilgrave_leave:cases').setLabel('View cases').setStyle(ButtonStyle.Secondary)
    )
  ];
  return { embeds: [embed], components: rows, ephemeral: true };
}
async function execute(interaction) {
  if (!interaction.inGuild()) return interaction.reply({ content: 'Use this command in a server.', ephemeral: true });
  if (interaction.commandName === 'punishment-setup') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: 'Administrator permission required.', ephemeral: true });
    const channel = interaction.options.getChannel('channel', true);
    const enabled = interaction.options.getBoolean('enabled', true);
    store.update(interaction.guildId, cfg => { cfg.lilgrave.punishment = { channelId: channel.id, enabled }; });
    return interaction.reply({ content: 'Lilgrave punishment evidence verification ' + (enabled ? 'enabled' : 'disabled') + ' in ' + channel.toString() + '.', ephemeral: true });
  }
  if (interaction.commandName === 'staff-leave-setup') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: 'Administrator permission required.', ephemeral: true });
    return interaction.reply(panelPayload(interaction.guild, store.get(interaction.guildId)));
  }
  if (interaction.commandName === 'leave-return') {
    const requests = store.get(interaction.guildId).lilgrave.leave.requests || [];
    const active = requests.find(item => item.userId === interaction.user.id && item.status === 'approved');
    if (!active) return interaction.reply({ content: 'I could not find an approved leave record awaiting your return.', ephemeral: true });
    active.status = 'returned'; active.returnedAt = Date.now();
    store.save();
    return interaction.reply({ content: '✅ Your return has been recorded. Welcome back!', ephemeral: true });
  }
  return null;
}
async function handleMessage(message) {
  if (!message.guild || message.author.bot || message.webhookId) return;
  const guildCfg = store.get(message.guildId).lilgrave;
  if (message.channelId === guildCfg.punishment.channelId) await verifyPunishment(message);
  const cfg = guildCfg.leave;
  if (!cfg.enabled || message.channelId !== cfg.channelId) return;
  if (await handleReply(message)) return;
  const parsed = parseLeave(message.content);
  if (!parsed) return;
  const requests = cfg.requests || [];
  if (requests.some(item => item.messageId === message.id)) return;
  const request = { id: message.id, messageId: message.id, userId: message.author.id, channelId: message.channelId, text: message.content.slice(0, 1500), durationMs: parsed.durationMs, durationLabel: parsed.durationLabel, status: 'pending', createdAt: Date.now(), ackMessageId: null, reminded: false, overdueNotified: false };
  requests.push(request);
  cfg.requests = requests.slice(-500);
  store.save();
  try {
    await message.react('✅');
    const authorityRoles = (cfg.authorityRoleIds || []).filter(id => /^\\d{17,20}$/.test(id));
    const roleMentions = authorityRoles.map(id => '<@&' + id + '>').join(' ');
    const reviewLine = roleMentions
      ? roleMentions + ' — new staff leave request needs your review.'
      : '⚠️ No review-authority roles are configured. Administrators must review this request; configure authority roles in /staff-leave-setup.';
    const ack = await message.reply({
      content: '✅ Leave request received — awaiting staff review.\n' + reviewLine,
      allowedMentions: { roles: authorityRoles, repliedUser: false }
    });
    request.ackMessageId = ack.id;
    request.notifiedRoleIds = authorityRoles;
    request.notifiedAt = Date.now();
    store.save();
  } catch (error) {
    console.error('[Lilgrave] Leave acknowledgement failed:', error.message);
  }
}
async function handleReply(message) {
  if (!message.reference?.messageId || !message.guild) return false;
  const cfg = store.get(message.guildId).lilgrave.leave;
  const requests = cfg.requests || [];
  const request = requests.find(item => item.ackMessageId === message.reference.messageId || item.messageId === message.reference.messageId);
  if (!request || request.status !== 'pending') return false;
  const member = await message.guild.members.fetch(message.author.id).catch(() => null);
  if (!isAuthority(member, cfg)) return false;
  const decision = /\b(approve|approved|accept|accepted)\b/i.test(message.content) ? 'approved' :
    /\b(reject|rejected|deny|denied)\b/i.test(message.content) ? 'rejected' : null;
  if (!decision) return false;
  request.status = decision;
  request.reviewedBy = message.author.id;
  request.reviewedAt = Date.now();
  if (decision === 'approved') request.dueAt = Date.now() + request.durationMs;
  store.save();
  await message.reply({ content: decision === 'approved' ? '✅ Leave approved. Return deadline: <t:' + Math.floor(request.dueAt / 1000) + ':F>.' : '❌ Leave request rejected.' }).catch(() => null);
  return true;
}
async function handleComponent(interaction) {
  if (!interaction.customId?.startsWith('lilgrave_leave:')) return false;
  if (!interaction.inGuild()) return interaction.reply({ content: 'Use this in a server.', ephemeral: true });
  const cfg = store.get(interaction.guildId);
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: 'Administrator permission required.', ephemeral: true });
  const action = interaction.customId.split(':')[1];
  if (action === 'refresh') return interaction.update(panelPayload(interaction.guild, cfg));
  if (action === 'cases') {
    const cases = (cfg.lilgrave.leave.requests || []).slice(-12).reverse();
    const lines = cases.map(item => '• <@' + item.userId + '> — **' + item.status + '** — ' + item.durationLabel + (item.dueAt ? ' — due <t:' + Math.floor(item.dueAt / 1000) + ':R>' : '')).join('\n');
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('Recent leave cases').setDescription(lines || 'No leave cases recorded.')], ephemeral: true });
  }
  if (action === 'toggle') {
    cfg.lilgrave.leave.enabled = !cfg.lilgrave.leave.enabled;
    store.save();
    return interaction.update(panelPayload(interaction.guild, cfg));
  }
  if (action === 'settings') {
    const leave = cfg.lilgrave.leave;
    const modal = new ModalBuilder().setCustomId('lilgrave_leave:save').setTitle('Leave system settings');
    const fields = [
      ['channel', 'Leave channel ID', leave.channelId || '', true],
      ['authority', 'Demotion / review role IDs (comma separated)', (leave.authorityRoleIds || []).join(', '), false],
      ['staff', 'Staff role IDs to remove on approved demotion', (leave.staffRoleIds || []).join(', '), false],
      ['demoted', 'Lower role ID to assign (optional)', leave.demotedRoleId || '', false],
      ['reminder', 'Reminder hours before deadline', String(leave.reminderHours ?? 12), true]
    ];
    modal.addComponents(...fields.map(([id, label, value, required]) => new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(TextInputStyle.Short).setRequired(required).setValue(String(value).slice(0, 100)).setMaxLength(100)
    )));
    return interaction.showModal(modal);
  }
  return false;
}
async function handleModal(interaction) {
  if (interaction.customId !== 'lilgrave_leave:save') return false;
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: 'Administrator permission required.', ephemeral: true });
  const channelId = interaction.fields.getTextInputValue('channel').trim();
  const authorityRoleIds = interaction.fields.getTextInputValue('authority').split(',').map(x => x.trim()).filter(Boolean);
  const staffRoleIds = interaction.fields.getTextInputValue('staff').split(',').map(x => x.trim()).filter(Boolean);
  const demotedRoleId = interaction.fields.getTextInputValue('demoted').trim() || null;
  const reminderHours = Number(interaction.fields.getTextInputValue('reminder'));
  const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) return interaction.reply({ content: 'The leave channel ID is invalid or is not a text channel.', ephemeral: true });
  const allRoleIds = [...authorityRoleIds, ...staffRoleIds, ...(demotedRoleId ? [demotedRoleId] : [])];
  for (const id of allRoleIds) if (!await interaction.guild.roles.fetch(id).catch(() => null)) return interaction.reply({ content: 'Invalid role ID: ' + id, ephemeral: true });
  if (!Number.isInteger(reminderHours) || reminderHours < 0 || reminderHours > 168) return interaction.reply({ content: 'Reminder hours must be between 0 and 168.', ephemeral: true });
  store.update(interaction.guildId, cfg => {
    Object.assign(cfg.lilgrave.leave, { channelId, authorityRoleIds, staffRoleIds, demotedRoleId, reminderHours, enabled: true });
    cfg.features.lilgrave = true;
  });
  return interaction.reply(panelPayload(interaction.guild, store.get(interaction.guildId)));
}
async function processDeadlines(client) {
  for (const [guildId, cfg] of Object.entries(store.all())) {
    const leave = cfg.lilgrave?.leave;
    if (!leave?.enabled || !Array.isArray(leave.requests)) continue;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;
    const channel = await guild.channels.fetch(leave.channelId).catch(() => null);
    if (!channel) continue;
    for (const request of leave.requests) {
      if (request.status !== 'approved' || !request.dueAt || request.status === 'returned') continue;
      const now = Date.now();
      const reminderAt = request.dueAt - (Number(leave.reminderHours ?? 12) * 3600000);
      if (!request.reminded && now >= reminderAt && now < request.dueAt) {
        request.reminded = true;
        await channel.send('<@' + request.userId + '> Your approved leave ends soon. Please use /leave-return when you are back.').catch(() => null);
      }
      if (!request.overdueNotified && now >= request.dueAt) {
        request.overdueNotified = true;
        const roles = (leave.authorityRoleIds || []).map(id => '<@&' + id + '>').join(' ');
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('lilgrave_leave:demote:' + request.id).setLabel('Approve demotion').setStyle(ButtonStyle.Danger));
        await channel.send({ content: (roles ? roles + ' ' : '') + '⚠️ <@' + request.userId + '> has not reported their return. Demotion requires an authorized reviewer.', components: [row] }).catch(() => null);
      }
    }
    store.save();
  }
}
async function handleDemotionButton(interaction) {
  if (!interaction.customId?.startsWith('lilgrave_leave:demote:')) return false;
  const cfg = store.get(interaction.guildId).lilgrave.leave;
  const memberActor = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!isAuthority(memberActor, cfg)) return interaction.reply({ content: 'You do not have a configured leave-demotion authority role.', ephemeral: true });
  const requestId = interaction.customId.split(':').slice(2).join(':');
  const request = (cfg.requests || []).find(item => item.id === requestId);
  if (!request || request.status !== 'approved' || !request.overdueNotified) return interaction.reply({ content: 'This leave case is no longer eligible for demotion.', ephemeral: true });
  if (!cfg.staffRoleIds?.length || !cfg.demotedRoleId) return interaction.reply({ content: 'Configure staff roles and a lower role in /staff-leave-setup first.', ephemeral: true });
  const member = await interaction.guild.members.fetch(request.userId).catch(() => null);
  const lowerRole = await interaction.guild.roles.fetch(cfg.demotedRoleId).catch(() => null);
  if (!member || !lowerRole || !member.manageable || !lowerRole.editable) return interaction.reply({ content: 'I cannot change this member’s roles. Check bot role hierarchy and permissions.', ephemeral: true });
  const removable = cfg.staffRoleIds.filter(id => member.roles.cache.has(id));
  if (!removable.length) return interaction.reply({ content: 'The member does not have any configured staff roles.', ephemeral: true });
  await member.roles.remove(removable, 'Approved overdue leave demotion by ' + interaction.user.tag);
  await member.roles.add(lowerRole, 'Approved overdue leave demotion by ' + interaction.user.tag);
  request.status = 'demoted'; request.demotedBy = interaction.user.id; request.demotedAt = Date.now();
  store.save();
  await interaction.update({ content: '⬇️ Demotion completed for <@' + request.userId + '> by <@' + interaction.user.id + '>. Case recorded.', components: [], embeds: [] });
  return true;
}
function start(client) {
  if (globalThis.__lilgraveLeaveTimer) clearInterval(globalThis.__lilgraveLeaveTimer);
  globalThis.__lilgraveLeaveTimer = setInterval(() => processDeadlines(client).catch(error => console.error('[Lilgrave] Deadline processor failed:', error.message)), 60000);
  globalThis.__lilgraveLeaveTimer.unref?.();
}
module.exports = { commands, execute, handleMessage, handleComponent, handleModal, handleDemotionButton, processDeadlines, start, parseLeave, verifyPunishment, askGemini };
