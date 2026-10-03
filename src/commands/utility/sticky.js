const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const db = require("../../utils/database");
const config = require("../../config");

module.exports = {
  name: "sticky",
  aliases: ["stickymessage", "stick"],
  category: "Utility",
  description: "Set, view, or remove a sticky message that stays at the bottom of a channel.",
  usage: "sticky <set <message> | clear | view>",
  permissions: [PermissionFlagsBits.ManageMessages],
  data: new SlashCommandBuilder()
    .setName("sticky")
    .setDescription("Configure sticky messages pinned to the bottom of the channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set a message to stick to the bottom of a channel.")
        .addStringOption((opt) =>
          opt
            .setName("message")
            .setDescription("The content of the sticky message")
            .setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("The target channel (defaults to current channel)")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("clear")
        .setDescription("Remove the sticky message from a channel.")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("The target channel (defaults to current channel)")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("View the active sticky message in a channel.")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("The target channel (defaults to current channel)")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false)
        )
    ),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const author = isSlash ? context.user : context.author;
    const member = context.member;

    if (!member || !member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      const reply = { content: "❌ You need the **Manage Messages** permission to configure sticky messages.", ephemeral: true };
      return isSlash ? context.reply(reply) : context.reply(reply);
    }

    let subcmd = "view";
    let targetChannel = context.channel;
    let content = "";

    if (isSlash) {
      subcmd = context.options.getSubcommand();
      targetChannel = context.options.getChannel("channel") || context.channel;
      content = context.options.getString("message") || "";
    } else {
      const firstArg = args[0]?.toLowerCase();
      if (firstArg === "set") {
        subcmd = "set";
        // Check if second arg is a channel mention
        const channelMention = context.mentions.channels.first();
        if (channelMention) {
          targetChannel = channelMention;
          // Message is after the channel mention
          content = args.slice(2).join(" ").trim();
        } else {
          content = args.slice(1).join(" ").trim();
        }
      } else if (firstArg === "clear" || firstArg === "remove" || firstArg === "delete") {
        subcmd = "clear";
        const channelMention = context.mentions.channels.first();
        if (channelMention) targetChannel = channelMention;
      } else {
        subcmd = "view";
        const channelMention = context.mentions.channels.first();
        if (channelMention) targetChannel = channelMention;
      }
    }

    if (subcmd === "set") {
      if (!content) {
        const prefix = config.prefix || "?";
        return context.reply({
          content: `❌ Please provide the message content.\nExample: \`${prefix}sticky set Please read the #rules before chatting!\``,
        });
      }

      // Clean up previous sticky message if any
      const existing = db.getStickyMessage(targetChannel.id);
      if (existing?.lastMessageId) {
        try {
          const oldMsg = await targetChannel.messages.fetch(existing.lastMessageId).catch(() => null);
          if (oldMsg && oldMsg.deletable) await oldMsg.delete().catch(() => null);
        } catch (_) {}
      }

      // Send the initial sticky message
      const embed = new EmbedBuilder()
        .setColor(config.theme?.primary || 0x5865f2)
        .setTitle("📌 Sticky Notice")
        .setDescription(content)
        .setFooter({ text: "This message automatically sticks to the bottom of the channel." })
        .setTimestamp();

      const newMsg = await targetChannel.send({ embeds: [embed] }).catch(() => null);

      db.setStickyMessage(targetChannel.id, {
        guildId: guild.id,
        channelId: targetChannel.id,
        content,
        enabled: true,
        lastMessageId: newMsg ? newMsg.id : null,
        setBy: author.id,
        updatedAt: Date.now(),
      });

      return context.reply({
        content: `✅ **Sticky Message set!** It will automatically stay at the bottom of ${targetChannel}.`,
      });
    }

    if (subcmd === "clear") {
      const existing = db.getStickyMessage(targetChannel.id);
      if (!existing || !existing.enabled) {
        return context.reply({
          content: `ℹ️ There is no active sticky message in ${targetChannel}.`,
        });
      }

      if (existing.lastMessageId) {
        try {
          const oldMsg = await targetChannel.messages.fetch(existing.lastMessageId).catch(() => null);
          if (oldMsg && oldMsg.deletable) await oldMsg.delete().catch(() => null);
        } catch (_) {}
      }

      db.deleteStickyMessage(targetChannel.id);

      return context.reply({
        content: `🗑️ **Sticky message removed** from ${targetChannel}.`,
      });
    }

    // View
    const existing = db.getStickyMessage(targetChannel.id);
    if (!existing || !existing.enabled || !existing.content) {
      return context.reply({
        content: `ℹ️ No sticky message is configured for ${targetChannel}. Use \`sticky set <message>\` to create one!`,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(config.theme?.primary || 0x5865f2)
      .setTitle(`📌 Active Sticky Message in #${targetChannel.name}`)
      .setDescription(existing.content)
      .addFields(
        { name: "Set By", value: `<@${existing.setBy || "Unknown"}>`, inline: true },
        { name: "Last Updated", value: existing.updatedAt ? `<t:${Math.floor(existing.updatedAt / 1000)}:R>` : "Recently", inline: true }
      )
      .setFooter({ text: "Use 'sticky clear' to remove" });

    return context.reply({ embeds: [embed] });
  },
};
