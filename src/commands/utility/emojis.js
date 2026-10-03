const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");

module.exports = {
  name: "emojis",
  aliases: ["emojilist", "serveremojis"],
  category: "Utility",
  description: "Display an inventory of all custom static and animated emojis in this server.",
  usage: "emojis",
  data: new SlashCommandBuilder()
    .setName("emojis")
    .setDescription("Display an inventory of all custom emojis in this server."),

  async execute(context, args, client) {
    const guild = context.guild;
    if (!guild) {
      return context.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
    }

    const emojis = guild.emojis.cache;
    const staticEmojis = emojis.filter((e) => !e.animated);
    const animatedEmojis = emojis.filter((e) => e.animated);

    const staticPreview = Array.from(staticEmojis.values())
      .slice(0, 35)
      .map((e) => e.toString())
      .join(" ");

    const animatedPreview = Array.from(animatedEmojis.values())
      .slice(0, 35)
      .map((e) => e.toString())
      .join(" ");

    const embed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle(`✨ Custom Emojis (${emojis.size}) • ${guild.name}`)
      .addFields(
        {
          name: `Static Emojis (${staticEmojis.size})`,
          value: staticPreview.length > 0 ? staticPreview : "*None*",
          inline: false,
        },
        {
          name: `Animated Emojis (${animatedEmojis.size})`,
          value: animatedPreview.length > 0 ? animatedPreview : "*None*",
          inline: false,
        }
      )
      .setFooter({ text: `Total Emojis: ${emojis.size} • Server Tier: ${guild.premiumTier}` })
      .setTimestamp();

    return context.reply({ embeds: [embed] });
  },
};
