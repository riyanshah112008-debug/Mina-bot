const { ActivityType } = require("discord.js");
const config = require("../../config");

let presenceInterval = null;
let currentActivityIndex = 0;
let isPaused = false;

const activities = [
  (client, prefix) => ({
    name: `over ${client.guilds.cache.size} server${client.guilds.cache.size === 1 ? "" : "s"} | ${prefix}help`,
    type: ActivityType.Watching,
  }),
  (client, prefix) => ({
    name: `${prefix}help • Mina Bot Security & Tickets 🌸`,
    type: ActivityType.Playing,
  }),
  (client, prefix) => {
    let totalUsers = 0;
    if (client.guilds && client.guilds.cache) {
      if (typeof client.guilds.cache.reduce === "function") {
        totalUsers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
      } else {
        for (const g of client.guilds.cache.values()) {
          totalUsers += g.memberCount || 0;
        }
      }
    }
    return {
      name: `${totalUsers.toLocaleString()} members across community 👥`,
      type: ActivityType.Listening,
    };
  },
  (client, prefix) => ({
    name: `Mina Security & Dual Verification 🌸`,
    type: ActivityType.Streaming,
    url: "https://twitch.tv/discord",
  }),
  (client, prefix) => ({
    name: `${client.commands ? client.commands.size : 30}+ Commands | Slash & ${prefix}`,
    type: ActivityType.Watching,
  }),
  (client, prefix) => ({
    name: `server safety & automod desk 🛡️`,
    type: ActivityType.Watching,
  }),
];

/**
 * Updates the bot's presence to the next rotating activity.
 * @param {import("discord.js").Client} client
 */
function rotateStatus(client) {
  if (isPaused || !client || !client.user) return;

  const prefix = config.prefix || "?";
  const getActivity = activities[currentActivityIndex % activities.length];
  currentActivityIndex++;

  try {
    const activityData = getActivity(client, prefix);
    client.user.setPresence({
      activities: [activityData],
      status: "online",
    });
  } catch (err) {
    console.warn("[StatusManager] Error updating presence:", err.message);
  }
}

/**
 * Starts automatic presence rotation (like Starry).
 * Rotates smoothly every intervalMs (default 25 seconds to respect Discord ratelimits).
 * @param {import("discord.js").Client} client
 * @param {number} intervalMs
 */
function startPresenceRotator(client, intervalMs = 25000) {
  stopPresenceRotator();
  isPaused = false;

  // Apply immediately upon startup
  rotateStatus(client);

  presenceInterval = setInterval(() => {
    rotateStatus(client);
  }, intervalMs);

  // Re-apply on reconnect / shardResume so presence never goes offline
  if (client && typeof client.on === "function") {
    client.on("shardResume", () => {
      console.log("[StatusManager] Shard resumed, refreshing presence...");
      rotateStatus(client);
    });
  }

  console.log(`[StatusManager] 🌟 Automatic Starry-style rotating status initiated (Interval: ${Math.round(intervalMs / 1000)}s).`);
}

/**
 * Stops automatic rotation.
 */
function stopPresenceRotator() {
  if (presenceInterval) {
    clearInterval(presenceInterval);
    presenceInterval = null;
  }
}

/**
 * Sets a custom presence and optionally pauses auto-rotation.
 * @param {import("discord.js").Client} client
 * @param {Object} options
 * @param {boolean} [pauseRotation=true]
 */
function setCustomPresence(client, options, pauseRotation = true) {
  if (!client || !client.user) return;
  if (pauseRotation) isPaused = true;

  try {
    client.user.setPresence(options);
  } catch (err) {
    console.warn("[StatusManager] Error setting custom presence:", err.message);
  }
}

/**
 * Resumes automatic rotation if it was paused.
 * @param {import("discord.js").Client} client
 */
function resumePresenceRotator(client) {
  isPaused = false;
  rotateStatus(client);
}

module.exports = {
  startPresenceRotator,
  stopPresenceRotator,
  setCustomPresence,
  resumePresenceRotator,
  rotateStatus,
  activities,
};
