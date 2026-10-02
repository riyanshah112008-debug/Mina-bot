const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const db = require("../../utils/database");
const { sendModLog } = require("../../utils/modLogger");
const config = require("../../config");

/**
 * Checks if a member has video reviewer permissions.
 */
function isReviewer(member) {
  if (!member) return false;
  if (member.permissions.has("Administrator")) return true;
  const cfg = db.getVideoVerificationConfig(member.guild.id);
  if (cfg.reviewerRoleId && member.roles.cache.has(cfg.reviewerRoleId)) return true;
  return member.roles.cache.some((r) =>
    ["reviewer", "verifier", "staff", "moderator", "admin"].includes(r.name.toLowerCase())
  );
}

/**
 * Dispatches an alert into the staff alert channel when a user requests video verification.
 */
async function dispatchStaffAlert(guild, candidateUser, candidateMember, sessionId, client) {
  const cfg = db.getVideoVerificationConfig(guild.id);
  if (!cfg.alertChannelId) return null;

  const alertChannel = guild.channels.cache.get(cfg.alertChannelId) ||
    (await guild.channels.fetch(cfg.alertChannelId).catch(() => null));
  if (!alertChannel || !alertChannel.isTextBased()) return null;

  const inVc = !!candidateMember?.voice?.channel;
  const currentVc = candidateMember?.voice?.channel ? `<#${candidateMember.voice.channel.id}>` : "`Not in VC`";
  const hasCam = candidateMember?.voice?.selfVideo ? "🟢 Camera ON" : "🔴 Camera OFF";
  const isStreaming = candidateMember?.voice?.streaming ? "🟢 Screen Streaming" : "🔴 Not Streaming";

  const alertEmbed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle("🎥 Video Verification Request")
    .setThumbnail(candidateUser.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: "Candidate", value: `<@${candidateUser.id}> (\`${candidateUser.tag || candidateUser.username}\` / \`${candidateUser.id}\`)`, inline: false },
      { name: "Voice Status", value: `${currentVc}`, inline: true },
      { name: "Camera Status", value: `${hasCam}`, inline: true },
      { name: "Screen Share", value: `${isStreaming}`, inline: true },
      { name: "Account Created", value: `<t:${Math.floor(candidateUser.createdTimestamp / 1000)}:R>`, inline: true },
      { name: "Joined Server", value: candidateMember?.joinedTimestamp ? `<t:${Math.floor(candidateMember.joinedTimestamp / 1000)}:R>` : "`Unknown`", inline: true }
    )
    .setFooter({ text: `Session ID: ${sessionId} • Reviewers Only` })
    .setTimestamp();

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`vcverify_pull_${sessionId}`).setLabel("Move to Private VC").setStyle(ButtonStyle.Primary).setEmoji("🎧"),
    new ButtonBuilder().setCustomId(`vcverify_cam_${sessionId}`).setLabel("Check Camera").setStyle(ButtonStyle.Secondary).setEmoji("📹"),
    new ButtonBuilder().setCustomId(`vcverify_approve_${sessionId}`).setLabel("Approve").setStyle(ButtonStyle.Success).setEmoji("✅"),
    new ButtonBuilder().setCustomId(`vcverify_reject_${sessionId}`).setLabel("Reject").setStyle(ButtonStyle.Danger).setEmoji("❌")
  );

  return await alertChannel.send({
    content: cfg.reviewerRoleId ? `<@&${cfg.reviewerRoleId}> New video verification pending!` : undefined,
    embeds: [alertEmbed],
    components: [actionRow],
  });
}

/**
 * Handles all interactions related to Video VC Verification.
 */
