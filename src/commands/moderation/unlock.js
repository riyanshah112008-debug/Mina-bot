const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { sendModLog } = require("../../utils/modLogger");
const config = require("../../config");

module.exports = {
  name: "unlock",
  category: "Moderation",
  description: "Unlock a previously locked channel.",
  usage: "unlock [#channel]",
  permissions: ["ManageChannels"],
  data: new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("Unlock a channel.")
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("The channel to unlock (defaults to current)").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const author = isSlash ? context.user : context.author;

    let targetChannel;

    if (isSlash) {
      targetChannel = context.options.getChannel("channel") || context.channel;
    } else {
      if (args && args[0] && args[0].startsWith("<#") && args[0].endsWith(">")) {
        const chanId = args[0].replace(/[^0-9]/g, "");
        targetChannel = guild.channels.cache.get(chanId) || context.channel;
      } else {
        targetChannel = context.channel;
      }
    }

    if (!targetChannel.isTextBased()) {
      return context.reply({ content: "❌ Target channel must be a text-based channel.", ephemeral: true });
    }

    try {
      await targetChannel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: null,
        AddReactions: null,
      }, { reason: `Channel unlocked by ${author.tag || author.username}` });

      await sendModLog(guild, {
        action: "CHANNEL_UNLOCK",
        target: targetChannel.id,
        moderator: author,
        reason: "Channel unlocked",
        fields: [{ name: "Channel", value: `<#${targetChannel.id}>`, inline: true }],
      });

      const embed = new EmbedBuilder()
        .setColor(config.theme.success)
        .setTitle("🔓 Channel Unlocked")
        .setDescription(`This channel has been unlocked. Members can send messages again.`)
        .setTimestamp();

      await targetChannel.send({ embeds: [embed] });

      if (targetChannel.id !== context.channel.id) {
        return context.reply({ content: `🔓 Successfully unlocked <#${targetChannel.id}>.` });
      } else if (isSlash) {
        return context.reply({ content: "🔓 Channel successfully unlocked.", ephemeral: true });
      }
    } catch (err) {
      console.error("[Unlock Error]:", err);
      return context.reply({ content: `❌ Failed to unlock channel: ${err.message}`, ephemeral: true });
    }
  },
};
