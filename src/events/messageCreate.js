const db = require("../utils/database");
const config = require("../config");
const { handleAutomod } = require("../modules/automod/automodEngine");
const { formatDuration } = require("../utils/timeParser");

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;

    // 1. Automod Check
    const automodTriggered = await handleAutomod(message, client);
    if (automodTriggered) return;

    const guildId = message.guild.id;
    const authorId = message.author.id;

    // 2. AFK Handling
    // Check if the author is returning from AFK
    const authorAfk = db.getUserAfk(guildId, authorId);
    if (authorAfk) {
      db.removeUserAfk(guildId, authorId);
      const timeAway = formatDuration(Date.now() - authorAfk.timestamp);
      message.reply({
        content: `👋 Welcome back <@${authorId}>! I have removed your AFK status (You were away for ${timeAway}).`,
      }).then((m) => setTimeout(() => m.delete().catch(() => null), 6000)).catch(() => null);
    }

    // Check if any mentioned users are AFK
    if (message.mentions.users.size > 0) {
      for (const [userId, user] of message.mentions.users) {
        if (userId === authorId || user.bot) continue;
        const targetAfk = db.getUserAfk(guildId, userId);
        if (targetAfk) {
          const timeAgo = formatDuration(Date.now() - targetAfk.timestamp);
          message.reply({
            content: `💤 **${user.tag || user.username}** is currently AFK: \`${targetAfk.reason}\` (${timeAgo} ago)`,
          }).then((m) => setTimeout(() => m.delete().catch(() => null), 7000)).catch(() => null);
          break; // Avoid spamming multiple notifications in one message
        }
      }
    }

    // 3. Command Processing
    const settings = db.getGuildSettings(guildId);
    const prefix = settings.prefix || config.prefix;

    // Bot Mention Check: Reply with helpful prefix info
    const botMention = new RegExp(`^<@!?${client.user.id}>$`);
    if (botMention.test(message.content.trim())) {
      return message.reply({
        content: `🌸 **Mina Bot** is active! My command prefix in this server is: \`${prefix}\`\nType \`${prefix}help\` to view all commands, or use Slash commands (\`/\`).`,
      }).catch(() => null);
    }

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    const command =
      client.commands.get(commandName) ||
      Array.from(client.commands.values()).find((cmd) => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) return;

    // Permission check
    if (command.permissions && message.member) {
      const hasPerm = command.permissions.every((p) => message.member.permissions.has(p));
      if (!hasPerm) {
        return message.reply({
          content: `❌ You do not have permission to use the \`${commandName}\` command.`,
        }).catch(() => null);
      }
    }

    try {
      await command.execute(message, args, client);
    } catch (error) {
      console.error(`[Prefix Command Error] ${commandName}:`, error);
      message.reply({
        content: `❌ An error occurred while executing \`${commandName}\`: ${error.message}`,
      }).catch(() => null);
    }
  },
};
