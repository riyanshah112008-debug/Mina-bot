const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  name: "stop",
  aliases: ["leave", "disconnect", "dc"],
  category: "Music",
  description: "Stop playback, clear queue, and leave the voice channel.",
  usage: "stop",
  data: new SlashCommandBuilder().setName("stop").setDescription("Stop playback and disconnect."),

  async execute(context, args, client) {
    const player = client.manager?.getPlayer(context.guild.id);
    if (!player) {
      return context.reply({ content: "❌ No active audio session in this server.", ephemeral: true });
    }

    player.destroy();
    return context.reply({ content: "⏹️ **Audio playback stopped, queue cleared, and bot disconnected.**" });
  },
};
