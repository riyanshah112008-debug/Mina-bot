'use strict';
const fs = require('node:fs');
const path = require('node:path');
const dataDir = path.resolve(process.env.DATA_DIR || './data');
const file = path.join(dataDir, 'guilds.json');
const defaults = () => ({
  enabled: true,
  antiNuke: { enabled: true, windowMs: 10000, limit: 3, lockdown: true, punish: 'timeout' },
  antiRaid: { enabled: true, windowMs: 15000, joinLimit: 8, minAccountAgeMs: 86400000, panicEnabled: true, panicJoinLimit: 6, panicDurationMs: 600000, panicUntil: 0 },
  joinGate: { enabled: false, minAccountAgeMs: 0, requireAvatar: false, usernameFilter: true, action: 'quarantine' },
  automod: { enabled: true, heatEnabled: true, heatThreshold: 100, heatDecayPerSecond: 2, windowMs: 7000, messageLimit: 6, mentionLimit: 5, attachmentLimit: 3, inviteFilter: true, linkFilter: true, webhookFilter: true, blacklistedWords: [], timeoutBaseMs: 300000, timeoutCapMs: 86400000, allowedDomains: [] },
  trusted: [], trustedRoles: [], incidents: [], logChannelId: null, quarantineRoleId: null,
  verification: { enabled: false, verifiedRoleId: null, quarantineRoleId: null },
  lockdown: { active: false, changed: [] }, music: { defaultVolume: 70, maxVolume: 100 }, reminders: []
});
let cache = {};
function load() {
  try { fs.mkdirSync(dataDir, { recursive: true }); const data = JSON.parse(fs.readFileSync(file, 'utf8')); if (data && typeof data === 'object' && !Array.isArray(data)) cache = data; }
  catch (error) { if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error; cache = {}; }
}
function save() { fs.mkdirSync(dataDir, { recursive: true }); const temp = file + '.tmp'; fs.writeFileSync(temp, JSON.stringify(cache, null, 2), { mode: 0o600 }); fs.renameSync(temp, file); }
function get(guildId) {
  if (!cache[guildId]) cache[guildId] = defaults();
  const cfg = cache[guildId], base = defaults();
  for (const key of Object.keys(base)) if (cfg[key] === undefined) cfg[key] = base[key];
  for (const key of ['antiNuke','antiRaid','joinGate','automod','verification','lockdown','music']) cfg[key] = { ...base[key], ...(cfg[key] || {}) };
  for (const key of ['trusted','trustedRoles','incidents','reminders']) if (!Array.isArray(cfg[key])) cfg[key] = [];
  if (!Array.isArray(cfg.automod.allowedDomains)) cfg.automod.allowedDomains = [];
  if (!Array.isArray(cfg.automod.blacklistedWords)) cfg.automod.blacklistedWords = [];
  cfg.automod.heatThreshold = Math.min(500, Math.max(10, Number(cfg.automod.heatThreshold) || 100));
  cfg.automod.heatDecayPerSecond = Math.min(50, Math.max(0, Number(cfg.automod.heatDecayPerSecond) || 0));
  return cfg;
}
function update(guildId, fn) { const cfg = get(guildId); fn(cfg); save(); return cfg; }
function all() { return cache; }
load();
module.exports = { get, update, all, save, defaults };
