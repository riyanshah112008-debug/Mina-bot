const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");

const RESPONSES = [
  // Affirmative
  "It is certain. ✨",
  "It is decidedly so. 🌟",
  "Without a doubt! 🔮",
  "Yes definitely. 🌸",
  "You may rely on it.",
  "As I see it, yes. ✨",
  "Most likely.",
  "Outlook good. ☀️",
  "Yes!",
  "Signs point to yes. 🎯",
  // Non-committal
  "Reply hazy, try again. 🌫️",
  "Ask again later. ⏳",
  "Better not tell you now. 🤫",
  "Cannot predict now. 🌀",
  "Concentrate and ask again.",
  // Negative
  "Don't count on it. ❌",
  "My reply is no. 🚫",
  "My sources say no. 🌧️",
  "Outlook not so good. 🍂",
  "Very doubtful. 💀",
];

module.exports = {
  name: "8ball",
  aliases: ["ask", "fortune"],
  category: "Fun",
  description: "Ask the mystical 8-ball any question to reveal your destiny.",
  usage: "8ball <question>",
  data: new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the mystical 8-ball any question.")
    .addStringOption((opt) =>
      opt.setName("question").setDescription("The question you want to ask").setRequired(true)
    ),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const user = isSlash ? context.user : context.author;
    const question = isSlash ? context.options.getString("question") : args.join(" ");

    if (!question || question.trim().length === 0) {
      return context.reply({
        content: "❌ Please provide a question to ask the 8-ball!\n**Example:** `?8ball Will today be a great day?`",
        ephemeral: true,
      });
    }

    const answer = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];

    const embed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle("🎱 Mystical Magic 8-Ball")
      .addFields(
        { name: "❓ Question", value: question.slice(0, 1024), inline: false },
        { name: "🔮 Fate Speaks", value: `**${answer}**`, inline: false }
      )
      .setFooter({ text: `Consulted by ${user.tag || user.username}` })
      .setTimestamp();

    return context.reply({ embeds: [embed] });
  },
};
