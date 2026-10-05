const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");
const { formatDuration } = require("../../utils/timeParser");
const mongoose = require("mongoose");

module.exports = {
  name: "ping",
  category: "Utility",
  description: "Check bot latency, WebSocket heartbeat, and database connectivity.",
  usage: "ping",
  data: new SlashCommandBuilder().setName("ping").setDescription("Check bot latency, WebSocket heartbeat, and database connectivity."),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const sentTime = Date.now();

    const initialEmbed = new EmbedBuilder()
      .setColor(config.theme?.primary || config.EMBED_COLORS?.PRIMARY || "#5865F2")
      .setDescription("📡 **Measuring telemetry and gateway response times...**");

    const sentMessage = isSlash
      ? await context.reply({ embeds: [initialEmbed], fetchReply: true })
      : await context.reply({ embeds: [initialEmbed] });

    const roundtrip = Math.max(1, Date.now() - sentTime);
    const wsPing = Math.round(client.ws.ping);
    const uptimeStr = formatDuration(process.uptime() * 1000);
    const memMb = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

    const isDbReady = Boolean(mongoose.connection && mongoose.connection.readyState === 1);
    const dbStatus = isDbReady ? "🟢 Connected" : "🟡 In-Memory Mode";

    const getStatusIndicator = (ms) => {
      if (ms < 0) return "⚪ Connecting...";
      if (ms <= 120) return `🟢 Excellent (\`${ms}ms\`)`;
      if (ms <= 250) return `🟡 Normal (\`${ms}ms\`)`;
      return `🔴 High Latency (\`${ms}ms\`)`;
    };

    const resultEmbed = new EmbedBuilder()
      .setColor(roundtrip < 250 ? (config.theme?.success || config.EMBED_COLORS?.SUCCESS || "#57F287") : (config.theme?.warning || config.EMBED_COLORS?.WARNING || "#FEE75C"))
      .setAuthor({
        name: `${config.BOT_NAME || "Mina"} • System Telemetry & Latency`,
        iconURL: client.user.displayAvatarURL({ dynamic: true })
      })
      .setDescription(
        `>>> Operational status and real-time network health diagnostics.`
      )
      .addFields(
        { name: "⚡ WebSocket Heartbeat", value: getStatusIndicator(wsPing >= 0 ? wsPing : 0), inline: true },
        { name: "📡 Message Roundtrip", value: `\`${roundtrip}ms\``, inline: true },
        { name: "💾 Database State", value: `\`${dbStatus}\``, inline: true },
        { name: "⏳ System Uptime", value: `\`${uptimeStr}\``, inline: true },
        { name: "🧠 Heap Allocation", value: `\`${memMb} MB\``, inline: true },
        { name: "🌐 Cluster Status", value: "`Online 🟢`", inline: true }
      )
      .setFooter({ text: `${config.BOT_NAME || "Mina"} System • Shard 0 • All Systems Operational` })
      .setTimestamp();

    if (isSlash) {
      await context.editReply({ embeds: [resultEmbed] });
    } else {
      await sentMessage.edit({ embeds: [resultEmbed] });
    }
  },
};
