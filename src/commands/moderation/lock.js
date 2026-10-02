const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { sendModLog } = require("../../utils/modLogger");
const config = require("../../config");

module.exports = {
  name: "lock",
  category: "Moderation",
  description: "Lock a channel to prevent regular members from sending messages.",
  usage: "lock [#channel] [reason]",
  permissions: ["ManageChannels"],
  data: new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Lock a channel.")
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("The channel to lock (defaults to current)").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Reason for locking").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const author = isSlash ? context.user : context.author;

    let targetChannel, reason;

    if (isSlash) {
      targetChannel = context.options.getChannel("channel") || context.channel;
      reason = context.options.getString("reason") || "Channel locked by moderator";
    } else {
      if (args && args[0] && args[0].startsWith("<#") && args[0].endsWith(">")) {
        const chanId = args[0].replace(/[^0-9]/g, "");
        targetChannel = guild.channels.cache.get(chanId) || context.channel;
        reason = args.slice(1).join(" ") || "Channel locked by moderator";
      } else {
        targetChannel = context.channel;
        reason = args && args.length ? args.join(" ") : "Channel locked by moderator";
      }
    }

    if (!targetChannel.isTextBased()) {
      return context.reply({ content: "❌ Target channel must be a text-based channel.", ephemeral: true });
    }

    try {
      await targetChannel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: false,
        AddReactions: false,
      }, { reason: `${reason} | By ${author.tag || author.username}` });

      await sendModLog(guild, {
        action: "CHANNEL_LOCK",
        target: targetChannel.id,
        moderator: author,
        reason,
        fields: [{ name: "Channel", value: `<#${targetChannel.id}>`, inline: true }],
      });

      const embed = new EmbedBuilder()
        .setColor(config.theme.warning)
        .setTitle("🔒 Channel Locked")
        .setDescription(`This channel has been locked down by staff.`)
        .addFields({ name: "Reason", value: `\`\`\`${reason}\`\`\`` })
        .setTimestamp();

      await targetChannel.send({ embeds: [embed] });

      if (targetChannel.id !== context.channel.id) {
        return context.reply({ content: `🔒 Successfully locked <#${targetChannel.id}>.` });
      } else if (isSlash) {
        return context.reply({ content: "🔒 Channel successfully locked.", ephemeral: true });
      }
    } catch (err) {
      console.error("[Lock Error]:", err);
      return context.reply({ content: `❌ Failed to lock channel: ${err.message}`, ephemeral: true });
    }
  },
};
