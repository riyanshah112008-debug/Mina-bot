const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");

const ICONS = ["🍒", "🍋", "🍇", "💎", "⭐", "7️⃣"];

module.exports = {
  name: "slots",
  aliases: ["slot", "casino"],
  category: "Fun",
  description: "Spin the casino slot machine reels to test your fortune.",
  usage: "slots",
  data: new SlashCommandBuilder()
    .setName("slots")
    .setDescription("Spin the casino slot machine reels."),

  async execute(context, args, client) {
    const user = typeof context.isChatInputCommand === "function" && context.isChatInputCommand()
      ? context.user
      : context.author;

    const r1 = ICONS[Math.floor(Math.random() * ICONS.length)];
    const r2 = ICONS[Math.floor(Math.random() * ICONS.length)];
    const r3 = ICONS[Math.floor(Math.random() * ICONS.length)];

    const isJackpot = r1 === r2 && r2 === r3;
    const isPair = (r1 === r2 || r2 === r3 || r1 === r3) && !isJackpot;

    let title = "🎰 Mina Casino Slots";
    let desc =
      `╔═════════════╗\n` +
      `║  ${r1}  ║  ${r2}  ║  ${r3}  ║  ◀\n` +
      `╚═════════════╝\n\n`;
    let color = config.theme.primary;

    if (isJackpot) {
      title = "💎 JACKPOT! 💎";
      desc += `🎉 **TRIPLE MATCH!** All three symbols matched! You hit the grand jackpot! 🌟`;
      color = 0xFEE75C;
    } else if (isPair) {
      title = "✨ Sweet Win!";
      desc += `⭐ **TWO OF A KIND!** Nice spin! You're on a roll!`;
      color = config.theme.success;
    } else {
      desc += `💔 **No match this round.** Spin again to test your luck!`;
      color = 0xED4245;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(desc)
      .setFooter({ text: `Spun by ${user.tag || user.username}` })
      .setTimestamp();

    return context.reply({ embeds: [embed] });
  },
};
