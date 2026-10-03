const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");

module.exports = {
  name: "coinflip",
  aliases: ["cf", "flip", "coin"],
  category: "Fun",
  description: "Flip a coin with optional heads or tails predictions.",
  usage: "coinflip [heads|tails]",
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin with optional heads or tails prediction.")
    .addStringOption((opt) =>
      opt
        .setName("prediction")
        .setDescription("Your guess (heads or tails)")
        .setRequired(false)
        .addChoices({ name: "Heads", value: "heads" }, { name: "Tails", value: "tails" })
    ),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const user = isSlash ? context.user : context.author;

    let prediction = isSlash ? context.options.getString("prediction") : args[0]?.toLowerCase();
    if (prediction && !["heads", "tails", "h", "t"].includes(prediction)) {
      prediction = null;
    }
    if (prediction === "h") prediction = "heads";
    if (prediction === "t") prediction = "tails";

    const isHeads = Math.random() < 0.5;
    const outcome = isHeads ? "heads" : "tails";
    const outcomeEmoji = isHeads ? "🪙 (Heads)" : "🔘 (Tails)";

    let resultText = `The coin landed on **${outcome.toUpperCase()}** ${outcomeEmoji}!`;
    let winColor = config.theme.primary;

    if (prediction) {
      if (prediction === outcome) {
        resultText += `\n\n🎉 **You called it correctly!** Nice intuition!`;
        winColor = config.theme.success;
      } else {
        resultText += `\n\n💔 **You predicted ${prediction}, but luck had other plans!**`;
        winColor = 0xED4245;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(winColor)
      .setTitle("🪙 Coinflip Result")
      .setDescription(resultText)
      .setFooter({ text: `Flipped by ${user.tag || user.username}` })
      .setTimestamp();

    return context.reply({ embeds: [embed] });
  },
};
