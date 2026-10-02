const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const db = require("../../utils/database");
const config = require("../../config");

module.exports = {
  name: "videoverifysetup",
  aliases: ["setupvideoverify", "vcverify"],
  category: "Verification",
  description: "Configure and deploy the Voice Channel Video Verification System.",
  usage: "videoverifysetup",
  permissions: ["Administrator"],
  data: new SlashCommandBuilder()
    .setName("videoverifysetup")
    .setDescription("Configure Voice Channel Video Verification.")
    .addRoleOption((opt) =>
      opt.setName("video_role").setDescription("The Video Verified role to grant").setRequired(true)
    )
    .addRoleOption((opt) =>
      opt.setName("reviewer_role").setDescription("Staff role authorized to conduct video verification").setRequired(true)
    )
    .addChannelOption((opt) =>
      opt
        .setName("alert_channel")
        .setDescription("Channel where pending video verify alerts and controls appear")
        .setRequired(true)
    )
    .addChannelOption((opt) =>
      opt
        .setName("waiting_vc")
        .setDescription("Voice channel for candidates to wait in (optional, auto-creates if empty)")
        .setRequired(false)
    )
    .addChannelOption((opt) =>
      opt
        .setName("verify_vc")
        .setDescription("Private voice channel for video interview (optional, auto-creates if empty)")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const author = isSlash ? context.user : context.author;

    let videoRole, reviewerRole, alertChannel, waitingVc, verifyVc;

    if (isSlash) {
      videoRole = context.options.getRole("video_role");
      reviewerRole = context.options.getRole("reviewer_role");
      alertChannel = context.options.getChannel("alert_channel");
      waitingVc = context.options.getChannel("waiting_vc");
      verifyVc = context.options.getChannel("verify_vc");
    } else {
      videoRole = guild.roles.cache.find((r) => r.name.toLowerCase().includes("video"));
      if (!videoRole) {
        videoRole = await guild.roles.create({
          name: "🎥 Video Verified",
          color: 0x9b59b6,
          reason: "Created for Video Verification",
        }).catch(() => null);
      }
      reviewerRole = guild.roles.cache.find((r) =>
        ["staff", "moderator", "admin", "verifier"].includes(r.name.toLowerCase())
      );
      alertChannel = context.channel;
    }

    if (!videoRole || !reviewerRole || !alertChannel) {
      return context.reply({
        content: "❌ Missing required roles or alert channel. Please provide `video_role`, `reviewer_role`, and `alert_channel`.",
        ephemeral: true,
      });
    }

    // Auto-create category & VCs if not provided
    let verifyCategory = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && c.name.toUpperCase() === "VIDEO VERIFICATION"
    );
    if (!verifyCategory) {
      try {
        verifyCategory = await guild.channels.create({
          name: "VIDEO VERIFICATION",
          type: ChannelType.GuildCategory,
        });
      } catch (e) {}
    }

    if (!waitingVc) {
      try {
        waitingVc = await guild.channels.create({
          name: "🎥 Video Verify Waiting",
          type: ChannelType.GuildVoice,
          parent: verifyCategory ? verifyCategory.id : undefined,
        });
      } catch (e) {
        console.error("Could not create waiting VC:", e.message);
      }
    }

    if (!verifyVc) {
      try {
        verifyVc = await guild.channels.create({
          name: "🔒 Private Video Check",
          type: ChannelType.GuildVoice,
          parent: verifyCategory ? verifyCategory.id : undefined,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionFlagsBits.Connect],
            },
            {
              id: reviewerRole.id,
              allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.Stream],
            },
            {
              id: client.user.id,
              allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.ManageChannels],
            },
          ],
        });
      } catch (e) {
        console.error("Could not create private verify VC:", e.message);
      }
    }

    // Save Video Verification Config in DB
    db.setVideoVerificationConfig(guild.id, {
      enabled: true,
      videoVerifiedRoleId: videoRole.id,
      reviewerRoleId: reviewerRole.id,
      alertChannelId: alertChannel.id,
      waitingVoiceId: waitingVc ? waitingVc.id : null,
      verifyVoiceId: verifyVc ? verifyVc.id : null,
    });

    const panelEmbed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle("🎥 Voice Channel Video Verification Portal")
      .setDescription(
        `Members seeking the <@&${videoRole.id}> role or special access can request an interactive video check.\n\n` +
        `**How it works:**\n` +
        `1. Click **Request Video Verification** below or join <#${waitingVc?.id}>.\n` +
        `2. When prompted by a reviewer (<@&${reviewerRole.id}>), enable your webcam / camera in voice chat.\n` +
        `3. Once approved by staff, you will receive the **Video Verified** role automatically!`
      )
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setFooter({ text: "Mina Bot Video Verification System" })
      .setTimestamp();

    const requestButton = new ButtonBuilder()
      .setCustomId("video_verify_request")
      .setLabel("Request Video Verification")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🎥");

    const row = new ActionRowBuilder().addComponents(requestButton);

    await context.channel.send({ embeds: [panelEmbed], components: [row] });

    const setupConfirmEmbed = new EmbedBuilder()
      .setColor(config.theme.success)
      .setTitle("✅ Video Verification System Configured")
      .addFields(
        { name: "Verified Role", value: `<@&${videoRole.id}>`, inline: true },
        { name: "Reviewer Role", value: `<@&${reviewerRole.id}>`, inline: true },
        { name: "Alert Channel", value: `<#${alertChannel.id}>`, inline: true },
        { name: "Waiting VC", value: waitingVc ? `<#${waitingVc.id}>` : "`None`", inline: true },
        { name: "Private Verify VC", value: verifyVc ? `<#${verifyVc.id}>` : "`None`", inline: true }
      );

    if (isSlash) {
      return context.reply({ embeds: [setupConfirmEmbed], ephemeral: true });
    }
  },
};