async function handleVideoVerification(interaction, client) {
  const guild = interaction.guild;
  const user = interaction.user;
  const member = interaction.member;

  // 1. CANDIDATE CLICKS "REQUEST VIDEO VERIFICATION"
  if (interaction.isButton() && interaction.customId === "video_verify_request") {
    const cfg = db.getVideoVerificationConfig(guild.id);
    if (!cfg.enabled) {
      return interaction.reply({
        content: "❌ Video Verification is currently disabled on this server.",
        ephemeral: true,
      });
    }

    if (cfg.videoVerifiedRoleId && member.roles.cache.has(cfg.videoVerifiedRoleId)) {
      return interaction.reply({
        content: "✅ You already possess the **Video Verified** role on this server!",
        ephemeral: true,
      });
    }

    const existing = db.getActiveVideoVerificationForUser(guild.id, user.id);
    if (existing) {
      return interaction.reply({
        content: `⚠️ You already have an active video verification session pending (Session: \`${existing.id}\`). Please ensure you join <#${cfg.waitingVoiceId}> and wait for a reviewer.`,
        ephemeral: true,
      });
    }

    const sessionId = `VV-${Date.now().toString().slice(-6)}`;
    db.createVideoVerificationSession(sessionId, {
      guildId: guild.id,
      userId: user.id,
      username: user.tag || user.username,
    });

    await dispatchStaffAlert(guild, user, member, sessionId, client);

    const replyEmbed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle("🎥 Video Verification Requested")
      .setDescription(
        `Thank you <@${user.id}>! Your video verification request has been received.\n\n` +
        `**Next Steps:**\n` +
        `1. Join the waiting room voice channel: <#${cfg.waitingVoiceId}>\n` +
        `2. Ensure your webcam / mobile camera is operational.\n` +
        `3. When a reviewer joins, please enable your camera for a brief visual identity check.\n\n` +
        `*Session ID:* \`${sessionId}\``
      )
      .setTimestamp();

    return interaction.reply({ embeds: [replyEmbed], ephemeral: true });
  }

  // 2. REVIEWER ACTION BUTTONS
  if (interaction.isButton() && interaction.customId.startsWith("vcverify_")) {
    if (!isReviewer(member)) {
      return interaction.reply({
        content: "❌ Only designated Video Reviewers / Staff can perform this action.",
        ephemeral: true,
      });
    }

    const parts = interaction.customId.split("_");
    const action = parts[1]; // 'pull', 'cam', 'approve', 'reject'
    const sessionId = parts[2];

    const session = db.getVideoVerificationSession(sessionId);
    if (!session) {
      return interaction.reply({ content: "❌ Video verification session not found or expired.", ephemeral: true });
    }

    const candidateUser = await client.users.fetch(session.userId).catch(() => null);
    const candidateMember = await guild.members.fetch(session.userId).catch(() => null);
    const cfg = db.getVideoVerificationConfig(guild.id);

    // 2a. PULL INTO PRIVATE VC
    if (action === "pull") {
      if (!candidateMember?.voice?.channel) {
        return interaction.reply({
          content: `⚠️ Candidate <@${candidateUser.id}> is not in a voice channel right now! They need to join <#${cfg.waitingVoiceId}>.`,
          ephemeral: true,
        });
      }

      if (!cfg.verifyVoiceId) {
        return interaction.reply({ content: "❌ Private verification voice channel is not configured.", ephemeral: true });
      }

      try {
        await candidateMember.voice.setChannel(cfg.verifyVoiceId, `Moved by reviewer ${user.tag || user.username}`);
        if (member.voice.channel) {
          await member.voice.setChannel(cfg.verifyVoiceId, "Reviewer joining private session");
        }

        db.updateVideoVerificationSession(sessionId, {
          status: "in_progress",
          reviewerId: user.id,
        });

        return interaction.reply({
          content: `🎧 Moved <@${candidateUser.id}> and <@${user.id}> into <#${cfg.verifyVoiceId}> for video check.`,
        });
      } catch (err) {
        return interaction.reply({ content: `❌ Could not move members to voice channel: ${err.message}`, ephemeral: true });
      }
    }

    // 2b. CHECK CAMERA STATUS
    if (action === "cam") {
      const hasCam = candidateMember?.voice?.selfVideo;
      const isStreaming = candidateMember?.voice?.streaming;
      const inVc = candidateMember?.voice?.channel ? `<#${candidateMember.voice.channel.id}>` : "`Not in VC`";

      return interaction.reply({
        content: `📹 **Candidate Real-Time Camera Status for <@${candidateUser.id}>:**\n• Voice Channel: ${inVc}\n• Camera Enabled: ${
          hasCam ? "🟢 **YES (Camera is ON)**" : "🔴 **NO (Camera is OFF)**"
        }\n• Screen Streaming: ${isStreaming ? "🟢 YES" : "🔴 NO"}`,
        ephemeral: true,
      });
    }

    // 2c. APPROVE VIDEO VERIFICATION
    if (action === "approve") {
      const modal = new ModalBuilder()
        .setCustomId(`modal_vcverify_approve_${sessionId}`)
        .setTitle("Approve Video Verification");

      const notesInput = new TextInputBuilder()
        .setCustomId("verify_notes")
        .setLabel("Verification Notes / Audit Details")
        .setPlaceholder("e.g. Identity & webcam matched guidelines")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

      modal.addComponents(new ActionRowBuilder().addComponents(notesInput));
      return interaction.showModal(modal);
    }

    // 2d. REJECT VIDEO VERIFICATION
    if (action === "reject") {
      const modal = new ModalBuilder()
        .setCustomId(`modal_vcverify_reject_${sessionId}`)
        .setTitle("Reject Video Verification");

      const reasonInput = new TextInputBuilder()
        .setCustomId("reject_reason")
        .setLabel("Reason for Rejection")
        .setPlaceholder("e.g. Refused webcam, underage, or failed checks")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
      return interaction.showModal(modal);
    }
  }

  // 3. HANDLE MODAL SUBMISSIONS FOR VC VERIFICATION
  if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_vcverify_")) {
    const parts = interaction.customId.split("_");
    const action = parts[2]; // 'approve' or 'reject'
    const sessionId = parts[3];

    const session = db.getVideoVerificationSession(sessionId);
    if (!session) {
      return interaction.reply({ content: "❌ Verification session expired.", ephemeral: true });
    }

    const cfg = db.getVideoVerificationConfig(guild.id);
    const candidateMember = await guild.members.fetch(session.userId).catch(() => null);
    const candidateUser = candidateMember ? candidateMember.user : await client.users.fetch(session.userId).catch(() => null);

    if (action === "approve") {
      const notes = interaction.fields.getTextInputValue("verify_notes") || "Passed video verification.";

      if (candidateMember && cfg.videoVerifiedRoleId) {
        await candidateMember.roles.add(cfg.videoVerifiedRoleId, `Video verification approved by ${user.tag || user.username}`);
      }

      db.updateVideoVerificationSession(sessionId, {
        status: "approved",
        reviewerId: user.id,
        notes,
        completedAt: new Date().toISOString(),
      });

      // Try sending DM to candidate
      if (candidateUser) {
        try {
          await candidateUser.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x57f287)
                .setTitle(`🎉 Video Verification Approved!`)
                .setDescription(`Congratulations! Your video verification has been verified in **${guild.name}**.\n\nYou have been granted the **Video Verified** role.`)
                .addFields(
                  { name: "Reviewer", value: `${user.tag || user.username}`, inline: true },
                  { name: "Session ID", value: `\`${sessionId}\``, inline: true }
                )
                .setTimestamp(),
            ],
          });
        } catch (e) {}
      }

      await sendModLog(guild, {
        action: "VIDEO_VERIFICATION_APPROVED",
        target: candidateUser,
        moderator: user,
        reason: notes,
        fields: [{ name: "Session", value: `\`${sessionId}\``, inline: true }],
      });

      const confirmEmbed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("✅ Video Verification Approved")
        .setDescription(`Successfully verified <@${candidateUser?.id}> via video check!`)
        .addFields(
          { name: "Candidate", value: `<@${candidateUser?.id}>`, inline: true },
          { name: "Reviewer", value: `<@${user.id}>`, inline: true },
          { name: "Notes", value: `\`\`\`${notes}\`\`\``, inline: false }
        );

      return interaction.reply({ embeds: [confirmEmbed] });
    }

    if (action === "reject") {
      const reason = interaction.fields.getTextInputValue("reject_reason") || "Failed video verification.";

      db.updateVideoVerificationSession(sessionId, {
        status: "rejected",
        reviewerId: user.id,
        notes: reason,
        completedAt: new Date().toISOString(),
      });

      // Disconnect candidate from VC if in private verify room
      if (candidateMember?.voice?.channel) {
        await candidateMember.voice.disconnect(`Video verification rejected: ${reason}`).catch(() => null);
      }

      // Try sending DM
      if (candidateUser) {
        try {
          await candidateUser.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xed4245)
                .setTitle(`❌ Video Verification Denied`)
                .setDescription(`Your video verification in **${guild.name}** was not approved.`)
                .addFields(
                  { name: "Reason", value: reason },
                  { name: "Reviewer", value: `${user.tag || user.username}` }
                )
                .setTimestamp(),
            ],
          });
        } catch (e) {}
      }

      await sendModLog(guild, {
        action: "VIDEO_VERIFICATION_REJECTED",
        target: candidateUser,
        moderator: user,
        reason,
        fields: [{ name: "Session", value: `\`${sessionId}\``, inline: true }],
      });

      const rejectEmbed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("❌ Video Verification Rejected")
        .setDescription(`Video verification for <@${candidateUser?.id}> has been denied.`)
        .addFields(
          { name: "Candidate", value: `<@${candidateUser?.id}>`, inline: true },
          { name: "Reviewer", value: `<@${user.id}>`, inline: true },
          { name: "Reason", value: `\`\`\`${reason}\`\`\``, inline: false }
        );

      return interaction.reply({ embeds: [rejectEmbed] });
    }
  }
}

module.exports = { handleVideoVerification, dispatchStaffAlert };
