const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");
const { formatTime, buildNowPlayingComponents } = require("../../utils/musicManager");
const { StarryAudioEngine } = require("../../utils/nativeAudioEngine");

module.exports = {
  name: "nowplaying",
  aliases: ["np", "current"],
  category: "Music",
  description: "Display details and controls for the currently playing track.",
  usage: "nowplaying",
  data: new SlashCommandBuilder().setName("nowplaying").setDescription("Display current track info & controls."),

  async execute(context, args, client) {
    const kPlayer = client.manager?.getPlayer(context.guild.id);
    const nPlayer = StarryAudioEngine.getPlayer(context.guild.id);

    if (nPlayer && (nPlayer.isPlaying || nPlayer.currentTrack)) {
      await nPlayer.sendNowPlayingPanel(nPlayer.currentTrack);
      if (context.isChatInputCommand && context.isChatInputCommand()) {
        return context.reply({ content: "🎶 Displayed Now Playing controls above.", ephemeral: true });
      }
      return;
    }

    if (kPlayer && (kPlayer.playing || kPlayer.queue.current)) {
      const track = kPlayer.queue.current;
      const isAutoplay = Boolean(kPlayer.data?.get("autoplay") || kPlayer.autoplay);
      const activeFilter = kPlayer.data?.get("activeFilter") || "empowering";

      const embed = new EmbedBuilder()
        .setColor(config.theme.primary || 0x5865f2)
        .setAuthor({
          name: `Now Playing • ${client.user ? client.user.username : "Mina Bot"}`,
          iconURL: client.user?.displayAvatarURL({ dynamic: true }),
        })
        .setTitle((track.title || "Unknown Track").substring(0, 95))
        .setURL(track.uri || "https://discord.gg")
        .setThumbnail(track.thumbnail || client.user?.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `👤 **Artist / Channel:** \`${track.author || "Featured Artist"}\`\n` +
            `🕒 **Duration:** \`${formatTime(kPlayer.position)} / ${formatTime(track.length)}\`\n` +
            `🌐 **Source:** \`${track.sourceName || "Lavalink Hi-Fi"}\`\n` +
            `🎛️ **DSP Preset:** \`${activeFilter.toUpperCase()}\`\n` +
            `🔊 **Volume:** \`${kPlayer.volume}%\` • 🔁 **Loop:** \`${(kPlayer.loop || "none").toUpperCase()}\``
        )
        .setFooter({
          text: `Requested by ${track.requester?.tag || track.requester?.username || "Community Member"} • Prefix: ?`,
        })
        .setTimestamp();

      const components = buildNowPlayingComponents(isAutoplay, kPlayer.paused, kPlayer.loop || "none");
      return context.reply({ embeds: [embed], components });
    }

    return context.reply({ content: "❌ Nothing is currently playing in this server.", ephemeral: true });
  },
};
