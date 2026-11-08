'use strict';
const fs = require('node:fs');
const path = require('node:path');

const dataDir = path.resolve(process.env.DATA_DIR || './data');
const file = path.join(dataDir, 'guilds.json');
const defaults = () => ({
  enabled: true,
  antiNuke: { enabled: true, windowMs: 10000, limit: 3, lockdown: true },
  antiRaid: { enabled: true, windowMs: 15000, joinLimit: 8, minAccountAgeMs: 86400000 },
  automod: { enabled: true, windowMs: 7000, messageLimit: 6, mentionLimit: 5, heatLimit: 100, inviteFilter: true },
  trusted: [],
  logChannelId: null,
  quarantineRoleId: null,
  lockdown: { active: false, changed: [] }
});
let cache = {};
function load() {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) cache = parsed;
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
    cache = {};
  }
}
function save() {
  fs.mkdirSync(dataDir, { recursive: true });
  const temp = file + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(cache, null, 2), { mode: 0o600 });
  fs.renameSync(temp, file);
}
function get(guildId) {
  if (!cache[guildId]) { cache[guildId] = defaults(); save(); }
  return cache[guildId];
}
function update(guildId, updater) {
  const current = get(guildId);
  updater(current);
  save();
  return current;
}
function all() { return cache; }
load();
module.exports = { get, update, all, save, defaults };
