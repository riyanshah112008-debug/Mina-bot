const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require("discord.js");
const config = require("../../config");
const { getSnipe } = require("../../utils/snipeManager");

module.exports = {
  name: "snipe",
  category: "Utility",
  description: "View the most recently deleted message in this channel.",
  usage: "snipe [#channel]",
  data: new SlashCommandBuilder()
    .setName("snipe")
    .setDescription("View the most recently deleted message in this channel.")
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Channel to snipe from (defaults to current channel)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const currentChannel = context.channel;

    let targetChannel = currentChannel;
    if (isSlash) {
      targetChannel = context.options.getChannel("channel") || currentChannel;
    } else if (context.mentions?.channels?.first()) {
      targetChannel = context.mentions.channels.first();
    } else if (args && args[0]) {
      const id = args[0].replace(/[^0-9]/g, "");
      targetChannel = context.guild?.channels?.cache?.get(id) || currentChannel;
    }

    const sniped = getSnipe(targetChannel.id);
    if (!sniped) {
      return context.reply({
        content: `🎯 There are no recently deleted messages recorded in <#${targetChannel.id}>!`,
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setAuthor({
        name: `${sniped.author?.tag || sniped.author?.username || "Unknown User"}`,
        iconURL: sniped.author?.displayAvatarURL ? sniped.author.displayAvatarURL({ dynamic: true }) : undefined,
      })
      .setDescription(sniped.content || "*[No text content - possible attachment or embed]*")
      .setFooter({ text: `Sniped from #${targetChannel.name} • Mina Snipe Engine` })
      .setTimestamp(sniped.timestamp);

    if (sniped.attachments && sniped.attachments.length > 0) {
      embed.setImage(sniped.attachments[0]);
    }

    return context.reply({ embeds: [embed] });
  },
};
