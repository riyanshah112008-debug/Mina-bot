'use strict';

const { AuditLogEvent, ChannelType } = require('discord.js');
const store = require('./store');
const { brandPayload } = require('./utils/embeds');
const { scoreHeat } = require('./utils/heatEngine');

const actionBuckets = new Map();
const messageBuckets = new Map();
const joinBuckets = new Map();
const heatBuckets = new Map();
const strikeBuckets = new Map();
const raidJoiners = new Map();

function recent(map, key, now, windowMs) {
  const list = (map.get(key) || []).filter(item => now - item < windowMs);
  map.set(key, list);
  return list;
}

async function trusted(cfg, id, guild) {
  if (id === guild.ownerId || id === guild.client.user?.id || cfg.trusted.includes(id)) return true;
  const member = guild.members.cache.get(id) || await guild.members.fetch(id).catch(() => null);
  return Boolean(member && cfg.trustedRoles.some(role => member.roles.cache.has(role)));
}

function incident(guild, type, actorId, details, severity = 'high') {
  store.update(guild.id, cfg => {
    cfg.incidents.push({
      id: Date.now().toString(36),
      type,
      actorId: actorId || null,
      details: String(details).slice(0, 900),
      severity,
      at: new Date().toISOString()
    });
    cfg.incidents = cfg.incidents.slice(-100);
  });
}

async function log(guild, message) {
  const id = store.get(guild.id).logChannelId;
  if (!id) return;
  const channel = guild.channels.cache.get(id) || await guild.channels.fetch(id).catch(() => null);
  if (channel?.isTextBased() && channel.send) {
    await channel.send(brandPayload({ content: message.slice(0, 4000) })).catch(() => null);
  }
}

async function lockdown(guild, reason) {
  const cfg = store.get(guild.id);
  if (cfg.lockdown.active) return false;
  const changed = [];
  for (const channel of guild.channels.cache.values()) {
    if (!channel.permissionOverwrites?.edit || channel.type === ChannelType.GuildCategory) continue;
    const overwrite = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
    const before = {};
    for (const key of ['SendMessages', 'AddReactions', 'SendMessagesInThreads', 'CreatePublicThreads', 'CreatePrivateThreads']) {
      before[key] = overwrite?.allow.has(key) ? true : overwrite?.deny.has(key) ? false : null;
    }
    try {
      await channel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: false,
        AddReactions: false,
        SendMessagesInThreads: false,
        CreatePublicThreads: false,
        CreatePrivateThreads: false
      }, { reason: 'NovaBot emergency lockdown' });
      changed.push({ channelId: channel.id, before });
    } catch (error) {
      await log(guild, 'Could not lock ' + channel.name + ': ' + error.message);
    }
  }
  store.update(guild.id, config => { config.lockdown = { active: true, changed }; });
  incident(guild, 'lockdown', null, reason, 'critical');
  await log(guild, '🚨 **Lockdown enabled.** ' + reason);
  return true;
}

async function restoreLockdown(guild) {
  const cfg = store.get(guild.id);
  for (const item of cfg.lockdown.changed || []) {
    const channel = guild.channels.cache.get(item.channelId) || await guild.channels.fetch(item.channelId).catch(() => null);
    if (channel?.permissionOverwrites?.edit) {
      await channel.permissionOverwrites.edit(guild.roles.everyone, item.before, { reason: 'NovaBot lockdown recovery' })
        .catch(error => log(guild, 'Restore failed: ' + error.message));
    }
  }
  store.update(guild.id, config => { config.lockdown = { active: false, changed: [] }; });
  await log(guild, '🔓 **Lockdown released.**');
}

