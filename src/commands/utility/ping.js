const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");
const { formatDuration } = require("../../utils/timeParser");

module.exports = {
  name: "ping",
  category: "Utility",
  description: "Check bot latency, WebSocket heartbeat, and uptime.",
  usage: "ping",
  data: new SlashCommandBuilder().setName("ping").setDescription("Check bot latency and uptime."),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const sentTime = Date.now();

    const initialEmbed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setDescription("🏓 Pinging...");

    const sentMessage = isSlash
      ? await context.reply({ embeds: [initialEmbed], fetchReply: true })
      : await context.reply({ embeds: [initialEmbed] });

    const roundtrip = Date.now() - sentTime;
    const wsPing = Math.round(client.ws.ping);
    const uptimeStr = formatDuration(process.uptime() * 1000);

    const resultEmbed = new EmbedBuilder()
      .setColor(roundtrip < 200 ? config.theme.success : config.theme.warning)
      .setTitle("🏓 Pong!")
      .addFields(
        { name: "Roundtrip Latency", value: `\`${roundtrip}ms\``, inline: true },
        { name: "WebSocket Ping", value: `\`${wsPing >= 0 ? wsPing : 0}ms\``, inline: true },
        { name: "Uptime", value: `\`${uptimeStr}\``, inline: true }
      )
      .setTimestamp();

    if (isSlash) {
      await context.editReply({ embeds: [resultEmbed] });
    } else {
      await sentMessage.edit({ embeds: [resultEmbed] });
    }
  },
};
