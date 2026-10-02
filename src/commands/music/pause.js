const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  name: "pause",
  category: "Music",
  description: "Pause the currently playing track.",
  usage: "pause",
  data: new SlashCommandBuilder().setName("pause").setDescription("Pause audio playback."),

  async execute(context, args, client) {
    const player = client.manager?.getPlayer(context.guild.id);
    if (!player || (!player.playing && !player.paused)) {
      return context.reply({ content: "❌ Nothing is currently playing in this server.", ephemeral: true });
    }

    if (player.paused) {
      return context.reply({ content: "⚠️ The audio playback is already paused!", ephemeral: true });
    }

    player.pause(true);
    return context.reply({ content: "⏸️ **Paused the music.** Use `?resume` to continue." });
  },
};
