require("dotenv").config({ override: true });

const rawPrefix = process.env.BOT_PREFIX || process.env.PREFIX;
// In Termux, $PREFIX is an internal system path (/data/data/com.termux/files/usr). Ensure we only use valid prefix tokens.
const DEFAULT_PREFIX = (rawPrefix && !rawPrefix.startsWith("/") && rawPrefix.length <= 5) ? rawPrefix : "?";

const ownerIds = (process.env.OWNER_ID || process.env.OWNER_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const config = {
  token: process.env.DISCORD_TOKEN || process.env.TOKEN || "",
  clientId: process.env.CLIENT_ID || "",
  prefix: DEFAULT_PREFIX,
  port: parseInt(process.env.PORT, 10) || 3000,
  ownerIds,
  mongoUri: process.env.MONGO_URI || "",
  automod: {
    enabled: process.env.AUTOMOD_ENABLED !== "false",
    maxMentions: Number(process.env.AUTOMOD_MAX_MENTIONS || 5),
    antiInvite: process.env.AUTOMOD_INVITES !== "false",
    antiLink: process.env.AUTOMOD_LINKS === "true",
    antiSpam: process.env.AUTOMOD_SPAM !== "false",
    spamThreshold: Number(process.env.AUTOMOD_SPAM_THRESHOLD || 5),
    spamWindowMs: Number(process.env.AUTOMOD_SPAM_WINDOW_MS || 5000),
  },
  theme: {
    primary: "#5865F2",
    success: "#57F287",
    danger: "#ED4245",
    warning: "#FEE75C",
    info: "#00F2FE",
  },
  validate() {
    if (!this.token) {
      console.error("[config] Missing DISCORD_TOKEN in environment (.env).");
      return false;
    }
    return true;
  },
  isOwner(userId) {
    if (!userId) return false;
    return this.ownerIds.includes(String(userId));
  },
};

module.exports = config;
