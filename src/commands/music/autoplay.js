const { SlashCommandBuilder } = require("discord.js");
const { triggerAutoplayBuffer } = require("../../utils/musicManager");
const { StarryAudioEngine } = require("../../utils/nativeAudioEngine");

module.exports = {
  name: "autoplay",
  aliases: ["auto"],
  category: "Music",
  description: "Toggle smart autoplay recommendation when queue ends.",
  usage: "autoplay",
  data: new SlashCommandBuilder().setName("autoplay").setDescription("Toggle smart song recommendations."),

  async execute(context, args, client) {
    const kPlayer = client.manager?.getPlayer(context.guild.id);
    const nPlayer = StarryAudioEngine.getPlayer(context.guild.id);

    if (!kPlayer && !nPlayer) {
      return context.reply({ content: "❌ Nothing is currently playing in this server.", ephemeral: true });
    }

    if (kPlayer) {
      const current = Boolean(kPlayer.data?.get("autoplay") || kPlayer.autoplay);
      const newState = !current;
      kPlayer.data?.set("autoplay", newState);
      kPlayer.autoplay = newState;

      if (newState && kPlayer.queue.length === 0 && !kPlayer.playing) {
        await triggerAutoplayBuffer(kPlayer, true).catch(() => {});
      }

      return context.reply({
        content: `📻 **Smart Autoplay is now: \`${newState ? "ENABLED" : "DISABLED"}\`**\nWhen the queue ends, Mina will automatically pick similar tracks!`,
      });
    }

    if (nPlayer) {
      nPlayer.autoplay = !nPlayer.autoplay;
      const newState = nPlayer.autoplay;
      if (nPlayer.currentTrack) {
        await nPlayer.sendNowPlayingPanel(nPlayer.currentTrack, true).catch(() => {});
      }
      return context.reply({
        content: `📻 **Smart Autoplay is now: \`${newState ? "ENABLED" : "DISABLED"}\`**\nWhen the queue ends, Mina will automatically pick similar tracks!`,
      });
    }
  },
};
