const { Events } = require("discord.js");
const config = require("../config");
const { loadSlashCommands } = require("../handlers/slashCommandLoader");
const { startPresenceRotator } = require("../modules/presence/statusManager");
const { createMusicManager, Nodes } = require("../utils/musicManager");

module.exports = {
  name: Events.ClientReady || "ready",
  once: true,
  async execute(...args) {
    const client = args[args.length - 1];
    if (!client || !client.user) return;

    console.log(`[Mina Bot] 🌸 Logged in as ${client.user.tag} (${client.user.id})`);
    console.log(`[Mina Bot] 📦 Loaded ${client.commands.size} commands across Moderation, Utility, Music, Tickets, & Verification`);

    try {
      client.user.setStatus("online");
    } catch (e) {}

    // Initialize Music Engine (Lavalink v4 Cluster)
    try {
      const manager = createMusicManager(client);
      if (manager?.shoukaku?.connector && (!manager.shoukaku.nodes.size || Array.from(manager.shoukaku.nodes.values()).every((n) => n.state !== 1))) {
        manager.shoukaku.connector.ready(Nodes);
      }
    } catch (e) {
      console.warn("[Mina Bot] Music manager init warning:", e.message);
    }

    // Start automatic rotating presence (like Starry)
    try {
      startPresenceRotator(client);
    } catch (e) {
      console.warn("[Mina Bot] Could not initiate presence rotator:", e.message);
    }

    // Initialize Reminders background scheduler
    try {
      const { initReminders } = require("../modules/reminders/reminderManager");
      initReminders(client);
    } catch (e) {
      console.warn("[Mina Bot] Could not initiate reminders scheduler:", e.message);
    }

    // Initialize Giveaways auto-conclusion scheduler
    try {
      const { initGiveaways } = require("../modules/giveaways/giveawayManager");
      initGiveaways(client);
    } catch (e) {
      console.warn("[Mina Bot] Could not initiate giveaways scheduler:", e.message);
    }

    // Register slash commands
    try {
      await loadSlashCommands(client, config);
    } catch (err) {
      console.warn("[Mina Bot] Slash command registration error:", err.message);
    }
  },
};
