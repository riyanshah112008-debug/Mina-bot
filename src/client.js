const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const db = require("./utils/database");
const config = require("./config");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
  ],
  presence: {
    status: "online",
    activities: [{ name: "?help | Mina Bot 🌸", type: 0 }],
  },
  partials: [
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.User,
    Partials.Reaction,
  ],
});

// Collections
client.commands = new Collection();
client.slashCommands = new Collection();
client.cooldowns = new Collection();

// Core references & State
client.db = db;
client.config = config;
client.videoVerificationSessions = new Map();
client.activeTicketTimers = new Map();
client.spamTracker = new Map();

module.exports = client;
