const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const config = require("../../config");
const db = require("../../utils/database");
const { downloadAndValidateImage, extractImageSource, canManageBotProfile } = require("../../utils/imageHelper");

module.exports = {
  name: "botprofile",
  aliases: ["setbotprofile", "serverbotprofile"],
  category: "Utility",
  description: "Manage Mina's per-server identity (Profile Picture, Banner, & Nickname).",
  usage: "botprofile [avatar|banner|nick|reset] [image_url|nickname]",
  data: new SlashCommandBuilder()
    .setName("botprofile")
    .setDescription("Manage Mina's per-server identity (PFP, Banner, & Nickname).")
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("View the bot's current server identity and customizations.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("avatar")
        .setDescription("Set or reset the bot's profile picture for this server.")
        .addAttachmentOption((opt) =>
          opt.setName("image").setDescription("Upload an avatar image").setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName("url").setDescription("Direct image URL or 'reset'").setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt.setName("reset").setDescription("Reset server avatar to default").setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("banner")
        .setDescription("Set or reset the bot's profile banner for this server.")
        .addAttachmentOption((opt) =>
          opt.setName("image").setDescription("Upload a banner image").setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName("url").setDescription("Direct image URL or 'reset'").setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt.setName("reset").setDescription("Reset server banner to default").setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("nickname")
        .setDescription("Change or reset the bot's nickname in this server.")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("New nickname or 'reset'").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("reset")
        .setDescription("Reset all server customizations (Avatar, Banner, Nickname) back to default.")
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
    let subcommand = isSlash ? context.options.getSubcommand() : null;

    if (!isSlash) {
      const firstArg = args && args[0] ? args[0].toLowerCase() : null;
      if (firstArg === "avatar" || firstArg === "pfp") {
        subcommand = "avatar";
        args = args.slice(1);
      } else if (firstArg === "banner") {
        subcommand = "banner";
        args = args.slice(1);
      } else if (firstArg === "nick" || firstArg === "nickname") {
        subcommand = "nickname";
        args = args.slice(1);
      } else if (firstArg === "reset" || firstArg === "clear" || firstArg === "default") {
        subcommand = "reset";
      } else {
        subcommand = "view";
      }
    }

    // 1. SUBCOMMAND: VIEW
    if (subcommand === "view") {
      return sendProfileDashboard(context, botMember, client, prefix, author);
    }

    // PERMISSIONS CHECK FOR ANY MODIFICATION
    if (!canManageBotProfile(member)) {
      return context.reply({
        content: "❌ You need the **Manage Server** permission to modify the bot's server profile.",
        ephemeral: true,
      });
    }

    if (isSlash && typeof context.deferReply === "function") {
      await context.deferReply().catch(() => {});
    }

    const replyFunc = isSlash
      ? (payload) => context.editReply(payload)
      : (payload) => context.reply(payload);

    // 2. SUBCOMMAND: AVATAR
    if (subcommand === "avatar") {
      const source = extractImageSource(context, args, "image");
      if (!source) {
        return replyFunc({
          content: `❌ Please provide an image URL or upload an image file.\n**Usage:** \`${prefix}botprofile avatar <url>\` or \`${prefix}botprofile avatar reset\``,
          ephemeral: true,
        });
      }

      if (source.isReset) {
        try {
          await guild.members.editMe({
            avatar: null,
            reason: `Server avatar reset by ${author.tag} (${author.id})`,
          });
          db.updateGuildSettings(guild.id, { botAvatar: null });
          return replyFunc({
            embeds: [
              new EmbedBuilder()
                .setColor(config.theme.success)
                .setTitle("✅ Server Avatar Restored")
                .setDescription(`Mina's avatar in **${guild.name}** has been restored to the global default.`)
                .setThumbnail(client.user.displayAvatarURL({ dynamic: true })),
            ],
          });
        } catch (err) {
          return handleProfileError(err, replyFunc);
        }
      }

      const dl = await downloadAndValidateImage(source.url);
      if (!dl.ok) return replyFunc({ content: `❌ ${dl.error}`, ephemeral: true });

      try {
        await guild.members.editMe({
          avatar: dl.buffer,
          reason: `Server avatar set by ${author.tag} (${author.id})`,
        });
        db.updateGuildSettings(guild.id, { botAvatar: source.url });
        return replyFunc({
          embeds: [
            new EmbedBuilder()
              .setColor(config.theme.success)
              .setTitle("✅ Server Avatar Updated")
              .setDescription(`Mina's profile picture for **${guild.name}** has been updated!`)
              .setThumbnail(source.url),
          ],
        });
      } catch (err) {
        return handleProfileError(err, replyFunc);
      }
    }

    // 3. SUBCOMMAND: BANNER
    if (subcommand === "banner") {
      const source = extractImageSource(context, args, "image");
      if (!source) {
        return replyFunc({
          content: `❌ Please provide a banner image URL or upload an image file.\n**Usage:** \`${prefix}botprofile banner <url>\` or \`${prefix}botprofile banner reset\``,
          ephemeral: true,
        });
      }

      if (source.isReset) {
        try {
          await guild.members.editMe({
            banner: null,
            reason: `Server banner reset by ${author.tag} (${author.id})`,
          });
          db.updateGuildSettings(guild.id, { botBanner: null });
          return replyFunc({
            embeds: [
              new EmbedBuilder()
                .setColor(config.theme.success)
                .setTitle("✅ Server Banner Restored")
                .setDescription(`Mina's banner in **${guild.name}** has been reset to default.`),
            ],
          });
        } catch (err) {
          return handleProfileError(err, replyFunc);
        }
      }

      const dl = await downloadAndValidateImage(source.url);
      if (!dl.ok) return replyFunc({ content: `❌ ${dl.error}`, ephemeral: true });

      try {
        await guild.members.editMe({
          banner: dl.buffer,
          reason: `Server banner set by ${author.tag} (${author.id})`,
        });
        db.updateGuildSettings(guild.id, { botBanner: source.url });
        return replyFunc({
          embeds: [
            new EmbedBuilder()
              .setColor(config.theme.success)
              .setTitle("✅ Server Banner Updated")
              .setDescription(`Mina's profile banner for **${guild.name}** has been updated!`)
              .setImage(source.url),
          ],
        });
      } catch (err) {
        return handleProfileError(err, replyFunc);
      }
    }

    // 4. SUBCOMMAND: NICKNAME
    if (subcommand === "nickname") {
      let nick = isSlash ? context.options.getString("name")?.trim() : args.join(" ").trim();
      if (!nick) {
        return replyFunc({
          content: `❌ Please provide a new nickname or 'reset'.\n**Usage:** \`${prefix}botprofile nick <nickname>\``,
          ephemeral: true,
        });
      }

      const isReset = /^(reset|remove|clear|default)$/i.test(nick);
      const targetNick = isReset ? null : nick.slice(0, 32);

      try {
        await guild.members.editMe({
          nick: targetNick,
          reason: `Server nickname changed by ${author.tag} (${author.id})`,
        });

        return replyFunc({
          embeds: [
            new EmbedBuilder()
              .setColor(config.theme.success)
              .setTitle("✅ Server Nickname Updated")
              .setDescription(
                isReset
                  ? `Mina's nickname in **${guild.name}** has been restored to default: \`${client.user.username}\``
                  : `Mina's nickname in **${guild.name}** has been changed to: **${targetNick}**`
              ),
          ],
        });
      } catch (err) {
        return handleProfileError(err, replyFunc);
      }
    }

    // 5. SUBCOMMAND: RESET ALL
    if (subcommand === "reset") {
      try {
        await guild.members.editMe({
          avatar: null,
          banner: null,
          nick: null,
          reason: `All server bot customizations reset by ${author.tag} (${author.id})`,
        });

        db.updateGuildSettings(guild.id, { botAvatar: null, botBanner: null });

        return replyFunc({
          embeds: [
            new EmbedBuilder()
              .setColor(config.theme.success)
              .setTitle("✅ All Server Customizations Reset")
              .setDescription(
                `All server-specific profile customizations (Avatar, Banner, Nickname) for **${guild.name}** have been reset to global defaults.`
              )
              .setThumbnail(client.user.displayAvatarURL({ dynamic: true })),
          ],
        });
      } catch (err) {
        return handleProfileError(err, replyFunc);
      }
    }
  },

  handleBotProfileInteraction,
};

function buildDashboardEmbed(botMember, client, prefix, author) {
  const guild = botMember.guild;
  const customAvatar = botMember.avatarURL({ dynamic: true, size: 1024 });
  const globalAvatar = client.user.displayAvatarURL({ dynamic: true, size: 1024 });
  const customBanner = botMember.bannerURL({ dynamic: true, size: 1024 });
  const currentNick = botMember.nickname;

  const embed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle(`🌸 Bot Server Profile • ${guild.name}`)
    .setDescription(
      `Customize Mina's identity specifically for **${guild.name}**! Changes apply only to this server.\n\n` +
      `**👤 Display Name:** \`${botMember.displayName}\` ${currentNick ? `*(Server Nick: "${currentNick}")*` : "*(Default)*"}\n` +
      `**🖼️ Server Avatar (PFP):** ${customAvatar ? `[Custom Avatar Active](${customAvatar})` : "🌐 Global Default"}\n` +
      `**🎨 Server Banner:** ${customBanner ? `[Custom Banner Active](${customBanner})` : "🌐 Global Default"}\n\n` +
      `⚙️ **Quick Commands:**\n` +
      `• **Change Avatar:** \`${prefix}botavatar <url|upload>\`\n` +
      `• **Change Banner:** \`${prefix}botbanner <url|upload>\`\n` +
      `• **Change Nickname:** \`${prefix}botprofile nick <name>\`\n` +
      `• **Reset to Default:** \`${prefix}botprofile reset\``
    )
    .setThumbnail(customAvatar || globalAvatar)
    .setFooter({ text: `Requested by ${author.tag || author.username}` })
    .setTimestamp();

  if (customBanner) {
    embed.setImage(customBanner);
  }

  return embed;
}

function buildDashboardComponents(botMember) {
  const hasCustomAvatar = Boolean(botMember.avatarURL());
  const hasCustomBanner = Boolean(botMember.bannerURL());
  const hasCustomNick = Boolean(botMember.nickname);
  const hasAnyCustom = hasCustomAvatar || hasCustomBanner || hasCustomNick;

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("botprofile_reset_avatar")
        .setLabel("Reset Avatar")
        .setEmoji("🔄")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!hasCustomAvatar),
      new ButtonBuilder()
        .setCustomId("botprofile_reset_banner")
        .setLabel("Reset Banner")
        .setEmoji("🔄")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!hasCustomBanner),
      new ButtonBuilder()
        .setCustomId("botprofile_reset_all")
        .setLabel("Reset All (Default)")
        .setEmoji("❌")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!hasAnyCustom)
    ),
  ];
}

