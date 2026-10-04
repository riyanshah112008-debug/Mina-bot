const fs = require("fs");
const path = require("path");
const config = require("../config");

const dataDir = path.join(__dirname, "../data");
const dbFilePath = path.join(dataDir, "mina-store.json");
const oldFilePath = path.join(dataDir, "friendbase-store.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// In-memory data store structure
const defaultStore = {
  guild_settings: {},
  warnings: [],
  tickets_config: {},
  tickets: {},
  verification_config: {},
  video_verification_config: {},
  video_verifications: {},
  moderation_logs: [],
  afk: {},
  welcome_config: {},
  goodbye_config: {},
  autorole_config: {},
  giveaways: {},
  reminders: [],
  sticky_messages: {},
  social_stats: {},
  music_request_channels: {},
  counting_config: {},
  server_listings: {},
};

let store = { ...defaultStore };
let saveTimeout = null;

// Load store from disk (or migrate from previous file)
try {
  if (fs.existsSync(dbFilePath)) {
    const raw = fs.readFileSync(dbFilePath, "utf8");
    const parsed = JSON.parse(raw);
    store = { ...defaultStore, ...parsed };
    // Migrate legacy comma prefixes to current configured default prefix
    if (store.guild_settings) {
      for (const gid of Object.keys(store.guild_settings)) {
        if (store.guild_settings[gid].prefix === ",") {
          store.guild_settings[gid].prefix = config.prefix || "?";
        }
      }
    }
    console.log("[Mina DB] Loaded persistent data store successfully.");
  } else if (fs.existsSync(oldFilePath)) {
    const raw = fs.readFileSync(oldFilePath, "utf8");
    const parsed = JSON.parse(raw);
    store = { ...defaultStore, ...parsed };
    if (store.guild_settings) {
      for (const gid of Object.keys(store.guild_settings)) {
        if (store.guild_settings[gid].prefix === ",") {
          store.guild_settings[gid].prefix = config.prefix || "?";
        }
      }
    }
    fs.writeFileSync(dbFilePath, JSON.stringify(store, null, 2), "utf8");
    console.log("[Mina DB] Migrated persistent data store to mina-store.json.");
  } else {
    fs.writeFileSync(dbFilePath, JSON.stringify(store, null, 2), "utf8");
    console.log("[Mina DB] Created new persistent data store file.");
  }
} catch (err) {
  console.error("[Mina DB] Error loading database file, initializing defaults:", err.message);
}

// Atomic debounced save to disk
function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const tempPath = `${dbFilePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), "utf8");
      fs.renameSync(tempPath, dbFilePath);
    } catch (e) {
      console.error("[Mina DB] Error saving data store:", e.message);
    }
  }, 100);
}

function initializeDatabase() {
  console.log("[Mina DB] ✅ Unified Storage Engine ready.");
  return true;
}

// ================= Guild Settings =================
function getGuildSettings(guildId) {
  if (!store.guild_settings[guildId]) {
    store.guild_settings[guildId] = {
      guildId,
      prefix: config.prefix || "?",
      modLogChannel: null,
      adminRoles: [],
      modRoles: [],
      automod: {
        enabled: true,
        antiInvite: true,
        antiLink: false,
        antiSpam: true,
        antiMassMention: true,
        mentionLimit: 5,
        badWords: [],
      },
      updatedAt: new Date().toISOString(),
    };
    scheduleSave();
  }
  return store.guild_settings[guildId];
}

function updateGuildSettings(guildId, data) {
  const current = getGuildSettings(guildId);
  store.guild_settings[guildId] = {
    ...current,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  scheduleSave();
  return store.guild_settings[guildId];
}

// ================= Warnings =================
function addWarning(guildId, userId, moderatorId, reason = "No reason provided") {
  const warnId = (store.warnings.length + 1).toString();
  const warning = {
    id: warnId,
    guildId,
    userId,
    moderatorId,
    reason,
    timestamp: new Date().toISOString(),
  };
  store.warnings.push(warning);
  scheduleSave();
  return warning;
}

function getWarnings(guildId, userId) {
  return store.warnings.filter((w) => w.guildId === guildId && w.userId === userId);
}

function deleteWarning(warnId) {
  const initialLength = store.warnings.length;
  store.warnings = store.warnings.filter((w) => w.id !== warnId);
  const deleted = store.warnings.length < initialLength;
  if (deleted) scheduleSave();
  return deleted;
}

function clearWarnings(guildId, userId) {
  const before = store.warnings.length;
  store.warnings = store.warnings.filter((w) => !(w.guildId === guildId && w.userId === userId));
  const count = before - store.warnings.length;
  if (count > 0) scheduleSave();
  return count;
}

// ================= Moderation Logs =================
function addModLog(guildId, action, targetId, moderatorId, reason, details = {}) {
  const logEntry = {
    id: Date.now().toString(),
    guildId,
    action,
    targetId,
    moderatorId,
    reason: reason || "No reason provided",
    details,
    timestamp: new Date().toISOString(),
  };
  store.moderation_logs.unshift(logEntry);
  if (store.moderation_logs.length > 500) {
    store.moderation_logs = store.moderation_logs.slice(0, 500);
  }
  scheduleSave();
  return logEntry;
}

function getModLogs(guildId, limit = 20) {
  return store.moderation_logs.filter((l) => l.guildId === guildId).slice(0, limit);
}

// ================= Tickets =================
function getTicketConfig(guildId) {
  if (!store.tickets_config[guildId]) {
    store.tickets_config[guildId] = {
      guildId,
      panelChannelId: null,
      panelMessageId: null,
      categoryId: null,
      closedCategoryId: null,
      logChannelId: null,
      supportRoles: [],
      ticketCounter: 1,
    };
    scheduleSave();
  }
  return store.tickets_config[guildId];
}

function setTicketConfig(guildId, data) {
  const current = getTicketConfig(guildId);
  store.tickets_config[guildId] = { ...current, ...data };
  scheduleSave();
  return store.tickets_config[guildId];
}

function createTicketRecord(channelId, data) {
  store.tickets[channelId] = {
    channelId,
    guildId: data.guildId,
    userId: data.userId,
    username: data.username,
    category: data.category || "General Support",
    ticketNumber: data.ticketNumber,
    claimedBy: null,
    status: "open",
    createdAt: new Date().toISOString(),
    closedAt: null,
    closeReason: null,
    addedUsers: [],
  };
  scheduleSave();
  return store.tickets[channelId];
}

function getTicketRecord(channelId) {
  return store.tickets[channelId] || null;
}

function updateTicketRecord(channelId, data) {
  if (!store.tickets[channelId]) return null;
  store.tickets[channelId] = { ...store.tickets[channelId], ...data };
  scheduleSave();
  return store.tickets[channelId];
}

// ================= Normal Verification =================
function getVerificationConfig(guildId) {
  if (!store.verification_config[guildId]) {
    store.verification_config[guildId] = {
      guildId,
      channelId: null,
      verifiedRoleId: null,
      unverifiedRoleId: null,
      mode: "button", // 'button' | 'captcha'
      logChannelId: null,
    };
    scheduleSave();
  }
  return store.verification_config[guildId];
}

function setVerificationConfig(guildId, data) {
  const current = getVerificationConfig(guildId);
  store.verification_config[guildId] = { ...current, ...data };
  scheduleSave();
  return store.verification_config[guildId];
}

// ================= Video Verification in VC =================
function getVideoVerificationConfig(guildId) {
  if (!store.video_verification_config[guildId]) {
    store.video_verification_config[guildId] = {
      guildId,
      enabled: false,
      waitingVoiceId: null,
      verifyVoiceId: null,
      reviewerRoleId: null,
      videoVerifiedRoleId: null,
      alertChannelId: null,
      logChannelId: null,
    };
    scheduleSave();
  }
  return store.video_verification_config[guildId];
}

function setVideoVerificationConfig(guildId, data) {
  const current = getVideoVerificationConfig(guildId);
  store.video_verification_config[guildId] = { ...current, ...data };
  scheduleSave();
  return store.video_verification_config[guildId];
}

function createVideoVerificationSession(id, data) {
  store.video_verifications[id] = {
    id,
    guildId: data.guildId,
    userId: data.userId,
    username: data.username,
    status: "waiting", // 'waiting' | 'in_progress' | 'approved' | 'rejected'
    reviewerId: null,
    notes: "",
    hasCameraOn: false,
    joinedAt: new Date().toISOString(),
    completedAt: null,
  };
  scheduleSave();
  return store.video_verifications[id];
}

function getVideoVerificationSession(id) {
  return store.video_verifications[id] || null;
}

function updateVideoVerificationSession(id, data) {
  if (!store.video_verifications[id]) return null;
  store.video_verifications[id] = { ...store.video_verifications[id], ...data };
  scheduleSave();
  return store.video_verifications[id];
}

function getActiveVideoVerificationForUser(guildId, userId) {
  const entries = Object.values(store.video_verifications);
  return (
    entries.find(
      (e) => e.guildId === guildId && e.userId === userId && ["waiting", "in_progress"].includes(e.status)
    ) || null
  );
}

// ================= AFK System =================
function getUserAfk(guildId, userId) {
  const key = `${guildId}_${userId}`;
  return store.afk[key] || null;
}

function setUserAfk(guildId, userId, reason = "AFK") {
  const key = `${guildId}_${userId}`;
  store.afk[key] = {
    guildId,
    userId,
    reason,
    timestamp: Date.now(),
  };
  scheduleSave();
  return store.afk[key];
}

function removeUserAfk(guildId, userId) {
  const key = `${guildId}_${userId}`;
  if (store.afk[key]) {
    delete store.afk[key];
    scheduleSave();
    return true;
  }
  return false;
}

// ================= Welcome & Goodbye =================
function getWelcomeConfig(guildId) {
  if (!store.welcome_config[guildId]) {
    store.welcome_config[guildId] = {
      enabled: false,
      channelId: null,
      message: "Welcome to {server}, {user}! You are our {memberCount}th member! 🌸",
      useEmbed: true,
      embedColor: "#5865F2",
    };
  }
  return store.welcome_config[guildId];
}

function setWelcomeConfig(guildId, data) {
  const current = getWelcomeConfig(guildId);
  store.welcome_config[guildId] = { ...current, ...data };
  scheduleSave();
  return store.welcome_config[guildId];
}

function getGoodbyeConfig(guildId) {
  if (!store.goodbye_config[guildId]) {
    store.goodbye_config[guildId] = {
      enabled: false,
      channelId: null,
      message: "Goodbye {user}! We're sad to see you leave {server} (Member #{memberCount}). 🥀",
      useEmbed: true,
      embedColor: "#ED4245",
    };
  }
  return store.goodbye_config[guildId];
}

function setGoodbyeConfig(guildId, data) {
  const current = getGoodbyeConfig(guildId);
  store.goodbye_config[guildId] = { ...current, ...data };
  scheduleSave();
  return store.goodbye_config[guildId];
}

// ================= Autorole =================
function getAutoroleConfig(guildId) {
  if (!store.autorole_config[guildId]) {
    store.autorole_config[guildId] = {
      enabled: false,
      memberRoles: [],
      botRoles: [],
    };
  }
  return store.autorole_config[guildId];
}

function setAutoroleConfig(guildId, data) {
  const current = getAutoroleConfig(guildId);
  store.autorole_config[guildId] = { ...current, ...data };
  scheduleSave();
  return store.autorole_config[guildId];
}

// ================= Giveaways =================
function getGiveaway(messageId) {
  return store.giveaways[messageId] || null;
}

function setGiveaway(messageId, data) {
  store.giveaways[messageId] = { ...data, messageId };
  scheduleSave();
  return store.giveaways[messageId];
}

function getAllGiveaways() {
  return store.giveaways;
}

function deleteGiveaway(messageId) {
  if (store.giveaways[messageId]) {
    delete store.giveaways[messageId];
    scheduleSave();
    return true;
  }
  return false;
}

// ================= Reminders =================
function getReminders() {
  if (!Array.isArray(store.reminders)) store.reminders = [];
  return store.reminders;
}

function addReminder(data) {
  if (!Array.isArray(store.reminders)) store.reminders = [];
  const reminder = {
    id: `rem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    ...data,
  };
  store.reminders.push(reminder);
  scheduleSave();
  return reminder;
}

