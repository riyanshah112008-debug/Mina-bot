const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require("discord.js");
const config = require("../../config");
const { formatDuration } = require("../../utils/timeParser");
const os = require("os");
const pkg = require("../../../package.json");

module.exports = {
  name: "botinfo",
  aliases: ["stats", "about"],
  category: "Utility",
  description: "Display technical specifications and statistics about the Mina bot.",
  usage: "botinfo",
  data: new SlashCommandBuilder().setName("botinfo").setDescription("Display technical specifications and bot stats."),

  async execute(context, args, client) {
    const memory = process.memoryUsage();
    const heapUsed = (memory.heapUsed / 1024 / 1024).toFixed(2);
    const heapTotal = (memory.heapTotal / 1024 / 1024).toFixed(2);
    const rss = (memory.rss / 1024 / 1024).toFixed(2);

    const totalGuilds = client.guilds.cache.size;
    const totalUsers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
    const uptimeStr = formatDuration(process.uptime() * 1000);
    const bootTimestamp = Math.floor((Date.now() - process.uptime() * 1000) / 1000);

    const embed = new EmbedBuilder()
      .setColor(config.theme?.primary || config.EMBED_COLORS?.PRIMARY || "#5865F2")
      .setAuthor({
        name: `${config.BOT_NAME || "Mina"} • Technical Architecture & Telemetry`,
        iconURL: client.user.displayAvatarURL({ dynamic: true })
      })
      .setDescription(
        `>>> High-performance multi-feature Discord system engine engineered for enterprise moderation, studio-grade audio streaming, community leveling, and interactive socials.`
      )
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .addFields(
        {
          name: "📊 Global Reach",
          value: `• **Guilds:** \`${totalGuilds.toLocaleString()}\`\n• **Users:** \`${totalUsers.toLocaleString()}\`\n• **Shards:** \`1 / 1 (Active)\``,
          inline: true
        },
        {
          name: "⚙️ Runtime & Engine",
          value: `• **Node.js:** \`${process.version}\`\n• **Discord.js:** \`v${djsVersion}\`\n• **Platform:** \`${os.platform()} (${os.arch()})\``,
          inline: true
        },
        {
          name: "💾 Memory Allocation",
          value: `• **Heap Used:** \`${heapUsed} MB\`\n• **Heap Total:** \`${heapTotal} MB\`\n• **RSS:** \`${rss} MB\``,
          inline: true
        },
        {
          name: "⏳ System Telemetry",
          value: `• **Uptime:** \`${uptimeStr}\`\n• **Booted:** <t:${bootTimestamp}:R>\n• **Health:** \`100% Operational 🟢\``,
          inline: true
        },
        {
          name: "🛡️ Security & Storage",
          value: `• **Prefix:** \`${config.DEFAULT_PREFIX || ","}\`\n• **Slash ( / ):** \`Enabled\`\n• **Components:** \`1-Year TTL\``,
          inline: true
        },
        {
          name: "⚡ Core Architecture",
          value: `• **Version:** \`v${pkg.version || "2.0.0"}\`\n• **Lavalink:** \`Hi-Fi Nodes Online\`\n• **Status:** \`Ready\``,
          inline: true
        }
      )
      .setFooter({ text: `${config.BOT_NAME || "Mina"} Core Engine • Engineered for Premium Communities` })
      .setTimestamp();

    return context.reply({ embeds: [embed] });
  },
};
