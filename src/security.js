'use strict';
const { AuditLogEvent, PermissionFlagsBits, ChannelType } = require('discord.js');
const store = require('./store');

const buckets = new Map();
const heat = new Map();
const joins = new Map();
const recent = (map, key, now, windowMs) => {
  const values = (map.get(key) || []).filter(t => now - t < windowMs);
  map.set(key, values);
  return values;
};
const trusted = (cfg, id, guild) => id === guild.ownerId || cfg.trusted.includes(id);

async function auditExecutor(guild, type, targetId) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 6 });
    const entry = logs.entries.find(e =>
      Date.now() - e.createdTimestamp < 12000 &&
      (!targetId || e.target?.id === targetId)
    );
    return entry?.executor || null;
  } catch { return null; }
}
async function log(guild, text) {
  const id = store.get(guild.id).logChannelId;
  if (!id) return;
  const channel = guild.channels.cache.get(id) || await guild.channels.fetch(id).catch(() => null);
  if (channel?.isTextBased()) await channel.send({ content: text.slice(0, 1900) }).catch(() => null);
}
async function lockdown(guild, reason) {
  const cfg = store.get(guild.id);
  if (cfg.lockdown.active) return;
  const changed = [];
  for (const channel of guild.channels.cache.values()) {
    if (!channel.isTextBased() || channel.type === ChannelType.GuildForum || !channel.permissionOverwrites?.edit) continue;
    try {
      const before = channel.permissionOverwrites.cache.get(guild.roles.everyone.id)?.deny.bitfield.toString() || '0';
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false, AddReactions: false }, { reason: 'Mina emergency lockdown' });
      changed.push({ channelId: channel.id, before });
    } catch {}
  }
  store.update(guild.id, c => { c.lockdown = { active: true, changed }; });
  await log(guild, '🚨 **Mina lockdown activated.** ' + reason);
}
async function restoreLockdown(guild) {
  const cfg = store.get(guild.id);
  for (const item of cfg.lockdown.changed || []) {
    const channel = guild.channels.cache.get(item.channelId);
    if (!channel) continue;
    try {
      const everyone = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
      if (!everyone) continue;
      await channel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: null, AddReactions: null
      }, { reason: 'Mina lockdown recovery' });
    } catch {}
  }
  store.update(guild.id, c => { c.lockdown = { active: false, changed: [] }; });
  await log(guild, '🔓 **Mina lockdown released.**');
}
async function onDestructiveAudit(guild, type, targetId, label) {
  const cfg = store.get(guild.id);
  if (!cfg.enabled || !cfg.antiNuke.enabled) return;
  const executor = await auditExecutor(guild, type, targetId);
  if (!executor || executor.bot || trusted(cfg, executor.id, guild)) return;
  const key = guild.id + ':' + executor.id;
  const now = Date.now();
  const list = recent(buckets, key, now, cfg.antiNuke.windowMs);
  list.push(now); buckets.set(key, list);
  await log(guild, '⚠️ Anti-nuke: ' + executor.tag + ' performed ' + label + ' (' + list.length + '/' + cfg.antiNuke.limit + ').');
  if (list.length >= cfg.antiNuke.limit) {
    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (member?.moderatable) await member.timeout(60 * 60 * 1000, 'Mina anti-nuke threshold exceeded').catch(() => null);
    if (cfg.antiNuke.lockdown) await lockdown(guild, 'Anti-nuke threshold exceeded for ' + executor.tag);
  }
}
async function onJoin(member) {
  const cfg = store.get(member.guild.id);
  if (!cfg.enabled || !cfg.antiRaid.enabled || trusted(cfg, member.id, member.guild)) return;
  const now = Date.now(), key = member.guild.id;
  const list = recent(joins, key, now, cfg.antiRaid.windowMs);
  list.push(now); joins.set(key, list);
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
  if (!cfg.enabled || !cfg.automod.enabled || trusted(cfg, message.author.id, message.guild)) return false;
  const key = message.guild.id + ':' + message.author.id;
  const now = Date.now();
  const list = recent(heat, key, now, cfg.automod.windowMs);
  list.push({ at: now, content: message.content });
  heat.set(key, list);
  const mentions = message.mentions.users.size + message.mentions.roles.size + (message.mentions.everyone ? 3 : 0);
  const repeated = list.filter(x => x.content && x.content === message.content).length >= 3;
  const spam = list.length >= cfg.automod.messageLimit;
  const mentionSpam = mentions >= cfg.automod.mentionLimit;
  const invite = cfg.automod.inviteFilter && /(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)/i.test(message.content);
  if (!(repeated || spam || mentionSpam || invite)) return false;
  await message.delete().catch(() => null);
  const member = message.member;
  if (member?.moderatable) await member.timeout(5 * 60 * 1000, 'Mina AutoMod: spam/raid filter').catch(() => null);
  await log(message.guild, '🧹 AutoMod action on ' + message.author.tag + ': ' + [repeated && 'repeated messages', spam && 'message flood', mentionSpam && 'mention spam', invite && 'server invite'].filter(Boolean).join(', '));
  return true;
}
async function handleAudit(guild, type, targetId, label) {
  return onDestructiveAudit(guild, type, targetId, label);
}
module.exports = {
  onJoin, onMessage, lockdown, restoreLockdown, log,
  handleAudit,
  auditTypes: [
    [AuditLogEvent.ChannelDelete, 'channel deletion'],
    [AuditLogEvent.RoleDelete, 'role deletion'],
    [AuditLogEvent.MemberBanAdd, 'member ban'],
    [AuditLogEvent.MemberKick, 'member kick'],
    [AuditLogEvent.WebhookCreate, 'webhook creation'],
    [AuditLogEvent.WebhookDelete, 'webhook deletion']
  ]
};
