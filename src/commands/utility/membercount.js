const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");

function makeProgressBar(percent, length = 12) {
  const filled = Math.min(length, Math.max(0, Math.round((percent / 100) * length)));
  const empty = length - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

module.exports = {
  name: "membercount",
  aliases: ["mc", "members"],
  category: "Utility",
  description: "Display a visual breakdown of the server's member demographics.",
  usage: "membercount",
  data: new SlashCommandBuilder()
    .setName("membercount")
    .setDescription("Display a visual breakdown of the server's member demographics."),

  async execute(context, args, client) {
    const guild = context.guild;
    if (!guild) {
      return context.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
    }

    const total = guild.memberCount || 0;
    const cachedMembers = guild.members.cache;
    const bots = cachedMembers.filter((m) => m.user.bot).size;
    const humans = Math.max(0, total - bots);

    const humanPct = total > 0 ? Math.round((humans / total) * 100) : 0;
    const botPct = total > 0 ? Math.round((bots / total) * 100) : 0;

    const onlineCount = cachedMembers.filter(
      (m) => m.presence && m.presence.status !== "offline"
    ).size;

    const embed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle(`📊 Member Demographics • ${guild.name}`)
      .setDescription(
        `**Total Members:** \`${total.toLocaleString()}\`\n\n` +
        `👤 **Humans:** \`${humans.toLocaleString()}\` (${humanPct}%)\n` +
        `\`[${makeProgressBar(humanPct)}]\`\n\n` +
        `🤖 **Bots:** \`${bots.toLocaleString()}\` (${botPct}%)\n` +
        `\`[${makeProgressBar(botPct)}]\`\n\n` +
        `🟢 **Cached Online / Active:** \`${onlineCount.toLocaleString()}\``
      )
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setFooter({ text: `Guild ID: ${guild.id} • Created ${guild.createdAt.toLocaleDateString()}` })
      .setTimestamp();

    return context.reply({ embeds: [embed] });
  },
};
