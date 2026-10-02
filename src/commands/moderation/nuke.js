const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { sendModLog } = require("../../utils/modLogger");
const config = require("../../config");

module.exports = {
  name: "nuke",
  category: "Moderation",
  description: "Re-create the current channel with identical permissions and purge all history.",
  usage: "nuke",
  permissions: ["ManageChannels"],
  data: new SlashCommandBuilder()
    .setName("nuke")
    .setDescription("Clones and nukes the current channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const channel = context.channel;
    const guild = context.guild;
    const author = isSlash ? context.user : context.author;

    if (!channel.isTextBased() || channel.isThread()) {
      return context.reply({ content: "❌ You cannot nuke this channel type.", ephemeral: true });
    }

    const confirmEmbed = new EmbedBuilder()
      .setColor(config.theme.danger)
      .setTitle("⚠️ Confirm Channel Nuke")
      .setDescription(
        `Are you sure you want to nuke <#${channel.id}>?\n\nThis will clone the channel settings and permanently delete all previous message history.`
      );

    const confirmButton = new ButtonBuilder()
      .setCustomId(`nuke_confirm_${author.id}`)
      .setLabel("Yes, Nuke Channel")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("💣");

    const cancelButton = new ButtonBuilder()
      .setCustomId(`nuke_cancel_${author.id}`)
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    const promptMessage = isSlash
      ? await context.reply({ embeds: [confirmEmbed], components: [row], fetchReply: true })
      : await channel.send({ embeds: [confirmEmbed], components: [row] });

    const filter = (i) => i.user.id === author.id && i.customId.startsWith("nuke_");

    try {
      const response = await promptMessage.awaitMessageComponent({ filter, time: 20000 });

      if (response.customId.startsWith("nuke_cancel_")) {
        await response.update({ content: "❌ Nuke cancelled.", embeds: [], components: [] });
        return;
      }

      await response.update({ content: "💣 Nuking channel in progress...", embeds: [], components: [] });

      const position = channel.position;
      const topic = channel.topic;
      const nsfw = channel.nsfw;
      const rateLimitPerUser = channel.rateLimitPerUser;
      const parent = channel.parent;
      const permissionOverwrites = channel.permissionOverwrites.cache.map((o) => ({
        id: o.id,
        allow: o.allow,
        deny: o.deny,
        type: o.type,
      }));

      const newChannel = await guild.channels.create({
        name: channel.name,
        type: channel.type,
        topic,
        nsfw,
        rateLimitPerUser,
        parent: parent ? parent.id : undefined,
        permissionOverwrites,
        position,
      });

      await channel.delete(`Channel nuked by ${author.tag || author.username}`);

      await sendModLog(guild, {
        action: "CHANNEL_NUKE",
        target: newChannel.id,
        moderator: author,
        reason: "Channel nuked and recreated",
        fields: [{ name: "New Channel", value: `<#${newChannel.id}>`, inline: true }],
      });

      const nukedEmbed = new EmbedBuilder()
        .setColor(config.theme.danger)
        .setTitle("💣 Channel Nuked")
        .setDescription(`This channel was nuked by <@${author.id}>.`)
        .setImage("https://media.giphy.com/media/oe33xf3B50fsc/giphy.gif")
        .setTimestamp();

      await newChannel.send({ embeds: [nukedEmbed] });
    } catch (e) {
      if (promptMessage && !promptMessage.deleted) {
        await promptMessage.edit({ content: "⏱️ Nuke confirmation timed out.", embeds: [], components: [] }).catch(() => null);
      }
    }
  },
};
