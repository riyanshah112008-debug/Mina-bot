const fs = require("fs");
const path = require("path");
const { REST, Routes, PermissionFlagsBits } = require("discord.js");

const permissionMap = {
  Administrator: PermissionFlagsBits.Administrator,
  BanMembers: PermissionFlagsBits.BanMembers,
  KickMembers: PermissionFlagsBits.KickMembers,
  ManageMessages: PermissionFlagsBits.ManageMessages,
  ManageChannels: PermissionFlagsBits.ManageChannels,
  ModerateMembers: PermissionFlagsBits.ModerateMembers,
  MoveMembers: PermissionFlagsBits.MoveMembers,
};

async function loadSlashCommands(client, config) {
  let commands = [];
  const seen = new Set();

  // 1. Load Master Starry Deploy Engine Payloads (Complete Global Suite)
  try {
    const deployModule = require("../../deploy-commands");
    const masterList = deployModule?.commands || [];
    for (const cmd of masterList) {
      if (cmd && cmd.name && !seen.has(cmd.name)) {
        seen.add(cmd.name);
        commands.push(cmd);
      }
    }
  } catch (err) {
    console.warn("[SlashCommands] Could not load deploy-commands:", err.message);
  }

  // 2. Discover any additional standalone commands in src/commands
  const commandsDir = path.join(__dirname, "../commands");

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.name.endsWith(".js")) continue;

      try {
        const command = require(fullPath);
        const commandName = command?.name || command?.data?.name;
        if (!command || !commandName || seen.has(commandName)) continue;

        if (command.slash !== false && command.data) {
          seen.add(commandName);
          const json = typeof command.data.toJSON === 'function' ? command.data.toJSON() : command.data;
          commands.push({
            ...json,
            default_member_permissions: json.default_member_permissions !== undefined ? json.default_member_permissions : null,
            integration_types: json.integration_types || [0, 1],
            contexts: json.contexts || [0, 1, 2],
          });
        } else if (command.slash !== false && typeof command.execute === 'function') {
          seen.add(commandName);
          const bitmask = command.permissions
            ? command.permissions.reduce((total, perm) => total | (permissionMap[perm] ?? 0n), 0n)
            : null;

          commands.push({
            name: command.name,
            description: command.description || "No description.",
            options: command.options || [],
            default_member_permissions: bitmask !== null ? String(bitmask) : null,
            integration_types: [0, 1],
            contexts: [0, 1, 2],
          });
        }
      } catch (e) {}
    }
  }

  if (fs.existsSync(commandsDir)) {
    walk(commandsDir);
  }

  // Enforce Discord 100 chat inputs hard limit to prevent DiscordAPIError[30032]
  const chatInputs = commands.filter(c => !c.type || c.type === 1).slice(0, 100);
  const contextMenus = commands.filter(c => c.type === 2 || c.type === 3).slice(0, 10);
  commands = [...chatInputs, ...contextMenus];

  // Register slash commands with Discord
  if (commands.length > 0 && config.token) {
    try {
      const rest = new REST({ version: "10" }).setToken(config.token);
      
      console.log(`[SlashCommands] Registering ${commands.length} slash commands...`);
      
      // Use guild commands for testing (instant), global for production
      const guildId = process.env.GUILD_ID; // Add to .env for testing
      
      try {
        if (guildId) {
          await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: commands });
          console.log(`[SlashCommands] ✅ Registered to guild ${guildId}`);
        } else {
          await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
          console.log(`[SlashCommands] ✅ Registered globally (may take 1 hour)`);
        }
      } catch (guildError) {
        // If guild registration fails, fall back to global
        if (guildId) {
          console.warn(`[SlashCommands] Guild registration failed, trying global...`);
          await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
          console.log(`[SlashCommands] ✅ Registered globally`);
        } else {
          throw guildError;
        }
      }
    } catch (error) {
      console.warn("[SlashCommands] Could not register slash commands:", error.message);
      console.log("[SlashCommands] Bot will work with prefix commands. Use prefix commands for now.");
    }
  }

  return commands;
}

module.exports = { loadSlashCommands };
