const config = require("../config");
const { loadSlashCommands } = require("../handlers/slashCommandLoader");
const { startPresenceRotator } = require("../modules/presence/statusManager");
const { createMusicManager } = require("../utils/musicManager");

module.exports = {
  name: "ready",
  once: true,
  async execute(...args) {
    const client = args[args.length - 1];
    if (!client || !client.user) return;

    console.log(`[Mina Bot] 🌸 Logged in as ${client.user.tag} (${client.user.id})`);
    console.log(`[Mina Bot] 📦 Loaded ${client.commands.size} commands across Moderation, Utility, Music, Tickets, & Verification`);

    // Initialize Music Engine (Lavalink v4 Cluster)
    try {
      createMusicManager(client);
    } catch (e) {
      console.warn("[Mina Bot] Music manager init warning:", e.message);
    }

    // Start automatic rotating presence (like Starry)
    try {
      startPresenceRotator(client);
    } catch (e) {
      console.warn("[Mina Bot] Could not initiate presence rotator:", e.message);
    }

    // Register slash commands
    try {
      await loadSlashCommands(client, config);
    } catch (err) {
      console.warn("[Mina Bot] Slash command registration error:", err.message);
    }
  },
};
