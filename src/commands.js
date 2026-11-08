'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const store = require('./store');
const security = require('./security');

const commands = [
  new SlashCommandBuilder().setName('security').setDescription('Configure Mina server protection')
    .addSubcommand(s => s.setName('status').setDescription('Show protection status'))
    .addSubcommand(s => s.setName('enable').setDescription('Enable protection'))
    .addSubcommand(s => s.setName('disable').setDescription('Disable protection'))
    .addSubcommand(s => s.setName('log-channel').setDescription('Set the security log channel').addChannelOption(o => o.setName('channel').setDescription('Text channel').setRequired(true)))
    .addSubcommand(s => s.setName('whitelist-add').setDescription('Trust a user').addUserOption(o => o.setName('user').setDescription('Trusted user').setRequired(true)))
    .addSubcommand(s => s.setName('whitelist-remove').setDescription('Remove a trusted user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('lockdown').setDescription('Emergency server lockdown').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('unlock').setDescription('Restore channels after lockdown').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member')
    .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
    .addIntegerOption(o => o.setName('minutes').setDescription('Duration in minutes (1–40320)').setMinValue(1).setMaxValue(40320).setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setMaxLength(400)),
  new SlashCommandBuilder().setName('kick').setDescription('Kick a member')
    .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setMaxLength(400)),
  new SlashCommandBuilder().setName('ban').setDescription('Ban a member')
    .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setMaxLength(400))
].map(c => c.toJSON());

async function execute(interaction) {
  if (!interaction.inGuild()) return interaction.reply({ content: 'Use this command in a server.', ephemeral: true });
  const { commandName: name, guild, member } = interaction;
  if (['security','lockdown','unlock'].includes(name) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: 'Administrator permission required.', ephemeral: true });
  }
  if (name === 'security') {
    const sub = interaction.options.getSubcommand();
    const cfg = store.get(guild.id);
    if (sub === 'status') return interaction.reply({ content:
      '**Mina Security**\nProtection: ' + (cfg.enabled ? 'ON' : 'OFF') +
      '\nAnti-nuke: ' + (cfg.antiNuke.enabled ? 'ON' : 'OFF') +
      '\nAnti-raid: ' + (cfg.antiRaid.enabled ? 'ON' : 'OFF') +
      '\nAutoMod: ' + (cfg.automod.enabled ? 'ON' : 'OFF') +
      '\nTrusted users: ' + cfg.trusted.length +
      '\nLockdown: ' + (cfg.lockdown.active ? 'ACTIVE' : 'inactive'), ephemeral: true });
    if (sub === 'enable') store.update(guild.id, c => { c.enabled = true; });
    if (sub === 'disable') store.update(guild.id, c => { c.enabled = false; });
    if (sub === 'log-channel') store.update(guild.id, c => { c.logChannelId = interaction.options.getChannel('channel').id; });
    if (sub === 'whitelist-add') store.update(guild.id, c => { const id = interaction.options.getUser('user').id; if (!c.trusted.includes(id)) c.trusted.push(id); });
    if (sub === 'whitelist-remove') store.update(guild.id, c => { c.trusted = c.trusted.filter(id => id !== interaction.options.getUser('user').id); });
    return interaction.reply({ content: 'Security settings saved.', ephemeral: true });
  }
  if (name === 'lockdown') { await security.lockdown(guild, 'Manually activated by ' + interaction.user.tag); return interaction.reply({ content: 'Lockdown activated.', ephemeral: true }); }
  if (name === 'unlock') { await security.restoreLockdown(guild); return interaction.reply({ content: 'Lockdown recovery completed.', ephemeral: true }); }
  const user = interaction.options.getUser('user');
  const target = await guild.members.fetch(user.id).catch(() => null);
  if (!target) return interaction.reply({ content: 'Member not found.', ephemeral: true });
  if (target.id === guild.ownerId || target.roles.highest.position >= member.roles.highest.position) return interaction.reply({ content: 'Cannot moderate this member because of Discord role hierarchy.', ephemeral: true });
  const reason = interaction.options.getString('reason') || 'No reason provided';
  if (name === 'timeout') {
    if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: 'You need Moderate Members permission.', ephemeral: true });
    const minutes = interaction.options.getInteger('minutes');
    await target.timeout(minutes * 60000, reason);
  } else if (name === 'kick') {
    if (!member.permissions.has(PermissionFlagsBits.KickMembers)) return interaction.reply({ content: 'You need Kick Members permission.', ephemeral: true });
    await target.kick(reason);
  } else if (name === 'ban') {
    if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: 'You need Ban Members permission.', ephemeral: true });
    await target.ban({ reason });
  }
  return interaction.reply({ content: user.tag + ' action completed.', ephemeral: true });
}
module.exports = { commands, execute };
