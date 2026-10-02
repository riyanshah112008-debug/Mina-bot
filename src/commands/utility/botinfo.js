const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require("discord.js");
const config = require("../../config");
const { formatDuration } = require("../../utils/timeParser");
const os = require("os");
const pkg = require("../../../package.json");

module.exports = {
  name: "botinfo",
  aliases: ["stats", "about"],
  category: "Utility",
  description: "Display technical specifications and statistics about the Friendbase bot.",
  usage: "botinfo",
  data: new SlashCommandBuilder().setName("botinfo").setDescription("Display bot stats."),

  async execute(context, args, client) {
    const memory = process.memoryUsage();
    const heapUsed = (memory.heapUsed / 1024 / 1024).toFixed(2);
    const heapTotal = (memory.heapTotal / 1024 / 1024).toFixed(2);
    const rss = (memory.rss / 1024 / 1024).toFixed(2);

    const totalGuilds = client.guilds.cache.size;
    const totalUsers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
    const uptimeStr = formatDuration(process.uptime() * 1000);

    const embed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle("🤖 Mina Bot Statistics")
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "Bot Version", value: `\`v${pkg.version}\``, inline: true },
        { name: "Node.js", value: `\`${process.version}\``, inline: true },
        { name: "Discord.js", value: `\`v${djsVersion}\``, inline: true },
        { name: "Uptime", value: `\`${uptimeStr}\``, inline: true },
        { name: "Servers", value: `\`${totalGuilds}\``, inline: true },
        { name: "Cached Users", value: `\`${totalUsers}\``, inline: true },
        { name: "RAM (Heap)", value: `\`${heapUsed} MB / ${heapTotal} MB\``, inline: true },
        { name: "RAM (RSS)", value: `\`${rss} MB\``, inline: true },
        { name: "Platform", value: `\`${os.platform()} (${os.arch()})\``, inline: true }
      )
      .setFooter({ text: "Mina Bot • Fast & Lightweight Core" })
      .setTimestamp();

    return context.reply({ embeds: [embed] });
  },
};
