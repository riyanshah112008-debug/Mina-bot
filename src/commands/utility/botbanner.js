const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");
const db = require("../../utils/database");
const { downloadAndValidateImage, extractImageSource, canManageBotProfile } = require("../../utils/imageHelper");

module.exports = {
  name: "botbanner",
  aliases: ["setbotbanner"],
  category: "Utility",
  description: "View, change, or reset Mina's profile banner for this server.",
  usage: "botbanner [image_url | attachment | reset]",
  data: new SlashCommandBuilder()
    .setName("botbanner")
    .setDescription("View, change, or reset Mina's profile banner for this server.")
    .addAttachmentOption((opt) =>
      opt.setName("image").setDescription("Upload a new server banner image").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("url").setDescription("Direct image URL or 'reset'").setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt.setName("reset").setDescription("Reset server banner back to default").setRequired(false)
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

    // 1. VIEW CURRENT BANNER IF NO ARGS / ATTACHMENT
    if (!source) {
      const serverBannerUrl = botMember.bannerURL({ dynamic: true, size: 1024 });
      const globalBannerUrl = client.user.bannerURL ? client.user.bannerURL({ dynamic: true, size: 1024 }) : null;
      const hasCustom = Boolean(serverBannerUrl);

      const embed = new EmbedBuilder()
        .setColor(config.theme.primary)
        .setTitle(`🎨 Server Bot Banner • ${guild.name}`)
        .setDescription(
          `**Current Server Status:** ${hasCustom ? "✨ Custom Server Banner Active" : "🌐 Default Profile Banner Active"}\n\n` +
          `• **Server Banner:** ${hasCustom ? `[View Full Image](${serverBannerUrl})` : "*None (Default)*"}\n\n` +
          `⚙️ **How to Change:**\n` +
          `• Upload an image with \`${prefix}botbanner\`\n` +
          `• Provide a link: \`${prefix}botbanner <image_url>\`\n` +
          `• Reset to default: \`${prefix}botbanner reset\``
        )
        .setFooter({ text: `Requested by ${author.tag || author.username}` })
        .setTimestamp();

      if (serverBannerUrl) {
        embed.setImage(serverBannerUrl);
      } else if (globalBannerUrl) {
        embed.setImage(globalBannerUrl);
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("botprofile_reset_banner")
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
        content: "❌ You need the **Manage Server** permission to change the bot's server banner.",
        ephemeral: true,
      });
    }

    if (isSlash && typeof context.deferReply === "function") {
      await context.deferReply().catch(() => {});
    }

    const replyFunc = isSlash
      ? (payload) => context.editReply(payload)
      : (payload) => context.reply(payload);

    // 3. RESET BANNER TO GLOBAL DEFAULT
    if (source.isReset) {
      const currentCustom = botMember.bannerURL();
      if (!currentCustom) {
        return replyFunc({
          content: "ℹ️ Mina is already using the default profile banner in this server.",
          ephemeral: true,
        });
      }

      try {
        await guild.members.editMe({
          banner: null,
          reason: `Server bot banner reset by ${author.tag} (${author.id})`,
        });

        db.updateGuildSettings(guild.id, { botBanner: null });

        const embed = new EmbedBuilder()
          .setColor(config.theme.success)
          .setTitle("✅ Server Banner Restored")
          .setDescription(`Mina's profile banner for **${guild.name}** has been reset to default.`)
          .setTimestamp();

        return replyFunc({ embeds: [embed] });
      } catch (err) {
        return handleProfileError(err, replyFunc);
      }
    }

    // 4. DOWNLOAD & APPLY NEW BANNER
    let pendingMsg = null;
    if (!isSlash && typeof context.reply === "function") {
      pendingMsg = await context.reply("⏳ Downloading and verifying banner image...").catch(() => null);
    }

    const downloadRes = await downloadAndValidateImage(source.url);
    if (!downloadRes.ok) {
      if (pendingMsg) pendingMsg.delete().catch(() => {});
      return replyFunc({ content: `❌ ${downloadRes.error}`, ephemeral: true });
    }

    try {
      await guild.members.editMe({
        banner: downloadRes.buffer,
        reason: `Server bot banner changed by ${author.tag} (${author.id})`,
      });

      db.updateGuildSettings(guild.id, { botBanner: source.url });

      if (pendingMsg) pendingMsg.delete().catch(() => {});

      const embed = new EmbedBuilder()
        .setColor(config.theme.success)
        .setTitle("✅ Server Banner Updated")
        .setDescription(
          `Mina's profile banner for **${guild.name}** has been successfully updated!\n\n` +
          `*(Note: Discord desktop and mobile clients may take a few moments to refresh their local cache)*`
        )
        .setImage(source.url)
        .setFooter({ text: `Updated by ${author.tag || author.username} • Use '${prefix}botbanner reset' to restore default` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("botprofile_reset_banner")
          .setLabel("Restore Default Banner")
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
  console.error("[botbanner error]:", err);
  if (err.status === 429 || err.code === 429) {
    return replyFunc({
      content: "⏳ Discord is currently rate-limiting banner changes for this bot in this server. Please wait 5–10 minutes before trying again.",
      ephemeral: true,
    });
  }
  if (err.code === 50035) {
    return replyFunc({
      content: "❌ Discord rejected this image format. Please make sure the image is an uncorrupted PNG, JPG, or WEBP file with reasonable dimensions.",
      ephemeral: true,
    });
  }
  if (err.code === 50013 || err.status === 403) {
    return replyFunc({
      content: "❌ The bot lacks permission to modify its server identity in this server.",
      ephemeral: true,
    });
  }
  return replyFunc({ content: `❌ Could not update bot banner: ${err.message}`, ephemeral: true });
}
