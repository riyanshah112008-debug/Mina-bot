'use strict';
const { AuditLogEvent, ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const store = require('./store');

const actionBuckets = new Map();
const messageBuckets = new Map();
const joinBuckets = new Map();
const recentTimes = (map, key, now, windowMs) => {
  const values = (map.get(key) || []).filter(t => now - t < windowMs);
  map.set(key, values);
  return values;
};
const isTrusted = (cfg, id, guild) => {
  if (id === guild.ownerId || cfg.trusted.includes(id)) return true;
  const member = guild.members.cache.get(id);
  return Boolean(member && (cfg.trustedRoles || []).some(roleId => member.roles.cache.has(roleId)));
};
function recordIncident(guild, type, actorId, details, severity = 'high') {
  store.update(guild.id, cfg => {
    cfg.incidents.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), type, actorId: actorId || null, details: String(details || '').slice(0, 900), severity, at: new Date().toISOString() });
    cfg.incidents = cfg.incidents.slice(-100);
  });
}

async function log(guild, text) {
  const id = store.get(guild.id).logChannelId;
  if (!id) return;
  const channel = guild.channels.cache.get(id) || await guild.channels.fetch(id).catch(() => null);
  if (channel?.isTextBased() && channel.send) {
    const embed = new EmbedBuilder().setColor(/🚨|🛑|⚠️/.test(text) ? 0xED4245 : 0x5865F2)
      .setDescription(text.slice(0, 4000)).setTimestamp();
    await channel.send({ embeds: [embed] }).catch(() => null);
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
  recordIncident(guild, 'lockdown', null, reason, 'critical');
  await log(guild, '🚨 **Mina lockdown activated.** ' + reason);
  return true;
}
async function restoreLockdown(guild) {
  const cfg = store.get(guild.id);
  for (const item of cfg.lockdown.changed || []) {
    const channel = guild.channels.cache.get(item.channelId) || await guild.channels.fetch(item.channelId).catch(() => null);
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
  if (!executor || isTrusted(cfg, executor.id, guild)) return;
  if (entry.action === AuditLogEvent.RoleUpdate && !(entry.changes || []).some(change => change.key === 'permissions')) return;
  if (entry.action === AuditLogEvent.MemberRoleUpdate && !(entry.changes || []).some(change => change.key === '$add' || change.key === '$remove')) return;
  recordIncident(guild, label, executor.id, 'Audit-log action by ' + executor.tag + '; target ' + (entry.targetId || 'unknown'));

  if (entry.action === AuditLogEvent.BotAdd && entry.targetId) {
    const addedBot = await guild.members.fetch(entry.targetId).catch(() => null);
    if (addedBot?.user.bot && addedBot.bannable) {
      await addedBot.ban({ reason: 'Mina anti-nuke: bot added by an untrusted administrator' }).catch(() => null);
      await log(guild, '🛑 Unauthorized bot addition: removed ' + addedBot.user.tag + ' (added by ' + executor.tag + ').');
    } else {
      await log(guild, '⚠️ Unauthorized bot addition detected, but Mina could not remove the bot. Check role hierarchy.');
    }
  }

  const key = guild.id + ':' + executor.id;
  const now = Date.now();
  const list = recentTimes(actionBuckets, key, now, cfg.antiNuke.windowMs);
  list.push(now);
  actionBuckets.set(key, list);
  await log(guild, '⚠️ Anti-nuke: ' + executor.tag + ' performed ' + label + ' (' + list.length + '/' + cfg.antiNuke.limit + ').');
  if (list.length >= cfg.antiNuke.limit) {
    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (member?.moderatable) {
      await member.timeout(60 * 60 * 1000, 'Mina anti-nuke threshold exceeded').catch(() => null);
    }
    recordIncident(guild, 'anti-nuke threshold', executor.id, 'Threshold ' + cfg.antiNuke.limit + ' reached in ' + Math.round(cfg.antiNuke.windowMs / 1000) + ' seconds', 'critical');
    if (cfg.antiNuke.lockdown) await lockdown(guild, 'Anti-nuke threshold exceeded for ' + executor.tag);
  }
}
async function onJoin(member) {
  const cfg = store.get(member.guild.id);
  if (!cfg.enabled || isTrusted(cfg, member.id, member.guild)) return;
  const age = Date.now() - member.user.createdTimestamp;
  const verification = cfg.verification || {};
  const quarantineId = verification.enabled ? (verification.quarantineRoleId || cfg.quarantineRoleId) : (age < cfg.antiRaid.minAccountAgeMs ? cfg.quarantineRoleId : null);
  let quarantined = false;
  if (quarantineId) {
    const role = await member.guild.roles.fetch(quarantineId).catch(() => null);
    if (role && member.manageable && !member.roles.cache.has(role.id)) {
      quarantined = await member.roles.add(role, verification.enabled ? 'Mina verification gate: new member' : 'Mina anti-raid: young account').then(() => true).catch(() => false);
    }
  }
  if (age < cfg.antiRaid.minAccountAgeMs && cfg.antiRaid.enabled) {
    recordIncident(member.guild, 'young account join', member.id, 'Account age below configured minimum', 'medium');
    await log(member.guild, '🛡️ New-account gate: ' + member.user.tag + ' joined with a young account.' + (quarantined ? ' Quarantine role applied.' : ' Review member manually.'));
  } else if (verification.enabled) {
    await log(member.guild, '🔐 Verification required for ' + member.user.tag + (quarantined ? '; quarantine role applied.' : '; check role hierarchy.'));
  }
  if (!cfg.antiRaid.enabled) return;
  const now = Date.now();
  const list = recentTimes(joinBuckets, member.guild.id, now, cfg.antiRaid.windowMs);
  list.push(now);
  joinBuckets.set(member.guild.id, list);
  if (list.length >= cfg.antiRaid.joinLimit) {
    recordIncident(member.guild, 'anti-raid threshold', null, list.length + ' joins in ' + Math.round(cfg.antiRaid.windowMs / 1000) + ' seconds', 'critical');
    await lockdown(member.guild, 'Join-raid threshold reached (' + list.length + ' joins in ' + Math.round(cfg.antiRaid.windowMs / 1000) + 's).');
  }
}
function isSuspiciousLink(content, allowedDomains) {
  const matches = content.match(/https?:\/\/[^\s<>]+/gi) || [];
  const allowed = new Set(allowedDomains.map(x => x.toLowerCase().replace(/^www\./, '')));
  for (const raw of matches) {
    let url;
    try { url = new URL(raw.replace(/[),.!?]+$/, '')); } catch { continue; }
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (allowed.has(host)) continue;
    if (host.startsWith('xn--') || host.split('.').some(part => part.startsWith('xn--'))) return true;
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) return true;
    if (/^(?:bit\.ly|tinyurl\.com|cutt\.ly|t\.co|is\.gd)$/i.test(host)) return true;
    if (/(?:login|verify|wallet|nitro|gift|free|steamcommunity)/i.test(url.pathname) &&
        /(?:discord|steam|nitro|wallet|account)/i.test(host)) return true;
  }
  return false;
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
  const maliciousLink = cfg.automod.linkFilter && isSuspiciousLink(message.content, cfg.automod.allowedDomains);
  if (!(repeated || flood || mentionSpam || invite || maliciousLink)) return false;
  await message.delete().catch(() => null);
  if (message.member?.moderatable) {
    await message.member.timeout(5 * 60 * 1000, 'Mina AutoMod: spam or unsafe link filter').catch(() => null);
  }
  recordIncident(message.guild, 'automod', message.author.id, 'Automated enforcement: ' + [repeated && 'repeated messages', flood && 'message flood', mentionSpam && 'mention spam', invite && 'server invite', maliciousLink && 'suspicious link'].filter(Boolean).join(', '), 'medium');
  await log(message.guild, '🧹 AutoMod action on ' + message.author.tag + ': ' +
    [repeated && 'repeated messages', flood && 'message flood', mentionSpam && 'mention spam', invite && 'server invite', maliciousLink && 'suspicious link'].filter(Boolean).join(', '));
  return true;
}
module.exports = {
  onJoin, onMessage, lockdown, restoreLockdown, log,
  handleDestructiveAudit, isSuspiciousLink, recordIncident,
  auditTypes: [
    [AuditLogEvent.ChannelCreate, 'channel creation'],
    [AuditLogEvent.ChannelDelete, 'channel deletion'],
    [AuditLogEvent.ChannelOverwriteCreate, 'channel overwrite creation'],
    [AuditLogEvent.ChannelOverwriteUpdate, 'channel overwrite update'],
    [AuditLogEvent.ChannelOverwriteDelete, 'channel overwrite deletion'],
    [AuditLogEvent.RoleCreate, 'role creation'],
    [AuditLogEvent.RoleDelete, 'role deletion'],
    [AuditLogEvent.RoleUpdate, 'role update or permission change'],
    [AuditLogEvent.MemberBanAdd, 'member ban'],
    [AuditLogEvent.MemberKick, 'member kick'],
    [AuditLogEvent.MemberRoleUpdate, 'member role change'],
    [AuditLogEvent.WebhookCreate, 'webhook creation'],
    [AuditLogEvent.WebhookUpdate, 'webhook update'],
    [AuditLogEvent.WebhookDelete, 'webhook deletion'],
    [AuditLogEvent.BotAdd, 'bot addition']
  ]
};
