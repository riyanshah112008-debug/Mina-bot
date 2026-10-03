const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");

module.exports = {
  name: "dice",
  aliases: ["roll", "dado"],
  category: "Fun",
  description: "Roll one or more polyhedral dice (e.g. 1d6, 2d20, or custom sides).",
  usage: "roll [sides | countDsides] (e.g. ?roll 2d6, ?roll 20, ?roll)",
  data: new SlashCommandBuilder()
    .setName("dice")
    .setDescription("Roll polyhedral dice.")
    .addIntegerOption((opt) =>
      opt.setName("sides").setDescription("Number of sides per die (default: 6)").setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt.setName("count").setDescription("Number of dice to roll (default: 1, max: 10)").setRequired(false)
    ),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const user = isSlash ? context.user : context.author;

    let sides = 6;
    let count = 1;

    if (isSlash) {
      sides = context.options.getInteger("sides") || 6;
      count = context.options.getInteger("count") || 1;
    } else if (args && args[0]) {
      const match = args[0].match(/^(\d+)?d?(\d+)$/i);
      if (match) {
        if (match[1]) count = parseInt(match[1], 10);
        if (match[2]) sides = parseInt(match[2], 10);
      }
    }

    sides = Math.min(100, Math.max(2, sides));
    count = Math.min(10, Math.max(1, count));

    const rolls = [];
    let sum = 0;
    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      rolls.push(roll);
      sum += roll;
    }

    const embed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle("🎲 Dice Roll")
      .setDescription(
        count === 1
          ? `You rolled a **d${sides}** and got: **${rolls[0]}**!`
          : `You rolled **${count}d${sides}**:\n` +
            `• Individual Rolls: \`[${rolls.join(", ")}]\`\n` +
            `• **Total Sum:** **${sum}**`
      )
      .setFooter({ text: `Rolled by ${user.tag || user.username}` })
      .setTimestamp();

    return context.reply({ embeds: [embed] });
  },
};