function removeReminder(id) {
  if (!Array.isArray(store.reminders)) store.reminders = [];
  const index = store.reminders.findIndex((r) => r.id === id);
  if (index !== -1) {
    store.reminders.splice(index, 1);
    scheduleSave();
    return true;
  }
  return false;
}

// ================= Sticky Messages =================
function getStickyMessage(channelId) {
  return store.sticky_messages[channelId] || null;
}

function setStickyMessage(channelId, data) {
  store.sticky_messages[channelId] = { ...data, channelId };
  scheduleSave();
  return store.sticky_messages[channelId];
}

function deleteStickyMessage(channelId) {
  if (store.sticky_messages[channelId]) {
    delete store.sticky_messages[channelId];
    scheduleSave();
    return true;
  }
  return false;
}

// ================= Social Action Stats =================
function getSocialStats(userA, userB) {
  const pairKey = [userA, userB].sort().join("_");
  return store.social_stats[pairKey] || {};
}

function incrementSocialStat(userA, userB, action) {
  const pairKey = [userA, userB].sort().join("_");
  if (!store.social_stats[pairKey]) {
    store.social_stats[pairKey] = {};
  }
  store.social_stats[pairKey][action] = (store.social_stats[pairKey][action] || 0) + 1;
  scheduleSave();
  return store.social_stats[pairKey][action];
}

