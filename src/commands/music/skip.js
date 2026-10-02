const { SlashCommandBuilder } = require("discord.js");
const { StarryAudioEngine } = require("../../utils/nativeAudioEngine");

module.exports = {
  name: "skip",
  aliases: ["s", "next"],
  category: "Music",
  description: "Skip to the next song in the queue.",
  usage: "skip",
  data: new SlashCommandBuilder().setName("skip").setDescription("Skip the current song."),

  async execute(context, args, client) {
    const kPlayer = client.manager?.getPlayer(context.guild.id);
    const nPlayer = StarryAudioEngine.getPlayer(context.guild.id);

    if (kPlayer && (kPlayer.playing || kPlayer.queue.current)) {
      const currentTitle = kPlayer.queue.current?.title || "Track";
      kPlayer.skip();
      return context.reply({ content: `⏭️ **Skipped:** \`${currentTitle}\`` });
    }

    if (nPlayer && (nPlayer.isPlaying || nPlayer.currentTrack)) {
      const currentTitle = nPlayer.currentTrack?.title || "Track";
      nPlayer.skip();
      return context.reply({ content: `⏭️ **Skipped:** \`${currentTitle}\`` });
    }

    return context.reply({ content: "❌ Nothing is currently playing in this server.", ephemeral: true });
  },
};
