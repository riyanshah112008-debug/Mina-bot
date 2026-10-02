const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");

module.exports = {
  name: "volume",
  aliases: ["vol", "v"],
  category: "Music",
  description: "Set the music playback volume (1-150%).",
  usage: "volume <1-150>",
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Adjust the music playback volume.")
    .addIntegerOption((opt) =>
      opt.setName("level").setDescription("Volume level percentage (1-150)").setRequired(true).setMinValue(1).setMaxValue(150)
    ),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const player = client.manager?.getPlayer(context.guild.id);

    if (!player) {
      return context.reply({ content: "❌ Nothing is currently playing in this server.", ephemeral: true });
    }

    let level;
    if (isSlash) {
      level = context.options.getInteger("level");
    } else {
      if (!args || !args[0]) {
        return context.reply({ content: `🔊 Current volume is: **${player.volume}%**` });
      }
      level = parseInt(args[0], 10);
    }

    if (isNaN(level) || level < 1 || level > 150) {
      return context.reply({ content: "❌ Volume must be a valid number between **1** and **150**.", ephemeral: true });
    }

    player.setVolume(level);
    return context.reply({ content: `🔊 **Volume set to ${level}%**` });
  },
};
