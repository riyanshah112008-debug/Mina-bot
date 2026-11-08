'use strict';
const { AuditLogEvent, ChannelType } = require('discord.js');
const store = require('./store');

const actionBuckets = new Map();
const messageBuckets = new Map();
const joinBuckets = new Map();
const recentTimes = (map, key, now, windowMs) => {
  const values = (map.get(key) || []).filter(t => now - t < windowMs);
  map.set(key, values);
  return values;
};
const isTrusted = (cfg, id, guild) => id === guild.ownerId || cfg.trusted.includes(id);

async function log(guild, text) {
  const id = store.get(guild.id).logChannelId;
  if (!id) return;
  const channel = guild.channels.cache.get(id) || await guild.channels.fetch(id).catch(() => null);
  if (channel?.isTextBased() && channel.send) {
    await channel.send({ content: text.slice(0, 1900) }).catch(() => null);
  }
}
async function lockdown(guild, reason) {
  const cfg = store.get(guild.id);
  if (cfg.lockdown.active) return false;
  const changed = [];
  for (const channel of guild.channels.cache.values()) {
    if (!channel.isTextBased() || channel.type === ChannelType.GuildForum || !channel.permissionOverwrites?.edit) continue;
    try {
      const prior = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
      const allow = prior?.allow;
      const deny = prior?.deny;
      const send = allow?.has('SendMessages') ? true : deny?.has('SendMessages') ? false : null;
      const react = allow?.has('AddReactions') ? true : deny?.has('AddReactions') ? false : null;
      await channel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: false, AddReactions: false
      }, { reason: 'Mina emergency lockdown' });
      changed.push({ channelId: channel.id, send, react });
    } catch (error) {
      await log(guild, '⚠️ Could not lock channel ' + channel.id + ': ' + error.message);
    }
  }
  store.update(guild.id, c => { c.lockdown = { active: true, changed }; });
  await log(guild, '🚨 **Mina lockdown activated.** ' + reason);
  return true;
}
async function restoreLockdown(guild) {
  const cfg = store.get(guild.id);
  for (const item of cfg.lockdown.changed || []) {
    const channel = guild.channels.cache.get(item.channelId);
    if (!channel?.permissionOverwrites?.edit) continue;
    try {
      await channel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: item.send, AddReactions: item.react
      }, { reason: 'Mina lockdown recovery' });
    } catch (error) {
      await log(guild, '⚠️ Could not restore channel ' + item.channelId + ': ' + error.message);
    }
  }
  store.update(guild.id, c => { c.lockdown = { active: false, changed: [] }; });
  await log(guild, '🔓 **Mina lockdown released.**');
}
async function handleDestructiveAudit(entry, label) {
  const guild = entry.guild;
  if (!guild) return;
  const cfg = store.get(guild.id);
  if (!cfg.enabled || !cfg.antiNuke.enabled) return;
  const executor = entry.executor;
  if (!executor || executor.bot || isTrusted(cfg, executor.id, guild)) return;
  const key = guild.id + ':' + executor.id;
  const now = Date.now();
  const list = recentTimes(actionBuckets, key, now, cfg.antiNuke.windowMs);
  list.push(now);
  actionBuckets.set(key, list);
  await log(guild, '⚠️ Anti-nuke: ' + executor.tag + ' performed ' + label + ' (' + list.length + '/' + cfg.antiNuke.limit + ').');
  if (list.length >= cfg.antiNuke.limit) {
    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (member?.moderatable) await member.timeout(60 * 60 * 1000, 'Mina anti-nuke threshold exceeded').catch(() => null);
    if (cfg.antiNuke.lockdown) await lockdown(guild, 'Anti-nuke threshold exceeded for ' + executor.tag);
  }
}
async function onJoin(member) {
  const cfg = store.get(member.guild.id);
  if (!cfg.enabled || !cfg.antiRaid.enabled || isTrusted(cfg, member.id, member.guild)) return;
  const now = Date.now();
  const list = recentTimes(joinBuckets, member.guild.id, now, cfg.antiRaid.windowMs);
  list.push(now);
  joinBuckets.set(member.guild.id, list);
  const age = now - member.user.createdTimestamp;
  if (age < cfg.antiRaid.minAccountAgeMs) {
    await log(member.guild, '🛡️ New-account gate: ' + member.user.tag + ' joined with an account younger than the configured minimum.');
  }
  if (list.length >= cfg.antiRaid.joinLimit) {
    await lockdown(member.guild, 'Join-raid threshold reached (' + list.length + ' joins in ' + Math.round(cfg.antiRaid.windowMs / 1000) + 's).');
  }
}
async function onMessage(message) {
  if (!message.guild || message.author.bot || message.webhookId) return false;
  const cfg = store.get(message.guild.id);
  if (!cfg.enabled || !cfg.automod.enabled || isTrusted(cfg, message.author.id, message.guild)) return false;
  const key = message.guild.id + ':' + message.author.id;
  const now = Date.now();
  const list = (messageBuckets.get(key) || []).filter(x => now - x.at < cfg.automod.windowMs);
  const mentions = message.mentions.users.size + message.mentions.roles.size + (message.mentions.everyone ? 3 : 0);
  list.push({ at: now, content: message.content, mentions });
  messageBuckets.set(key, list);
  const repeated = message.content && list.filter(x => x.content === message.content).length >= 3;
  const flood = list.length >= cfg.automod.messageLimit;
  const mentionSpam = list.reduce((sum, item) => sum + item.mentions, 0) >= cfg.automod.mentionLimit;
  const invite = cfg.automod.inviteFilter && /(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)/i.test(message.content);
  if (!(repeated || flood || mentionSpam || invite)) return false;
  await message.delete().catch(() => null);
  if (message.member?.moderatable) {
    await message.member.timeout(5 * 60 * 1000, 'Mina AutoMod: spam/raid filter').catch(() => null);
  }
  await log(message.guild, '🧹 AutoMod action on ' + message.author.tag + ': ' +
    [repeated && 'repeated messages', flood && 'message flood', mentionSpam && 'mention spam', invite && 'server invite'].filter(Boolean).join(', '));
  return true;
}
module.exports = {
  onJoin, onMessage, lockdown, restoreLockdown, log,
  handleDestructiveAudit,
  auditTypes: [
    [AuditLogEvent.ChannelDelete, 'channel deletion'],
    [AuditLogEvent.RoleDelete, 'role deletion'],
    [AuditLogEvent.MemberBanAdd, 'member ban'],
    [AuditLogEvent.MemberKick, 'member kick'],
    [AuditLogEvent.WebhookCreate, 'webhook creation'],
    [AuditLogEvent.WebhookDelete, 'webhook deletion']
  ]
};
