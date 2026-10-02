require("dotenv").config({ override: true });

/**
 * Robustly sanitizes bot tokens by stripping surrounding quotes,
 * accidental "Bot " prefixes, all whitespace (including internal spaces and line-wraps),
 * zero-width / control characters, and extracting the clean Discord token pattern.
 */
function sanitizeToken(token) {
  if (!token || typeof token !== "string") return "";
  let clean = token.trim();
  // Strip all quotes (single, double, backticks)
  clean = clean.replace(/['"`]/g, "");
  // Strip redundant "Bot " prefix if someone added it in env
  clean = clean.replace(/^bot\s*/i, "");
  // Remove all whitespace including spaces, tabs, newlines, and non-breaking spaces
  clean = clean.replace(/\s+/g, "");
  // Remove zero-width spaces, BOM, and other invisible control characters
  clean = clean.replace(/[\u200B-\u200D\uFEFF\u0000-\u001F\u007F-\u009F\u00A0]/g, "");
  // Extract standard Discord bot token pattern if embedded in formatting or extra text
  const match = clean.match(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{20,}/);
  if (match) {
    clean = match[0];
  }
  return clean;
}


const DEFAULT_CLIENT_ID = "1537694522426007582";
const DEFAULT_OWNER_IDS = ["1465049039153135639", "1233116813831962737"];

const rawPrefix = (process.env.BOT_PREFIX || process.env.PREFIX || "").trim().replace(/['"]/g, "");
// In Termux, $PREFIX is an internal system path (/data/data/com.termux/files/usr). Ensure we only use valid prefix tokens.
const DEFAULT_PREFIX =
  rawPrefix && !rawPrefix.startsWith("/") && rawPrefix.length <= 5 ? rawPrefix : "?";

const rawOwners = (process.env.OWNER_ID || process.env.OWNER_IDS || "")
  .split(",")
  .map((id) => id.trim().replace(/['"]/g, ""))
  .filter(Boolean);
const ownerIds = rawOwners.length > 0 ? rawOwners : DEFAULT_OWNER_IDS;

const rawToken =
  process.env.DISCORD_TOKEN ||
  process.env.TOKEN ||
  process.env.BOT_TOKEN ||
  process.env.DISCORD_BOT_TOKEN ||
  "";
const sanitizedToken = sanitizeToken(rawToken);

const rawClientId = (process.env.CLIENT_ID || process.env.APPLICATION_ID || "").trim().replace(/['"]/g, "");

const config = {
  token: sanitizedToken,
  clientId: rawClientId || DEFAULT_CLIENT_ID,
  prefix: DEFAULT_PREFIX,
  port: parseInt(process.env.PORT, 10) || 3000,
  ownerIds,
  mongoUri: (process.env.MONGO_URI || "").trim().replace(/['"]/g, ""),
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
  sanitizeToken,
  validate() {
    if (!this.token) {
      console.error(
        "[config] Missing DISCORD_TOKEN in environment. Please add DISCORD_TOKEN in Render Dashboard -> Environment."
      );
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
