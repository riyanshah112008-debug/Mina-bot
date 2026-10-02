const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { sendModLog } = require("../../utils/modLogger");
const config = require("../../config");

module.exports = {
  name: "slowmode",
  aliases: ["slow"],
  category: "Moderation",
  description: "Set the slowmode delay for a channel (in seconds, 0 to disable).",
  usage: "slowmode <seconds> [#channel]",
  permissions: ["ManageChannels"],
  data: new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("Set channel slowmode.")
    .addIntegerOption((opt) =>
      opt
        .setName("seconds")
        .setDescription("Slowmode in seconds (0 to 21600)")
        .setMinValue(0)
        .setMaxValue(21600)
        .setRequired(true)
    )
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("Target channel (defaults to current)").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const author = isSlash ? context.user : context.author;

    let seconds, targetChannel;

    if (isSlash) {
      seconds = context.options.getInteger("seconds");
      targetChannel = context.options.getChannel("channel") || context.channel;
    } else {
      if (!args || !args[0]) {
        return context.reply({ content: "❌ **Usage:** `,slowmode <seconds> [#channel]`" });
      }
      seconds = parseInt(args[0], 10);
      if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
        return context.reply({ content: "❌ Please provide a valid number of seconds between 0 and 21600." });
      }
      if (args[1] && args[1].startsWith("<#")) {
        const chanId = args[1].replace(/[^0-9]/g, "");
        targetChannel = guild.channels.cache.get(chanId) || context.channel;
      } else {
        targetChannel = context.channel;
      }
    }

    if (!targetChannel.isTextBased()) {
      return context.reply({ content: "❌ Target channel must be a text-based channel.", ephemeral: true });
    }

    try {
      await targetChannel.setRateLimitPerUser(seconds, `Set by ${author.tag || author.username}`);

      await sendModLog(guild, {
        action: "SLOWMODE",
        target: targetChannel.id,
        moderator: author,
        reason: seconds === 0 ? "Disabled slowmode" : `Set slowmode to ${seconds}s`,
        fields: [{ name: "Channel", value: `<#${targetChannel.id}>`, inline: true }, { name: "Seconds", value: `${seconds}s`, inline: true }],
      });

      const embed = new EmbedBuilder()
        .setColor(config.theme.primary)
        .setTitle("⏱️ Slowmode Updated")
        .setDescription(
          seconds === 0
            ? `Slowmode has been **disabled** in <#${targetChannel.id}>.`
            : `Slowmode in <#${targetChannel.id}> is now set to **${seconds} seconds**.`
        )
        .setTimestamp();

      return context.reply({ embeds: [embed] });
    } catch (err) {
      console.error("[Slowmode Error]:", err);
      return context.reply({ content: `❌ Failed to update slowmode: ${err.message}`, ephemeral: true });
    }
  },
};
