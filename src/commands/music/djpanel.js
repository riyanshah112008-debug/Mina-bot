const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");
const { buildNowPlayingComponents, formatTime } = require("../../utils/musicManager");
const { StarryAudioEngine } = require("../../utils/nativeAudioEngine");

module.exports = {
  name: "djpanel",
  aliases: ["dj", "musicpanel"],
  category: "Music",
  description: "Deploy an interactive DJ control console with one-click buttons.",
  usage: "djpanel",
  data: new SlashCommandBuilder().setName("djpanel").setDescription("Open the interactive DJ music control desk."),

  async execute(context, args, client) {
    const kPlayer = client.manager?.getPlayer(context.guild.id);
    const nPlayer = StarryAudioEngine.getPlayer(context.guild.id);

    const isAutoplay = nPlayer ? nPlayer.autoplay : Boolean(kPlayer?.data?.get("autoplay") || kPlayer?.autoplay);
    const isPaused = nPlayer ? nPlayer.paused : Boolean(kPlayer?.paused);
    const loopMode = nPlayer ? (nPlayer.loop || "none") : (kPlayer?.loop || "none");

    const track = nPlayer?.currentTrack || kPlayer?.queue?.current;
    const title = track?.title || "Unknown Track";
    const url = track?.url || track?.uri || "https://discord.gg";
    const author = track?.author || "Unknown";
    const duration = track?.duration ? formatTime(track.duration) : (track?.length ? formatTime(track.length) : "0:00");
    const volume = nPlayer ? nPlayer.volume : (kPlayer ? kPlayer.volume : 100);

    const embed = new EmbedBuilder()
      .setColor(config.theme.primary || 0x5865f2)
      .setTitle("🎧 Mina Interactive DJ Control Desk")
      .setDescription(
        track
          ? `🎵 **Currently Playing:**\n**[${title}](${url})**\n👤 **Artist:** \`${author}\` • 🕒 **Duration:** \`${duration}\`\n🔊 **Volume:** \`${volume}%\` • 🔁 **Loop:** \`${loopMode.toUpperCase()}\``
          : `*No track currently active.* Use \`?play <song>\` to start playing music, then use the control desk below!`
      )
      .setFooter({ text: "Mina Hi-Fi Music Engine • Dynamic Equalizer & DSP Mastering" })
      .setTimestamp();

    const components = buildNowPlayingComponents(isAutoplay, isPaused, loopMode);
    return context.reply({ embeds: [embed], components });
  },
};
