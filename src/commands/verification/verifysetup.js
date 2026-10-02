const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const db = require("../../utils/database");
const config = require("../../config");

module.exports = {
  name: "verifysetup",
  aliases: ["setupverify", "verification"],
  category: "Verification",
  description: "Deploy the standard server verification panel (Button or Captcha mode).",
  usage: "verifysetup",
  permissions: ["ManageGuild"],
  data: new SlashCommandBuilder()
    .setName("verifysetup")
    .setDescription("Deploy the server verification panel.")
    .addRoleOption((opt) =>
      opt.setName("verified_role").setDescription("The role to grant upon verification").setRequired(true)
    )
    .addRoleOption((opt) =>
      opt.setName("unverified_role").setDescription("Role to remove upon verification (optional)").setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName("mode")
        .setDescription("Verification challenge type")
        .addChoices(
          { name: "Instant Button Click", value: "button" },
          { name: "Security Captcha Code", value: "captcha" }
        )
        .setRequired(false)
    )
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("Channel to deploy panel into (defaults to current)").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const author = isSlash ? context.user : context.author;

    let verifiedRole, unverifiedRole, mode, targetChannel;

    if (isSlash) {
      verifiedRole = context.options.getRole("verified_role");
      unverifiedRole = context.options.getRole("unverified_role");
      mode = context.options.getString("mode") || "button";
      targetChannel = context.options.getChannel("channel") || context.channel;
    } else {
      // Prefix fallback: lookup roles
      verifiedRole = guild.roles.cache.find(
        (r) => ["verified", "member"].includes(r.name.toLowerCase())
      );
      if (!verifiedRole) {
        verifiedRole = await guild.roles.create({
          name: "Verified",
          color: 0x57f287,
          reason: "Created for Mina Bot Verification",
        }).catch(() => null);
      }
      unverifiedRole = guild.roles.cache.find(
        (r) => ["unverified"].includes(r.name.toLowerCase())
      );
      mode = args && args[0] && args[0].toLowerCase() === "captcha" ? "captcha" : "button";
      targetChannel = context.channel;
    }

    if (!verifiedRole) {
      return context.reply({ content: "❌ Please specify a valid verified role to assign upon verification.", ephemeral: true });
    }

    // Save config in DB
    db.setVerificationConfig(guild.id, {
      channelId: targetChannel.id,
      verifiedRoleId: verifiedRole.id,
      unverifiedRoleId: unverifiedRole ? unverifiedRole.id : null,
      mode,
    });

    const panelEmbed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle("🛡️ Server Member Verification")
      .setDescription(
        `Welcome to **${guild.name}**!\n\n` +
        `To access all server channels and protect our community from automated bots, please complete member verification.\n\n` +
        `• **Mode:** ${mode === "captcha" ? "🔐 Security Captcha" : "⚡ Instant 1-Click Verification"}\n` +
        `• **Role Unlocked:** <@&${verifiedRole.id}>\n\n` +
        `Click the **Verify Account** button below to complete verification!`
      )
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setFooter({ text: "Mina Bot Security & Anti-Raid System" })
      .setTimestamp();

    const verifyButton = new ButtonBuilder()
      .setCustomId(`verify_user_${mode}`)
      .setLabel("Verify Account")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅");

    const row = new ActionRowBuilder().addComponents(verifyButton);

    await targetChannel.send({ embeds: [panelEmbed], components: [row] });

    if (isSlash) {
      return context.reply({
        content: `✅ Verification panel successfully deployed to <#${targetChannel.id}> in **${mode.toUpperCase()}** mode!`,
        ephemeral: true,
      });
    } else {
      if (context.deletable) await context.delete().catch(() => null);
    }
  },
};
