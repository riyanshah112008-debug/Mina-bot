const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  name: "resume",
  category: "Music",
  description: "Resume paused audio playback.",
  usage: "resume",
  data: new SlashCommandBuilder().setName("resume").setDescription("Resume paused audio playback."),

  async execute(context, args, client) {
    const player = client.manager?.getPlayer(context.guild.id);
    if (!player) {
      return context.reply({ content: "❌ Nothing is currently playing in this server.", ephemeral: true });
    }

    if (!player.paused) {
      return context.reply({ content: "⚠️ Audio is already playing!", ephemeral: true });
    }

    player.pause(false);
    return context.reply({ content: "▶️ **Resumed audio playback.**" });
  },
};
