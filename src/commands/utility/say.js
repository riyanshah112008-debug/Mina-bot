const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");

module.exports = {
  name: "say",
  aliases: ["echo", "repeat"],
  category: "Utility",
  description: "Send a message as Mina into the current or specified channel.",
  usage: "say [#channel] <message>",
  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Send a message as Mina into the current or specified channel.")
    .addStringOption((opt) =>
      opt.setName("message").setDescription("The message text to send").setRequired(true)
    )
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Channel to send the message to (default: current channel)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const member = context.member;
    const guild = context.guild;

    if (!guild) {
      return context.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
    }

    if (!member.permissions.has(PermissionFlagsBits.ManageMessages) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return context.reply({
        content: "❌ You need the **Manage Messages** permission to use the say command.",
        ephemeral: true,
      });
    }

    let targetChannel = context.channel;
    let messageText = "";

    if (isSlash) {
      targetChannel = context.options.getChannel("channel") || context.channel;
      messageText = context.options.getString("message");
    } else {
      if (context.mentions?.channels?.first()) {
        targetChannel = context.mentions.channels.first();
        args = args.filter((a) => !a.startsWith("<#"));
      }
      messageText = args.join(" ");

      // Delete the original command message if possible
      if (typeof context.delete === "function") {
        context.delete().catch(() => {});
      }
    }

    if (!messageText || messageText.trim().length === 0) {
      return context.reply({
        content: "❌ Please provide a message to send!",
        ephemeral: true,
      });
    }

    try {
      await targetChannel.send({ content: messageText });
      if (isSlash) {
        return context.reply({ content: `✅ Message sent to <#${targetChannel.id}>!`, ephemeral: true });
      }
    } catch (err) {
      return context.reply({ content: `❌ Could not send message: ${err.message}`, ephemeral: true });
    }
  },
};