async function handleDestructiveAudit(entry, label) {
  const guild = entry.guild;
  if (!guild) return;
  const cfg = store.get(guild.id);
  if (!cfg.enabled || !cfg.antiNuke.enabled) return;
  const actor = entry.executor;
  if (!actor || await trusted(cfg, actor.id, guild)) return;
  if (entry.action === AuditLogEvent.RoleUpdate && !(entry.changes || []).some(change => change.key === 'permissions')) return;
  if (entry.action === AuditLogEvent.MemberRoleUpdate && !(entry.changes || []).some(change => change.key === '$add' || change.key === '$remove')) return;

  incident(guild, label, actor.id, 'Actor ' + actor.tag + '; target ' + (entry.targetId || 'unknown'));
  if (entry.action === AuditLogEvent.BotAdd && entry.targetId) {
    const bot = await guild.members.fetch(entry.targetId).catch(() => null);
    if (bot?.user.bot && bot.bannable) await bot.ban({ reason: 'NovaBot anti-bot: unauthorized bot addition' }).catch(() => null);
  }

  const key = guild.id + ':' + actor.id;
  const list = recent(actionBuckets, key, Date.now(), cfg.antiNuke.windowMs);
  list.push(Date.now());
  await log(guild, '⚠️ Anti-nuke: ' + actor.tag + ' — ' + label + ' (' + list.length + '/' + cfg.antiNuke.limit + ').');
  if (list.length < cfg.antiNuke.limit) return;

  const member = await guild.members.fetch(actor.id).catch(() => null);
  const reason = 'Anti-nuke threshold exceeded';
  if (member) {
    if (cfg.antiNuke.punish === 'ban' && member.bannable) await member.ban({ reason }).catch(() => null);
    else if (cfg.antiNuke.punish === 'kick' && member.kickable) await member.kick(reason).catch(() => null);
    else if (member.moderatable) await member.timeout(3600000, reason).catch(() => null);
  }
  actionBuckets.set(key, []);
  incident(guild, 'anti-nuke threshold', actor.id, 'Threshold reached', 'critical');
  if (cfg.antiNuke.lockdown) await lockdown(guild, 'Anti-nuke threshold reached for ' + actor.tag);
}

async function onJoin(member) {
  const cfg = store.get(member.guild.id);
  if (!cfg.enabled || await trusted(cfg, member.id, member.guild)) return;

  const now = Date.now();
  const age = now - member.user.createdTimestamp;
  const gate = cfg.joinGate;
  const violations = [];
  if (gate.enabled) {
    if (gate.minAccountAgeMs > 0 && age < gate.minAccountAgeMs) violations.push('new account');
    if (gate.requireAvatar && !member.user.avatar) violations.push('no avatar');
    if (gate.usernameFilter && /discord(?:app)?\.com\/invite\/|discord\.gg\//i.test(member.user.username)) violations.push('advertising username');
  }

  if (violations.length) {
    incident(member.guild, 'join gate', member.id, 'Join filters: ' + violations.join(', '), 'high');
    await log(member.guild, '🚧 Join Gate flagged ' + member.user.tag + ': ' + violations.join(', '));
    if (gate.action === 'ban' && member.bannable) {
      await member.ban({ reason: 'NovaBot Join Gate: ' + violations.join(', ') }).catch(() => null);
      return;
    }
    if (gate.action === 'kick' && member.kickable) {
      await member.kick('NovaBot Join Gate: ' + violations.join(', ')).catch(() => null);
      return;
    }
  }

  const verification = cfg.verification;
  const quarantineId = verification.enabled
    ? verification.quarantineRoleId
    : (violations.length || (cfg.antiRaid.enabled && age < cfg.antiRaid.minAccountAgeMs))
      ? cfg.quarantineRoleId : null;
  if (quarantineId) {
    const role = await member.guild.roles.fetch(quarantineId).catch(() => null);
    if (role && member.manageable && !member.roles.cache.has(role.id)) {
      await member.roles.add(role, 'NovaBot Join Gate / verification / anti-raid gate').catch(() => null);
    }
  }

  if (age < cfg.antiRaid.minAccountAgeMs) {
    incident(member.guild, 'young account join', member.id, 'Account age below configured minimum', 'medium');
    await log(member.guild, '🛡️ Young account joined: ' + member.user.tag);
  }

  if (!cfg.antiRaid.enabled) return;
  raidJoiners.set(member.guild.id + ':' + member.id, now);
  const joins = recent(joinBuckets, member.guild.id, now, cfg.antiRaid.windowMs);
  joins.push(now);

  if (cfg.antiRaid.panicEnabled && joins.length >= cfg.antiRaid.panicJoinLimit && now >= cfg.antiRaid.panicUntil) {
    const panicUntil = now + cfg.antiRaid.panicDurationMs;
    store.update(member.guild.id, config => { config.antiRaid.panicUntil = panicUntil; });
    incident(member.guild, 'join raid panic', member.id, joins.length + ' joins triggered a ' + Math.round(cfg.antiRaid.panicDurationMs / 60000) + ' minute panic window', 'critical');
    await log(member.guild, '🚨 **Join Raid panic activated.** New joiners will be temporarily blocked from sending messages.');
  }
  if (joins.length >= cfg.antiRaid.joinLimit) {
    await lockdown(member.guild, joins.length + ' joins within raid detection window');
  }
}
function suspiciousLink(content, allowed = []) {
  const allow = new Set(allowed.map(value => value.toLowerCase().replace(/^www\./, '')));
  for (const raw of content.match(/https?:\/\/[^\s<>]+/gi) || []) {
    try {
      const url = new URL(raw.replace(/[),.!?]+$/, ''));
      const host = url.hostname.toLowerCase().replace(/^www\./, '');
      if (allow.has(host)) continue;
      if (host.startsWith('xn--') || host.split('.').some(part => part.startsWith('xn--')) ||
          /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) ||
          /^(bit\.ly|tinyurl\.com|cutt\.ly|t\.co|is\.gd)$/i.test(host)) return true;
      if (/(login|verify|wallet|nitro|gift|free)/i.test(url.pathname) &&
          /(discord|steam|wallet|account)/i.test(host)) return true;
    } catch {
      // Ignore malformed URLs rather than failing the message handler.
    }
  }
  return false;
}

