const { SlashCommandBuilder } = require("discord.js");
const { StarryAudioEngine } = require("../../utils/nativeAudioEngine");

module.exports = {
  name: "resume",
  category: "Music",
  description: "Resume paused audio playback.",
  usage: "resume",
  data: new SlashCommandBuilder().setName("resume").setDescription("Resume paused audio playback."),

  async execute(context, args, client) {
    const kPlayer = client.manager?.getPlayer(context.guild.id);
    const nPlayer = StarryAudioEngine.getPlayer(context.guild.id);

    if (kPlayer && (kPlayer.playing || kPlayer.paused)) {
      if (!kPlayer.paused) {
        return context.reply({ content: "⚠️ Audio is already playing!", ephemeral: true });
      }
      kPlayer.pause(false);
      return context.reply({ content: "▶️ **Resumed audio playback.**" });
    }

    if (nPlayer && (nPlayer.isPlaying || nPlayer.currentTrack)) {
      if (!nPlayer.paused) {
        return context.reply({ content: "⚠️ Audio is already playing!", ephemeral: true });
      }
      nPlayer.pause(false);
      if (nPlayer.currentTrack) {
        await nPlayer.sendNowPlayingPanel(nPlayer.currentTrack, true).catch(() => {});
      }
      return context.reply({ content: "▶️ **Resumed audio playback.**" });
    }

    return context.reply({ content: "❌ Nothing is currently playing in this server.", ephemeral: true });
  },
};
