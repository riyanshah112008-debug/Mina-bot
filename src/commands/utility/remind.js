const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");
const db = require("../../utils/database");
const { parseDuration, formatDuration } = require("../../utils/timeParser");

module.exports = {
  name: "remind",
  aliases: ["reminder", "remindme"],
  category: "Utility",
  description: "Set a timed reminder for yourself.",
  usage: "remind <time> <reason> (e.g. ?remind 20m Take a break, ?remind 2h Finish homework)",
  data: new SlashCommandBuilder()
    .setName("remind")
    .setDescription("Set a timed reminder for yourself.")
    .addStringOption((opt) =>
      opt.setName("time").setDescription("Duration before reminder (e.g. 10m, 1h, 1d)").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("What you want to be reminded about").setRequired(true)
    ),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const user = isSlash ? context.user : context.author;
    const channel = context.channel;

    let timeStr = "";
    let reason = "";

    if (isSlash) {
      timeStr = context.options.getString("time");
      reason = context.options.getString("reason");
    } else {
      if (!args || args.length < 2) {
        return context.reply({
          content: "❌ Please provide a duration and reminder reason!\n**Example:** `?remind 30m Check pizza in the oven`",
          ephemeral: true,
        });
      }
      timeStr = args[0];
      reason = args.slice(1).join(" ");
    }

    const durationMs = parseDuration(timeStr);
    if (!durationMs || durationMs < 5000 || durationMs > 30 * 24 * 60 * 60 * 1000) {
      return context.reply({
        content: "❌ Please provide a valid duration between **5 seconds** and **30 days** (e.g. `10s`, `15m`, `2h`, `7d`).",
        ephemeral: true,
      });
    }

    const remindAt = Date.now() + durationMs;
    const readableTime = formatDuration(durationMs);

    const reminder = db.addReminder({
      userId: user.id,
      channelId: channel.id,
      guildId: context.guild?.id || null,
      reason: reason.trim(),
      createdAt: Date.now(),
      remindAt,
    });

    const embed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle("⏰ Reminder Scheduled!")
      .setDescription(
        `I will remind you in **${readableTime}** (<t:${Math.floor(remindAt / 1000)}:R>)!\n\n` +
        `📝 **Reason:** \`${reason.trim()}\``
      )
      .setFooter({ text: `Reminder ID: ${reminder.id}` })
      .setTimestamp();

    return context.reply({ embeds: [embed] });
  },
};
