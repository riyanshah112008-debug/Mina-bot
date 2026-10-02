const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");
const { formatTime } = require("../../utils/musicManager");

module.exports = {
  name: "queue",
  aliases: ["q"],
  category: "Music",
  description: "View the list of upcoming songs in the server queue.",
  usage: "queue",
  data: new SlashCommandBuilder().setName("queue").setDescription("View upcoming songs in the queue."),

  async execute(context, args, client) {
    const player = client.manager?.getPlayer(context.guild.id);
    if (!player || (!player.playing && !player.queue.current)) {
      return context.reply({ content: "❌ There is no music currently playing in this server.", ephemeral: true });
    }

    const current = player.queue.current;
    const tracks = player.queue.slice(0, 15);

    const trackList =
      tracks.length > 0
        ? tracks
            .map((t, idx) => `\`${idx + 1}.\` [${t.title.substring(0, 50)}](${t.uri}) • \`${formatTime(t.length)}\``)
            .join("\n")
        : "*No upcoming tracks in queue.*";

    const remaining = player.queue.length > 15 ? `\n*... and **${player.queue.length - 15}** more songs.*` : "";

    const embed = new EmbedBuilder()
      .setColor(config.theme.primary || 0x5865f2)
      .setTitle(`🎶 Music Queue for ${context.guild.name}`)
      .setDescription(
        `**Now Playing:**\n[${current ? current.title : "None"}](${current ? current.uri : ""}) • \`${formatTime(current ? current.length : 0)}\`\n\n` +
          `**Up Next (${player.queue.length} songs):**\n${trackList}${remaining}`
      )
      .setFooter({
        text: `Volume: ${player.volume}% • Loop: ${(player.loop || "off").toUpperCase()} • Autoplay: ${player.autoplay ? "ON" : "OFF"}`,
      })
      .setTimestamp();

    return context.reply({ embeds: [embed] });
  },
};
