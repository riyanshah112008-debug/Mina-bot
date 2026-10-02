const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require("discord.js");
const db = require("../../utils/database");
const { sendModLog } = require("../../utils/modLogger");
const config = require("../../config");

// In-memory captcha cache: key = `${guildId}_${userId}`, value = { code, expires }
const captchaCache = new Map();

function generateCaptchaCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Handles Normal Verification button and captcha interactions.
 */
async function handleNormalVerification(interaction, client) {
  const guild = interaction.guild;
  const user = interaction.user;
  const member = interaction.member;

  const verifConfig = db.getVerificationConfig(guild.id);
  const verifiedRoleId = verifConfig.verifiedRoleId;
  const unverifiedRoleId = verifConfig.unverifiedRoleId;

  // 1. BUTTON CLICK VERIFICATION (INSTANT)
  if (interaction.isButton() && interaction.customId === "verify_user_button") {
    if (!verifiedRoleId) {
      return interaction.reply({
        content: "❌ Verification is not properly configured on this server yet.",
        ephemeral: true,
      });
    }

    if (member.roles.cache.has(verifiedRoleId)) {
      return interaction.reply({
        content: "✅ You are already verified in this server!",
        ephemeral: true,
      });
    }

    try {
      await member.roles.add(verifiedRoleId, "Mina Bot Member Verification");
      if (unverifiedRoleId && member.roles.cache.has(unverifiedRoleId)) {
        await member.roles.remove(unverifiedRoleId, "Removed unverified role");
      }

      await sendModLog(guild, {
        action: "MEMBER_VERIFIED",
        target: user,
        moderator: client.user,
        reason: "Completed standard 1-click verification",
      });

      const successEmbed = new EmbedBuilder()
        .setColor(config.theme.success)
        .setTitle("🎉 Verification Successful")
        .setDescription(`Welcome to **${guild.name}**, <@${user.id}>! You now have full access to the server.`)
        .setTimestamp();

      return interaction.reply({ embeds: [successEmbed], ephemeral: true });
    } catch (err) {
      console.error("[Verification Error]:", err);
      return interaction.reply({
        content: `❌ Could not assign verified role. Please check bot role permissions: ${err.message}`,
        ephemeral: true,
      });
    }
  }

  // 2. CAPTCHA BUTTON (SHOW MODAL)
  if (interaction.isButton() && interaction.customId === "verify_user_captcha") {
    if (!verifiedRoleId) {
      return interaction.reply({
        content: "❌ Verification is not properly configured on this server yet.",
        ephemeral: true,
      });
    }

    if (member.roles.cache.has(verifiedRoleId)) {
      return interaction.reply({
        content: "✅ You are already verified in this server!",
        ephemeral: true,
      });
    }

    const code = generateCaptchaCode();
    const cacheKey = `${guild.id}_${user.id}`;
    captchaCache.set(cacheKey, { code, expires: Date.now() + 5 * 60 * 1000 });

    const modal = new ModalBuilder()
      .setCustomId("modal_verify_captcha")
      .setTitle("🛡️ Security Verification Captcha");

    const codeDisplay = new TextInputBuilder()
      .setCustomId("captcha_input")
      .setLabel(`Code: [ ${code} ] - Type it below:`)
      .setPlaceholder(`Type: ${code}`)
      .setStyle(TextInputStyle.Short)
      .setMinLength(5)
      .setMaxLength(5)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(codeDisplay));
    return interaction.showModal(modal);
  }

  // 3. CAPTCHA MODAL SUBMIT
  if (interaction.isModalSubmit() && interaction.customId === "modal_verify_captcha") {
    const inputCode = interaction.fields.getTextInputValue("captcha_input").trim().toUpperCase();
    const cacheKey = `${guild.id}_${user.id}`;
    const cached = captchaCache.get(cacheKey);

    if (!cached || Date.now() > cached.expires) {
      return interaction.reply({
        content: "⏱️ Verification captcha expired. Please click the verify button again.",
        ephemeral: true,
      });
    }

    if (inputCode !== cached.code) {
      return interaction.reply({
        content: "❌ Incorrect captcha code entered. Please click the button and try again.",
        ephemeral: true,
      });
    }

    captchaCache.delete(cacheKey);

    try {
      await member.roles.add(verifiedRoleId, "Mina Bot Captcha Verification");
      if (unverifiedRoleId && member.roles.cache.has(unverifiedRoleId)) {
        await member.roles.remove(unverifiedRoleId, "Removed unverified role");
      }

      await sendModLog(guild, {
        action: "MEMBER_VERIFIED",
        target: user,
        moderator: client.user,
        reason: "Completed security captcha verification",
      });

      const successEmbed = new EmbedBuilder()
        .setColor(config.theme.success)
        .setTitle("🎉 Security Check Passed")
        .setDescription(`Welcome to **${guild.name}**, <@${user.id}>! You have been successfully verified.`)
        .setTimestamp();

      return interaction.reply({ embeds: [successEmbed], ephemeral: true });
    } catch (err) {
      console.error("[Captcha Verification Error]:", err);
      return interaction.reply({
        content: `❌ Could not assign verified role: ${err.message}`,
        ephemeral: true,
      });
    }
  }
}

module.exports = { handleNormalVerification };
