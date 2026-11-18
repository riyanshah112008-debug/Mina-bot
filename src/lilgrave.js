'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const store = require('./store');

const setupCommand = new SlashCommandBuilder().setName('staff-leave-setup').setDescription('Open the complete staff leave management panel').setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
const returnCommand = new SlashCommandBuilder().setName('leave-return').setDescription('Report that you have returned from approved leave');
const commands = [setupCommand.toJSON(), returnCommand.toJSON()];

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
      '',
      'Requests are detected from messages containing leave/absence wording and a duration (for example: “I need sick leave for 2 days”). The bot acknowledges only detected requests.'
    ].join('\n'));
  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('lilgrave_leave:settings').setLabel('Configure panel').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('lilgrave_leave:toggle').setLabel(leave.enabled ? 'Disable' : 'Enable').setStyle(leave.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder().setCustomId('lilgrave_leave:refresh').setLabel('Refresh').setStyle(ButtonStyle.Secondary)
    )
  ];
  return { embeds: [embed], components: rows, ephemeral: true };
}
async function execute(interaction) {
  if (!interaction.inGuild()) return interaction.reply({ content: 'Use this command in a server.', ephemeral: true });
  const cfg = store.get(interaction.guildId).lilgrave.leave;
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
  const cfg = store.get(message.guildId).lilgrave.leave;
  if (!cfg.enabled || message.channelId !== cfg.channelId) return;
  if (await handleReply(message)) return;\n  const parsed = parseLeave(message.content);
  if (!parsed) return;
  const requests = cfg.requests || [];
  if (requests.some(item => item.messageId === message.id)) return;
  const request = { id: message.id, messageId: message.id, userId: message.author.id, channelId: message.channelId, text: message.content.slice(0, 1500), durationMs: parsed.durationMs, durationLabel: parsed.durationLabel, status: 'pending', createdAt: Date.now(), ackMessageId: null, reminded: false, overdueNotified: false };
  requests.push(request);
  cfg.requests = requests.slice(-500);
  store.save();
  try {
    await message.react('✅');
    const ack = await message.reply({ content: '✅ Leave request received — awaiting staff review.' });
    request.ackMessageId = ack.id;
    store.save();
  } catch (error) {
    console.error('[Lilgrave] Leave acknowledgement failed:', error.message);
  }
}
async function handleReply(message) {
  if (!message.reference?.messageId || !message.guild) return false;
  const cfg = store.get(message.guildId).lilgrave.leave;
  const requests = cfg.requests || [];
  const request = requests.find(item => item.ackMessageId === message.reference.messageId);
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
module.exports = { commands, execute, handleMessage, handleComponent, handleModal, handleDemotionButton, processDeadlines, start, parseLeave, askGemini: async () => { throw new Error('Gemini is not used by the leave workflow'); } };
