const { SlashCommandBuilder } = require("discord.js");
const { StarryAudioEngine } = require("../../utils/nativeAudioEngine");

module.exports = {
  name: "stop",
  aliases: ["leave", "disconnect", "dc"],
  category: "Music",
  description: "Stop playback, clear queue, and leave the voice channel.",
  usage: "stop",
  data: new SlashCommandBuilder().setName("stop").setDescription("Stop playback and disconnect."),

  async execute(context, args, client) {
    const kPlayer = client.manager?.getPlayer(context.guild.id);
    const nPlayer = StarryAudioEngine.getPlayer(context.guild.id);

    if (kPlayer) kPlayer.destroy();
    if (nPlayer) nPlayer.stop();

    if (!kPlayer && !nPlayer) {
      return context.reply({ content: "❌ No active audio session in this server.", ephemeral: true });
    }

    return context.reply({ content: "⏹️ **Audio playback stopped, queue cleared, and bot disconnected.**" });
  },
};
