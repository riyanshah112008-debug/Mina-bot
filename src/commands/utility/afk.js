const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../../utils/database");
const config = require("../../config");

module.exports = {
  name: "afk",
  category: "Utility",
  description: "Set an AFK status with an optional reason.",
  usage: "afk [reason]",
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Set yourself as AFK.")
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason for being AFK").setRequired(false)),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const author = isSlash ? context.user : context.author;

    let reason;
    if (isSlash) {
      reason = context.options.getString("reason") || "AFK";
    } else {
      reason = args && args.length ? args.join(" ") : "AFK";
    }

    db.setUserAfk(guild.id, author.id, reason);

    const embed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setDescription(`💤 <@${author.id}>, I have set your status to **AFK**: \`${reason}\`\n\nI will notify anyone who mentions you and automatically remove your AFK status when you speak next.`);

    return context.reply({ embeds: [embed] });
  },
};