async function onMessage(message) {
  if (!message.guild || (message.author.bot && !message.webhookId)) return false;
  const cfg = store.get(message.guild.id);
  const automod = cfg.automod;
  if (!cfg.enabled || !automod.enabled || (message.webhookId && !automod.webhookFilter)) return false;
  if (!message.webhookId && await trusted(cfg, message.author.id, message.guild)) return false;

  const now = Date.now();
  const raidKey = message.guild.id + ':' + message.author.id;
  const joinedAt = raidJoiners.get(raidKey);
  if (!message.webhookId && cfg.antiRaid.panicEnabled && now < cfg.antiRaid.panicUntil &&
      joinedAt && now - joinedAt <= cfg.antiRaid.panicDurationMs && !await trusted(cfg, message.author.id, message.guild)) {
    await message.delete().catch(() => null);
    if (message.member?.moderatable) {
      await message.member.timeout(Math.max(60000, cfg.antiRaid.panicUntil - now), 'NovaBot Join Raid panic').catch(() => null);
    }
    incident(message.guild, 'join raid panic action', message.author.id, 'Message blocked during active join-raid panic', 'high');
    await log(message.guild, '🚨 Join Raid panic action on ' + (message.author.tag || message.author.username));
    return true;
  }
  const key = message.guild.id + ':' + (message.webhookId || message.author.id);
  const list = (messageBuckets.get(key) || []).filter(item => now - item.at < automod.windowMs);
  const content = String(message.content || '').toLowerCase();
  const mentions = message.mentions.users.size + message.mentions.roles.size + (message.mentions.everyone ? 3 : 0);
  list.push({ at: now, content, mentions, attachments: message.attachments.size });
  messageBuckets.set(key, list);

  const signals = [];
  if (content && list.filter(item => item.content === content).length >= 3) signals.push({ type: 'repeated' });
  if (list.length >= automod.messageLimit) signals.push({ type: 'flood' });
  if (list.reduce((sum, item) => sum + item.mentions, 0) >= automod.mentionLimit) signals.push({ type: 'mentions' });
  if (list.filter(item => item.attachments > 0).length >= automod.attachmentLimit) signals.push({ type: 'attachments' });
  if (automod.inviteFilter && /discord\.gg\/|discord(?:app)?\.com\/invite\//i.test(content)) signals.push({ type: 'invite' });
  if (automod.linkFilter && suspiciousLink(content, automod.allowedDomains)) signals.push({ type: 'suspiciousLink' });
  if ((automod.blacklistedWords || []).some(word => word && content.includes(String(word).toLowerCase()))) signals.push({ type: 'blockedWord' });
  if (message.webhookId) signals.push({ type: 'webhook' });
  if (!signals.length) {
    const prior = heatBuckets.get(key);
    if (prior) heatBuckets.set(key, { heat: Math.max(0, prior.heat - Math.max(0, automod.heatDecayPerSecond) * ((now - prior.at) / 1000)), at: now });
    return false;
  }

  const previous = heatBuckets.get(key);
  const result = scoreHeat(previous, signals, now, {
    threshold: automod.heatEnabled ? automod.heatThreshold : 100,
    decayPerSecond: automod.heatDecayPerSecond
  });
  heatBuckets.set(key, { heat: result.heat, at: now });
  const instantViolation = signals.some(signal => ['invite', 'suspiciousLink', 'blockedWord'].includes(signal.type));
  if (!result.triggered && !instantViolation) return false;

  await message.delete().catch(() => null);
  const strikeState = strikeBuckets.get(key);
  const strikes = !strikeState || now - strikeState.at > 86400000 ? 1 : strikeState.count + 1;
  strikeBuckets.set(key, { count: strikes, at: now });
  const baseTimeout = Math.max(60000, Number(automod.timeoutBaseMs) || 300000);
  const capTimeout = Math.max(baseTimeout, Number(automod.timeoutCapMs) || 86400000);
  const timeoutMs = Math.min(capTimeout, baseTimeout * (2 ** Math.min(strikes - 1, 10)));
  if (message.member?.moderatable) {
    await message.member.timeout(timeoutMs, 'NovaBot Heat AutoMod: ' + signals.map(signal => signal.type).join(', ')).catch(() => null);
  }

  const details = 'Heat ' + Math.round(result.heat) + '/' + result.threshold +
    '; signals: ' + signals.map(signal => signal.type).join(', ') +
    '; strike ' + strikes + '; timeout ' + Math.round(timeoutMs / 60000) + 'm';
  incident(message.guild, 'heat automod', message.author.id, details, instantViolation ? 'high' : 'medium');
  heatBuckets.set(key, { heat: 0, at: now });
  await log(message.guild, '🔥 **Heat AutoMod triggered** for ' + (message.author.tag || message.author.username) + '. ' + details);
  return true;
}

const auditTypes = [
  [AuditLogEvent.ChannelCreate, 'channel creation'],
  [AuditLogEvent.ChannelDelete, 'channel deletion'],
  [AuditLogEvent.ChannelOverwriteCreate, 'channel overwrite creation'],
  [AuditLogEvent.ChannelOverwriteUpdate, 'channel overwrite update'],
  [AuditLogEvent.ChannelOverwriteDelete, 'channel overwrite deletion'],
  [AuditLogEvent.RoleCreate, 'role creation'],
  [AuditLogEvent.RoleDelete, 'role deletion'],
  [AuditLogEvent.RoleUpdate, 'role permission update'],
  [AuditLogEvent.MemberBanAdd, 'member ban'],
  [AuditLogEvent.MemberKick, 'member kick'],
  [AuditLogEvent.MemberRoleUpdate, 'member role change'],
  [AuditLogEvent.WebhookCreate, 'webhook creation'],
  [AuditLogEvent.WebhookUpdate, 'webhook update'],
  [AuditLogEvent.WebhookDelete, 'webhook deletion'],
  [AuditLogEvent.BotAdd, 'bot addition']
];

module.exports = {
  onJoin,
  onMessage,
  lockdown,
  restoreLockdown,
  log,
  incident,
  handleDestructiveAudit,
  auditTypes,
  suspiciousLink
};
