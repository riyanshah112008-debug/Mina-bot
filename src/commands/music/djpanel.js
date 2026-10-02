const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");
const { buildNowPlayingComponents, formatTime } = require("../../utils/musicManager");

module.exports = {
  name: "djpanel",
  aliases: ["dj", "musicpanel"],
  category: "Music",
  description: "Deploy an interactive DJ control console with one-click buttons.",
  usage: "djpanel",
  data: new SlashCommandBuilder().setName("djpanel").setDescription("Open the interactive DJ music control desk."),

  async execute(context, args, client) {
    const player = client.manager?.getPlayer(context.guild.id);
    const track = player?.queue?.current;
    const isAutoplay = Boolean(player?.data?.get("autoplay") || player?.autoplay);

    const embed = new EmbedBuilder()
      .setColor(config.theme.primary || 0x5865f2)
      .setTitle("🎧 Mina Interactive DJ Control Desk")
      .setDescription(
        track
          ? `🎵 **Currently Playing:**\n**[${track.title}](${track.uri})**\n👤 **Artist:** \`${track.author || "Unknown"}\` • 🕒 **Duration:** \`${formatTime(track.length)}\`\n🔊 **Volume:** \`${player.volume}%\` • 🔁 **Loop:** \`${(player.loop || "none").toUpperCase()}\``
          : `*No track currently active.* Use \`?play <song>\` to start playing music, then use the control desk below!`
      )
      .setFooter({ text: "Mina Hi-Fi Music Engine • 24/7 Cloud Lavalink Cluster" })
      .setTimestamp();

    const components = buildNowPlayingComponents(isAutoplay, player?.paused || false, player?.loop || "none");
    return context.reply({ embeds: [embed], components });
  },
};
