const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");
const { formatTime, buildNowPlayingComponents } = require("../../utils/musicManager");

module.exports = {
  name: "nowplaying",
  aliases: ["np", "current"],
  category: "Music",
  description: "Display details and controls for the currently playing track.",
  usage: "nowplaying",
  data: new SlashCommandBuilder().setName("nowplaying").setDescription("Display current track info & controls."),

  async execute(context, args, client) {
    const player = client.manager?.getPlayer(context.guild.id);
    if (!player || (!player.playing && !player.queue.current)) {
      return context.reply({ content: "❌ Nothing is currently playing in this server.", ephemeral: true });
    }

    const track = player.queue.current;
    const isAutoplay = Boolean(player.data?.get("autoplay") || player.autoplay);
    const activeFilter = player.data?.get("activeFilter") || "empowering";

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
          `🕒 **Duration:** \`${formatTime(player.position)} / ${formatTime(track.length)}\`\n` +
          `🌐 **Source:** \`${track.sourceName || "Lavalink Hi-Fi"}\`\n` +
          `🎛️ **DSP Preset:** \`${activeFilter.toUpperCase()}\`\n` +
          `🔊 **Volume:** \`${player.volume}%\` • 🔁 **Loop:** \`${(player.loop || "none").toUpperCase()}\``
      )
      .setFooter({
        text: `Requested by ${track.requester?.tag || track.requester?.username || "Community Member"} • Prefix: ?`,
      })
      .setTimestamp();

    const components = buildNowPlayingComponents(isAutoplay, player.paused, player.loop || "none");
    return context.reply({ embeds: [embed], components });
  },
};
