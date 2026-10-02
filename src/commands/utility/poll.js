const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");

module.exports = {
  name: "poll",
  category: "Utility",
  description: "Create a community poll with automatic reaction votes.",
  usage: "poll <question>",
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create a poll.")
    .addStringOption((opt) => opt.setName("question").setDescription("Poll question").setRequired(true)),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const author = isSlash ? context.user : context.author;

    let question;
    if (isSlash) {
      question = context.options.getString("question");
    } else {
      if (!args || !args.length) {
        return context.reply({ content: "❌ **Usage:** `,poll <question>`" });
      }
      question = args.join(" ");
    }

    const embed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle("📊 Community Poll")
      .setDescription(`**${question}**`)
      .setFooter({ text: `Poll started by ${author.tag || author.username}` })
      .setTimestamp();

    let pollMsg;
    if (isSlash) {
      pollMsg = await context.reply({ embeds: [embed], fetchReply: true });
    } else {
      pollMsg = await context.channel.send({ embeds: [embed] });
      if (context.deletable) await context.delete().catch(() => null);
    }

    try {
      await pollMsg.react("👍");
      await pollMsg.react("👎");
    } catch (e) {
      console.error("[Poll React Error]:", e.message);
    }
  },
};
