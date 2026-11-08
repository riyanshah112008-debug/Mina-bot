'use strict';
const {
  SlashCommandBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle,
  ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');
const store = require('./store');
const security = require('./security');

const challenges = new Map();
const commands = [
  new SlashCommandBuilder().setName('security').setDescription('Configure Mina server protection')
    .addSubcommand(s => s.setName('status').setDescription('Show protection status'))
    .addSubcommand(s => s.setName('enable').setDescription('Enable protection'))
    .addSubcommand(s => s.setName('disable').setDescription('Disable protection'))
    .addSubcommand(s => s.setName('log-channel').setDescription('Set the security log channel').addChannelOption(o => o.setName('channel').setDescription('Text channel').setRequired(true)))
    .addSubcommand(s => s.setName('whitelist-add').setDescription('Trust a user').addUserOption(o => o.setName('user').setDescription('Trusted user').setRequired(true)))
    .addSubcommand(s => s.setName('whitelist-remove').setDescription('Remove a trusted user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(s => s.setName('quarantine-role').setDescription('Set the role for young or unverified accounts').addRoleOption(o => o.setName('role').setDescription('Restricted quarantine role').setRequired(true)))
    .addSubcommand(s => s.setName('allow-domain').setDescription('Allow a domain through suspicious-link filtering').addStringOption(o => o.setName('domain').setDescription('Domain, e.g. example.com').setRequired(true).setMaxLength(253)))
    .addSubcommand(s => s.setName('remove-domain').setDescription('Remove an allowed domain').addStringOption(o => o.setName('domain').setDescription('Domain').setRequired(true).setMaxLength(253)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('verification').setDescription('Configure button-and-math verification')
    .addSubcommand(s => s.setName('setup').setDescription('Set verified and quarantine roles')
      .addRoleOption(o => o.setName('verified_role').setDescription('Role given after verification').setRequired(true))
      .addRoleOption(o => o.setName('quarantine_role').setDescription('Role held before verification').setRequired(true)))
    .addSubcommand(s => s.setName('disable').setDescription('Disable verification gate'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('verify').setDescription('Complete the server verification challenge'),
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
  const { commandName: name, guild } = interaction;
  const actor = await guild.members.fetch(interaction.user.id).catch(() => null);
  if (!actor) return interaction.reply({ content: 'Could not resolve your server membership.', ephemeral: true });
  if (['security','verification','lockdown','unlock'].includes(name) && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: 'Administrator permission required.', ephemeral: true });
  }
  if (name === 'verify') {
    const cfg = store.get(guild.id);
    if (!cfg.verification.enabled || !cfg.verification.verifiedRoleId) {
      return interaction.reply({ content: 'Verification is not configured on this server.', ephemeral: true });
    }
    const button = new ButtonBuilder().setCustomId('mina_verify_start').setLabel('Start verification').setStyle(ButtonStyle.Success);
    return interaction.reply({ content: 'Complete a short arithmetic check to receive the verified role.', components: [new ActionRowBuilder().addComponents(button)], ephemeral: true });
  }
  if (name === 'verification') {
    const sub = interaction.options.getSubcommand();
    if (sub === 'setup') {
      const verifiedRole = interaction.options.getRole('verified_role');
      const quarantineRole = interaction.options.getRole('quarantine_role');
      if (verifiedRole.id === quarantineRole.id) return interaction.reply({ content: 'Choose two different roles.', ephemeral: true });
      store.update(guild.id, c => {
        c.verification = { enabled: true, verifiedRoleId: verifiedRole.id, quarantineRoleId: quarantineRole.id };
        c.quarantineRoleId = quarantineRole.id;
      });
      return interaction.reply({ content: 'Verification configured. Apply the quarantine role to @everyone permissions so unverified members cannot access restricted channels.', ephemeral: true });
    }
    store.update(guild.id, c => { c.verification.enabled = false; });
    return interaction.reply({ content: 'Verification gate disabled.', ephemeral: true });
  }
  if (name === 'security') {
    const sub = interaction.options.getSubcommand();
    const cfg = store.get(guild.id);
    if (sub === 'status') return interaction.reply({ content:
      '**Mina Security**\nProtection: ' + (cfg.enabled ? 'ON' : 'OFF') +
      '\nAnti-nuke: ' + (cfg.antiNuke.enabled ? 'ON' : 'OFF') +
      '\nAnti-raid: ' + (cfg.antiRaid.enabled ? 'ON' : 'OFF') +
      '\nAutoMod: ' + (cfg.automod.enabled ? 'ON' : 'OFF') +
      '\nSuspicious-link filter: ' + (cfg.automod.linkFilter ? 'ON' : 'OFF') +
      '\nVerification: ' + (cfg.verification.enabled ? 'ON' : 'OFF') +
      '\nTrusted users: ' + cfg.trusted.length +
      '\nLockdown: ' + (cfg.lockdown.active ? 'ACTIVE' : 'inactive'), ephemeral: true });
    if (sub === 'enable') store.update(guild.id, c => { c.enabled = true; });
    if (sub === 'disable') store.update(guild.id, c => { c.enabled = false; });
    if (sub === 'log-channel') store.update(guild.id, c => { c.logChannelId = interaction.options.getChannel('channel').id; });
    if (sub === 'whitelist-add') store.update(guild.id, c => { const id = interaction.options.getUser('user').id; if (!c.trusted.includes(id)) c.trusted.push(id); });
    if (sub === 'whitelist-remove') store.update(guild.id, c => { c.trusted = c.trusted.filter(id => id !== interaction.options.getUser('user').id); });
    if (sub === 'quarantine-role') store.update(guild.id, c => { c.quarantineRoleId = interaction.options.getRole('role').id; });
    if (sub === 'allow-domain' || sub === 'remove-domain') {
      const raw = interaction.options.getString('domain').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(raw)) {
        return interaction.reply({ content: 'Enter a valid hostname only, such as example.com.', ephemeral: true });
      }
      store.update(guild.id, c => {
        c.automod.allowedDomains = sub === 'allow-domain'
          ? [...new Set([...c.automod.allowedDomains, raw])]
          : c.automod.allowedDomains.filter(x => x !== raw);
      });
    }
    return interaction.reply({ content: 'Security settings saved.', ephemeral: true });
  }
  if (name === 'lockdown') {
    await security.lockdown(guild, 'Manually activated by ' + interaction.user.tag);
    return interaction.reply({ content: 'Lockdown activated.', ephemeral: true });
  }
  if (name === 'unlock') {
    await security.restoreLockdown(guild);
    return interaction.reply({ content: 'Lockdown recovery completed.', ephemeral: true });
  }
  const user = interaction.options.getUser('user');
  const target = await guild.members.fetch(user.id).catch(() => null);
  if (!target) return interaction.reply({ content: 'Member not found.', ephemeral: true });
  if (target.id === guild.ownerId || target.roles.highest.position >= actor.roles.highest.position) {
    return interaction.reply({ content: 'Cannot moderate this member because of Discord role hierarchy.', ephemeral: true });
  }
  const reason = interaction.options.getString('reason') || 'No reason provided';
  if (name === 'timeout') {
    if (!actor.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: 'You need Moderate Members permission.', ephemeral: true });
    const minutes = interaction.options.getInteger('minutes');
    if (!target.moderatable) return interaction.reply({ content: 'Mina cannot timeout this member. Check the bot role hierarchy and permissions.', ephemeral: true });
    await target.timeout(minutes * 60000, reason);
  } else if (name === 'kick') {
    if (!actor.permissions.has(PermissionFlagsBits.KickMembers)) return interaction.reply({ content: 'You need Kick Members permission.', ephemeral: true });
    if (!target.kickable) return interaction.reply({ content: 'Mina cannot kick this member. Check the bot role hierarchy and permissions.', ephemeral: true });
    await target.kick(reason);
  } else if (name === 'ban') {
    if (!actor.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: 'You need Ban Members permission.', ephemeral: true });
    if (!target.bannable) return interaction.reply({ content: 'Mina cannot ban this member. Check the bot role hierarchy and permissions.', ephemeral: true });
    await target.ban({ reason });
  }
  return interaction.reply({ content: user.tag + ' action completed.', ephemeral: true });
}
async function handleComponent(interaction) {
  if (interaction.isButton() && interaction.customId === 'mina_verify_start') {
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 2;
    challenges.set(interaction.user.id + ':' + interaction.guildId, { answer: String(a + b), expires: Date.now() + 120000 });
    const modal = new ModalBuilder().setCustomId('mina_verify_answer').setTitle('Mina verification');
    const answer = new TextInputBuilder().setCustomId('answer').setLabel('What is ' + a + ' + ' + b + '?').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(2);
    modal.addComponents(new ActionRowBuilder().addComponents(answer));
    return interaction.showModal(modal);
  }
  if (interaction.isModalSubmit() && interaction.customId === 'mina_verify_answer') {
    const key = interaction.user.id + ':' + interaction.guildId;
    const challenge = challenges.get(key);
    challenges.delete(key);
    if (!challenge || challenge.expires < Date.now() || interaction.fields.getTextInputValue('answer').trim() !== challenge.answer) {
      return interaction.reply({ content: 'Verification failed or expired. Run /verify to try again.', ephemeral: true });
    }
    const cfg = store.get(interaction.guildId);
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'Could not find your server membership.', ephemeral: true });
    const verified = await interaction.guild.roles.fetch(cfg.verification.verifiedRoleId).catch(() => null);
    if (!verified || !member.manageable) return interaction.reply({ content: 'Mina cannot assign the verified role. Check the bot role hierarchy.', ephemeral: true });
    await member.roles.add(verified, 'Mina verification completed');
    const quarantineId = cfg.verification.quarantineRoleId || cfg.quarantineRoleId;
    if (quarantineId) {
      const quarantine = await interaction.guild.roles.fetch(quarantineId).catch(() => null);
      if (quarantine && member.roles.cache.has(quarantine.id)) await member.roles.remove(quarantine, 'Mina verification completed').catch(() => null);
    }
    await security.log(interaction.guild, '✅ ' + interaction.user.tag + ' completed verification.');
    return interaction.reply({ content: 'Verification successful. You now have access to verified channels.', ephemeral: true });
  }
}
module.exports = { commands, execute, handleComponent };
