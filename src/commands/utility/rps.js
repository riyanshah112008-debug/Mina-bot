const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const config = require("../../config");

const CHOICES = {
  rock: { label: "Rock", emoji: "🪨", beats: "scissors" },
  paper: { label: "Paper", emoji: "📄", beats: "rock" },
  scissors: { label: "Scissors", emoji: "✂️", beats: "paper" },
};

function determineWinner(userChoice, botChoice) {
  if (userChoice === botChoice) return "tie";
  if (CHOICES[userChoice].beats === botChoice) return "win";
  return "lose";
}

function buildRpsResult(userChoice, botChoice, user) {
  const result = determineWinner(userChoice, botChoice);
  const u = CHOICES[userChoice];
  const b = CHOICES[botChoice];

  let title = "⚔️ Rock, Paper, Scissors";
  let desc = `You chose ${u.emoji} **${u.label}**\nMina chose ${b.emoji} **${b.label}**\n\n`;
  let color = config.theme.primary;

  if (result === "win") {
    title = "🎉 Victory!";
    desc += `**${u.label} beats ${b.label}!** You won! 🏆`;
    color = config.theme.success;
  } else if (result === "lose") {
    title = "💔 Defeat!";
    desc += `**${b.label} beats ${u.label}!** Mina won! Better luck next round!`;
    color = 0xED4245;
  } else {
    title = "🤝 It's a Tie!";
    desc += `Both chose **${u.label}**! Great minds think alike!`;
    color = 0xFEE75C;
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(desc)
    .setFooter({ text: `Played by ${user.tag || user.username}` })
    .setTimestamp();

  return { embeds: [embed], components: [] };
}

module.exports = {
  name: "rps",
  aliases: ["rockpaperscissors"],
  category: "Fun",
  description: "Play Rock, Paper, Scissors against Mina with interactive buttons.",
  usage: "rps [rock|paper|scissors]",
  data: new SlashCommandBuilder()
    .setName("rps")
    .setDescription("Play Rock, Paper, Scissors against Mina.")
    .addStringOption((opt) =>
      opt
        .setName("choice")
        .setDescription("Your move (or leave empty to use buttons)")
        .setRequired(false)
        .addChoices(
          { name: "🪨 Rock", value: "rock" },
          { name: "📄 Paper", value: "paper" },
          { name: "✂️ Scissors", value: "scissors" }
        )
    ),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const user = isSlash ? context.user : context.author;

    let userChoice = isSlash ? context.options.getString("choice") : args[0]?.toLowerCase();
    if (userChoice && ["r", "rock"].includes(userChoice)) userChoice = "rock";
    else if (userChoice && ["p", "paper"].includes(userChoice)) userChoice = "paper";
    else if (userChoice && ["s", "scissors"].includes(userChoice)) userChoice = "scissors";
    else userChoice = null;

    if (userChoice) {
      const keys = Object.keys(CHOICES);
      const botChoice = keys[Math.floor(Math.random() * keys.length)];
      const payload = buildRpsResult(userChoice, botChoice, user);
      return context.reply(payload);
    }

    // Interactive button lobby
    const embed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle("⚔️ Rock, Paper, Scissors")
      .setDescription("Click one of the buttons below to make your move against Mina!")
      .setFooter({ text: `Challenger: ${user.tag || user.username}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`rps_play_rock_${user.id}`)
        .setLabel("Rock")
        .setEmoji("🪨")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`rps_play_paper_${user.id}`)
        .setLabel("Paper")
        .setEmoji("📄")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`rps_play_scissors_${user.id}`)
        .setLabel("Scissors")
        .setEmoji("✂️")
        .setStyle(ButtonStyle.Danger)
    );

    return context.reply({ embeds: [embed], components: [row] });
  },

  async handleRpsInteraction(interaction, client) {
    const parts = interaction.customId.split("_"); // ["rps", "play", "rock", "userId"]
    const choice = parts[2];
    const targetUserId = parts[3];

    if (interaction.user.id !== targetUserId) {
      return interaction.reply({
        content: "❌ This Rock, Paper, Scissors game is for another player! Type `?rps` to start your own match.",
        ephemeral: true,
      });
    }

    const keys = Object.keys(CHOICES);
    const botChoice = keys[Math.floor(Math.random() * keys.length)];
    const payload = buildRpsResult(choice, botChoice, interaction.user);

    return interaction.update(payload);
  },
};