// ================= Music Request Channel =================
function getMusicRequestChannel(guildId) {
  return store.music_request_channels[guildId] || null;
}

function setMusicRequestChannel(guildId, data) {
  store.music_request_channels[guildId] = data;
  scheduleSave();
  return store.music_request_channels[guildId];
}

function getAllMusicRequestChannels() {
  return store.music_request_channels || {};
}

// ================= Counting Config =================
function getCountingConfig(guildId) {
  return store.counting_config ? store.counting_config[guildId] || null : null;
}

function setCountingConfig(guildId, data) {
  if (!store.counting_config) store.counting_config = {};
  store.counting_config[guildId] = data;
  scheduleSave();
  return store.counting_config[guildId];
}

function getAllCountingConfigs() {
  return store.counting_config || {};
}

// ================= Server Listings =================
function getServerListing(guildId) {
  return store.server_listings ? store.server_listings[guildId] || null : null;
}

function setServerListing(guildId, data) {
  if (!store.server_listings) store.server_listings = {};
  store.server_listings[guildId] = { ...(store.server_listings[guildId] || {}), ...data };
  scheduleSave();
  return store.server_listings[guildId];
}

function getAllServerListings() {
  if (!store.server_listings) return [];
  return Object.values(store.server_listings);
}

module.exports = {
  initializeDatabase,
  getGuildSettings,
  updateGuildSettings,
  addWarning,
  getWarnings,
  deleteWarning,
  clearWarnings,
  addModLog,
  getModLogs,
  getTicketConfig,
  setTicketConfig,
  createTicketRecord,
  getTicketRecord,
  updateTicketRecord,
  getVerificationConfig,
  setVerificationConfig,
  getVideoVerificationConfig,
  setVideoVerificationConfig,
  createVideoVerificationSession,
  getVideoVerificationSession,
  updateVideoVerificationSession,
  getActiveVideoVerificationForUser,
  getUserAfk,
  setUserAfk,
  removeUserAfk,
  getWelcomeConfig,
  setWelcomeConfig,
  getGoodbyeConfig,
  setGoodbyeConfig,
  getAutoroleConfig,
  setAutoroleConfig,
  getGiveaway,
  setGiveaway,
  getAllGiveaways,
  deleteGiveaway,
  getReminders,
  addReminder,
  removeReminder,
  getStickyMessage,
  setStickyMessage,
  deleteStickyMessage,
  getSocialStats,
  incrementSocialStat,
  getMusicRequestChannel,
  setMusicRequestChannel,
  getAllMusicRequestChannels,
  getCountingConfig,
  setCountingConfig,
  getAllCountingConfigs,
  getServerListing,
  setServerListing,
  getAllServerListings,
};
