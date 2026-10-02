const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const config = require("../../config");

module.exports = {
  name: "announce",
  category: "Utility",
  description: "Send an announcement embed to a channel.",
  usage: "announce <#channel> <message>",
  permissions: ["ManageGuild"],
  data: new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Send an announcement embed to a channel.")
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("Target channel").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("message").setDescription("Announcement content").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("title").setDescription("Optional announcement title").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const author = isSlash ? context.user : context.author;

    let targetChannel, messageContent, title;

    if (isSlash) {
      targetChannel = context.options.getChannel("channel");
      messageContent = context.options.getString("message");
      title = context.options.getString("title") || "📢 Server Announcement";
    } else {
      if (!args || args.length < 2) {
        return context.reply({ content: "❌ **Usage:** `,announce <#channel> <message>`" });
      }
      const chanId = args[0].replace(/[^0-9]/g, "");
      targetChannel = guild.channels.cache.get(chanId);
      messageContent = args.slice(1).join(" ");
      title = "📢 Server Announcement";
    }

    if (!targetChannel || !targetChannel.isTextBased()) {
      return context.reply({ content: "❌ Please specify a valid text channel for the announcement.", ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle(title)
      .setDescription(messageContent)
      .setFooter({ text: `Announcement by ${author.tag || author.username}` })
      .setTimestamp();

    try {
      await targetChannel.send({ embeds: [embed] });
      return context.reply({ content: `✅ Announcement successfully delivered to <#${targetChannel.id}>.`, ephemeral: true });
    } catch (err) {
      return context.reply({ content: `❌ Failed to send announcement: ${err.message}`, ephemeral: true });
    }
  },
};
