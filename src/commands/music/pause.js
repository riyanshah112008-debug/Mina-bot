const { SlashCommandBuilder } = require("discord.js");
const { StarryAudioEngine } = require("../../utils/nativeAudioEngine");

module.exports = {
  name: "pause",
  category: "Music",
  description: "Pause the currently playing track.",
  usage: "pause",
  data: new SlashCommandBuilder().setName("pause").setDescription("Pause audio playback."),

  async execute(context, args, client) {
    const kPlayer = client.manager?.getPlayer(context.guild.id);
    const nPlayer = StarryAudioEngine.getPlayer(context.guild.id);

    if (kPlayer && (kPlayer.playing || kPlayer.paused)) {
      if (kPlayer.paused) {
        return context.reply({ content: "⚠️ The audio playback is already paused!", ephemeral: true });
      }
      kPlayer.pause(true);
      return context.reply({ content: "⏸️ **Paused the music.** Use `?resume` to continue." });
    }

    if (nPlayer && (nPlayer.isPlaying || nPlayer.currentTrack)) {
      if (nPlayer.paused) {
        return context.reply({ content: "⚠️ The audio playback is already paused!", ephemeral: true });
      }
      nPlayer.pause(true);
      if (nPlayer.currentTrack) {
        await nPlayer.sendNowPlayingPanel(nPlayer.currentTrack, true).catch(() => {});
      }
      return context.reply({ content: "⏸️ **Paused the music.** Use `?resume` to continue." });
    }

    return context.reply({ content: "❌ Nothing is currently playing in this server.", ephemeral: true });
  },
};
