const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");
const db = require("../../utils/database");
const { downloadAndValidateImage, extractImageSource, canManageBotProfile } = require("../../utils/imageHelper");

module.exports = {
  name: "botavatar",
  aliases: ["botpfp", "setbotavatar", "setbotpfp"],
  category: "Utility",
  description: "View, change, or reset Mina's profile picture for this server.",
  usage: "botavatar [image_url | attachment | reset]",
  data: new SlashCommandBuilder()
    .setName("botavatar")
    .setDescription("View, change, or reset Mina's profile picture for this server.")
    .addAttachmentOption((opt) =>
      opt.setName("image").setDescription("Upload a new server avatar image").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("url").setDescription("Direct image URL or 'reset'").setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt.setName("reset").setDescription("Reset server avatar back to default").setRequired(false)
    ),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const author = isSlash ? context.user : context.author;
    const guild = context.guild;
    const member = context.member;

    if (!guild) {
      return context.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
    }

    const botMember = guild.members.me || (await guild.members.fetch(client.user.id).catch(() => null));
    if (!botMember) {
      return context.reply({ content: "❌ Could not retrieve bot member details in this server.", ephemeral: true });
    }

    const prefix = db.getGuildSettings(guild.id)?.prefix || config.prefix || "?";
    const source = extractImageSource(context, args, "image");

    // 1. VIEW CURRENT AVATAR IF NO ARGS / ATTACHMENT
    if (!source) {
      const serverAvatarUrl = botMember.avatarURL({ dynamic: true, size: 1024 });
      const globalAvatarUrl = client.user.displayAvatarURL({ dynamic: true, size: 1024 });
      const hasCustom = Boolean(serverAvatarUrl);

      const embed = new EmbedBuilder()
        .setColor(config.theme.primary)
        .setTitle(`🖼️ Server Bot Avatar • ${guild.name}`)
        .setDescription(
          `**Current Server Status:** ${hasCustom ? "✨ Custom Server Avatar Active" : "🌐 Default Global Avatar Active"}\n\n` +
          `• **Global Default:** [View Global Avatar](${globalAvatarUrl})\n` +
          `• **Server Avatar:** ${hasCustom ? `[View Server Avatar](${serverAvatarUrl})` : "*None (Using default)*"}\n\n` +
          `⚙️ **How to Change:**\n` +
          `• Upload an image with \`${prefix}botavatar\`\n` +
          `• Provide a link: \`${prefix}botavatar <image_url>\`\n` +
          `• Reset to default: \`${prefix}botavatar reset\``
        )
        .setThumbnail(serverAvatarUrl || globalAvatarUrl)
        .setFooter({ text: `Requested by ${author.tag || author.username}` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("botprofile_reset_avatar")
          .setLabel("Reset to Default")
          .setEmoji("🔄")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(!hasCustom)
      );

      return context.reply({ embeds: [embed], components: [row] });
    }

    // 2. PERMISSIONS GATE FOR MODIFICATION
    if (!canManageBotProfile(member)) {
      return context.reply({
        content: "❌ You need the **Manage Server** permission to change the bot's server avatar.",
        ephemeral: true,
      });
    }

    if (isSlash && typeof context.deferReply === "function") {
      await context.deferReply().catch(() => {});
    }

    const replyFunc = isSlash
      ? (payload) => context.editReply(payload)
      : (payload) => context.reply(payload);

    // 3. RESET AVATAR TO GLOBAL DEFAULT
    if (source.isReset) {
      const currentCustom = botMember.avatarURL();
      if (!currentCustom) {
        return replyFunc({
          content: "ℹ️ Mina is already using the default global avatar in this server.",
          ephemeral: true,
        });
      }

      try {
        await guild.members.editMe({
          avatar: null,
          reason: `Server bot avatar reset by ${author.tag} (${author.id})`,
        });

        db.updateGuildSettings(guild.id, { botAvatar: null });

        const embed = new EmbedBuilder()
          .setColor(config.theme.success)
          .setTitle("✅ Server Avatar Restored")
          .setDescription(`Mina's avatar for **${guild.name}** has been restored to the default global avatar.`)
          .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
          .setTimestamp();

        return replyFunc({ embeds: [embed] });
      } catch (err) {
        return handleProfileError(err, replyFunc);
      }
    }

    // 4. DOWNLOAD & APPLY NEW AVATAR
    let pendingMsg = null;
    if (!isSlash && typeof context.reply === "function") {
      pendingMsg = await context.reply("⏳ Downloading and verifying image...").catch(() => null);
    }

    const downloadRes = await downloadAndValidateImage(source.url);
    if (!downloadRes.ok) {
      if (pendingMsg) pendingMsg.delete().catch(() => {});
      return replyFunc({ content: `❌ ${downloadRes.error}`, ephemeral: true });
    }

    try {
      await guild.members.editMe({
        avatar: downloadRes.buffer,
        reason: `Server bot avatar changed by ${author.tag} (${author.id})`,
      });

      db.updateGuildSettings(guild.id, { botAvatar: source.url });

      if (pendingMsg) pendingMsg.delete().catch(() => {});

      const embed = new EmbedBuilder()
        .setColor(config.theme.success)
        .setTitle("✅ Server Avatar Updated")
        .setDescription(
          `Mina's profile picture for **${guild.name}** has been successfully updated!\n\n` +
          `*(Note: Discord desktop and mobile clients may take a few moments to refresh their local avatar cache)*`
        )
        .setThumbnail(source.url)
        .setFooter({ text: `Updated by ${author.tag || author.username} • Use '${prefix}botavatar reset' to restore default` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("botprofile_reset_avatar")
          .setLabel("Restore Global Avatar")
          .setEmoji("🔄")
          .setStyle(ButtonStyle.Secondary)
      );

      return replyFunc({ embeds: [embed], components: [row] });
    } catch (err) {
      if (pendingMsg) pendingMsg.delete().catch(() => {});
      return handleProfileError(err, replyFunc);
    }
  },
};

function handleProfileError(err, replyFunc) {
  console.error("[botavatar error]:", err);
  if (err.status === 429 || err.code === 429) {
    return replyFunc({
      content: "⏳ Discord is currently rate-limiting avatar changes for this bot in this server. Please wait 5–10 minutes before trying again.",
      ephemeral: true,
    });
  }
  if (err.code === 50035) {
    return replyFunc({
      content: "❌ Discord rejected this image format. Please make sure the image is an uncorrupted PNG, JPG, or WEBP file.",
      ephemeral: true,
    });
  }
  if (err.code === 50013 || err.status === 403) {
    return replyFunc({
      content: "❌ The bot lacks permission to modify its server identity in this server.",
      ephemeral: true,
    });
  }
  return replyFunc({ content: `❌ Could not update bot avatar: ${err.message}`, ephemeral: true });
}
