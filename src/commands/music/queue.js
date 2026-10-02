const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");
const { formatTime } = require("../../utils/musicManager");
const { StarryAudioEngine } = require("../../utils/nativeAudioEngine");

module.exports = {
  name: "queue",
  aliases: ["q"],
  category: "Music",
  description: "View the list of upcoming songs in the server queue.",
  usage: "queue",
  data: new SlashCommandBuilder().setName("queue").setDescription("View upcoming songs in the queue."),

  async execute(context, args, client) {
    const kPlayer = client.manager?.getPlayer(context.guild.id);
    const nPlayer = StarryAudioEngine.getPlayer(context.guild.id);

    if (nPlayer && (nPlayer.isPlaying || nPlayer.currentTrack)) {
      const current = nPlayer.currentTrack;
      const tracks = nPlayer.queue.slice(0, 15);

      const trackList =
        tracks.length > 0
          ? tracks
              .map((t, idx) => `\`${idx + 1}.\` [${(t.title || "Track").substring(0, 50)}](${t.url || "https://discord.gg"}) • \`${formatTime(t.duration)}\``)
              .join("\n")
          : "*No upcoming tracks in queue.*";

      const remaining = nPlayer.queue.length > 15 ? `\n*... and **${nPlayer.queue.length - 15}** more songs.*` : "";

      const embed = new EmbedBuilder()
        .setColor(config.theme.primary || 0x5865f2)
        .setTitle(`🎶 Music Queue for ${context.guild.name}`)
        .setDescription(
          `**Now Playing:**\n[${current ? current.title : "None"}](${current ? current.url : ""}) • \`${formatTime(current ? current.duration : 0)}\`\n\n` +
            `**Up Next (${nPlayer.queue.length} songs):**\n${trackList}${remaining}`
        )
        .setFooter({
          text: `Volume: ${nPlayer.volume}% • Loop: ${(nPlayer.loop || "none").toUpperCase()} • Autoplay: ${nPlayer.autoplay ? "ON" : "OFF"}`,
        })
        .setTimestamp();

      return context.reply({ embeds: [embed] });
    }

    if (kPlayer && (kPlayer.playing || kPlayer.queue.current)) {
      const current = kPlayer.queue.current;
      const tracks = kPlayer.queue.slice(0, 15);

      const trackList =
        tracks.length > 0
          ? tracks
              .map((t, idx) => `\`${idx + 1}.\` [${t.title.substring(0, 50)}](${t.uri}) • \`${formatTime(t.length)}\``)
              .join("\n")
          : "*No upcoming tracks in queue.*";

      const remaining = kPlayer.queue.length > 15 ? `\n*... and **${kPlayer.queue.length - 15}** more songs.*` : "";

      const embed = new EmbedBuilder()
        .setColor(config.theme.primary || 0x5865f2)
        .setTitle(`🎶 Music Queue for ${context.guild.name}`)
        .setDescription(
          `**Now Playing:**\n[${current ? current.title : "None"}](${current ? current.uri : ""}) • \`${formatTime(current ? current.length : 0)}\`\n\n` +
            `**Up Next (${kPlayer.queue.length} songs):**\n${trackList}${remaining}`
        )
        .setFooter({
          text: `Volume: ${kPlayer.volume}% • Loop: ${(kPlayer.loop || "off").toUpperCase()} • Autoplay: ${kPlayer.autoplay ? "ON" : "OFF"}`,
        })
        .setTimestamp();

      return context.reply({ embeds: [embed] });
    }

    return context.reply({ content: "❌ There is no music currently playing in this server.", ephemeral: true });
  },
};