async function sendProfileDashboard(context, botMember, client, prefix, author) {
  const embed = buildDashboardEmbed(botMember, client, prefix, author);
  const components = buildDashboardComponents(botMember);
  return context.reply({ embeds: [embed], components });
}

async function handleBotProfileInteraction(interaction, client) {
  const customId = interaction.customId;
  const member = interaction.member;
  const guild = interaction.guild;

  if (!guild || !member) return;

  if (!canManageBotProfile(member)) {
    return interaction.reply({
      content: "❌ You need the **Manage Server** permission to change the bot's server profile.",
      ephemeral: true,
    });
  }

  const botMember = guild.members.me || (await guild.members.fetch(client.user.id).catch(() => null));
  if (!botMember) {
    return interaction.reply({ content: "❌ Could not find bot member in this server.", ephemeral: true });
  }

  const prefix = db.getGuildSettings(guild.id)?.prefix || config.prefix || "?";

  try {
    if (customId === "botprofile_reset_avatar") {
      await guild.members.editMe({
        avatar: null,
        reason: `Server avatar reset by ${interaction.user.tag}`,
      });
      db.updateGuildSettings(guild.id, { botAvatar: null });
    } else if (customId === "botprofile_reset_banner") {
      await guild.members.editMe({
        banner: null,
        reason: `Server banner reset by ${interaction.user.tag}`,
      });
      db.updateGuildSettings(guild.id, { botBanner: null });
    } else if (customId === "botprofile_reset_all") {
      await guild.members.editMe({
        avatar: null,
        banner: null,
        nick: null,
        reason: `All server customizations reset by ${interaction.user.tag}`,
      });
      db.updateGuildSettings(guild.id, { botAvatar: null, botBanner: null });
    }

    // Refresh member
    const updatedMember = await guild.members.fetch(client.user.id).catch(() => botMember);
    const updatedEmbed = buildDashboardEmbed(updatedMember, client, prefix, interaction.user);
    const updatedComponents = buildDashboardComponents(updatedMember);

    await interaction.update({ embeds: [updatedEmbed], components: updatedComponents });
  } catch (err) {
    console.error("[handleBotProfileInteraction error]:", err);
    if (err.status === 429 || err.code === 429) {
      return interaction.reply({
        content: "⏳ Discord is currently rate-limiting profile changes. Please wait a few minutes before trying again.",
        ephemeral: true,
      });
    }
    return interaction.reply({
      content: `❌ Could not reset bot profile: ${err.message}`,
      ephemeral: true,
    });
  }
}

function handleProfileError(err, replyFunc) {
  console.error("[botprofile error]:", err);
  if (err.status === 429 || err.code === 429) {
    return replyFunc({
      content: "⏳ Discord is currently rate-limiting profile updates for this server. Please wait a few minutes before trying again.",
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
  return replyFunc({ content: `❌ Could not update bot profile: ${err.message}`, ephemeral: true });
}
