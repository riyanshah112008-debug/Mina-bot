const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require("discord.js");
const config = require("../../config");
const { getEditSnipe } = require("../../utils/snipeManager");

module.exports = {
  name: "editsnipe",
  aliases: ["esnipe"],
  category: "Utility",
  description: "View the most recently edited message in this channel.",
  usage: "editsnipe [#channel]",
  data: new SlashCommandBuilder()
    .setName("editsnipe")
    .setDescription("View the most recently edited message in this channel.")
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Channel to snipe edits from (defaults to current channel)")
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

    const editSniped = getEditSnipe(targetChannel.id);
    if (!editSniped) {
      return context.reply({
        content: `✏️ There are no recently edited messages recorded in <#${targetChannel.id}>!`,
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setAuthor({
        name: `${editSniped.author?.tag || editSniped.author?.username || "Unknown User"}`,
        iconURL: editSniped.author?.displayAvatarURL ? editSniped.author.displayAvatarURL({ dynamic: true }) : undefined,
      })
      .addFields(
        { name: "🔴 Original Message", value: editSniped.oldContent.slice(0, 1024) || "*Empty*", inline: false },
        { name: "🟢 Edited Message", value: editSniped.newContent.slice(0, 1024) || "*Empty*", inline: false }
      )
      .setFooter({ text: `Edit sniped from #${targetChannel.name} • Mina Snipe Engine` })
      .setTimestamp(editSniped.timestamp);

    return context.reply({ embeds: [embed] });
  },
};
