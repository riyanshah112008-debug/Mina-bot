const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const db = require("../../utils/database");
const config = require("../../config");

module.exports = {
  name: "automod",
  category: "Moderation",
  description: "View or toggle automod settings (anti-invite, anti-link, anti-spam, mass-mention).",
  usage: "automod [invites|links|spam|mentions|status] [on|off]",
  permissions: ["ManageGuild"],
  data: new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Configure server automod settings.")
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("View current automod settings")
    )
    .addSubcommand((sub) =>
      sub
        .setName("invites")
        .setDescription("Toggle Anti-Invite filter")
        .addBooleanOption((opt) => opt.setName("enabled").setDescription("Enable or disable").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("links")
        .setDescription("Toggle Anti-Link filter")
        .addBooleanOption((opt) => opt.setName("enabled").setDescription("Enable or disable").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("spam")
        .setDescription("Toggle Anti-Spam rate limiting")
        .addBooleanOption((opt) => opt.setName("enabled").setDescription("Enable or disable").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("mentions")
        .setDescription("Toggle Anti-Mass-Mention filter")
        .addBooleanOption((opt) => opt.setName("enabled").setDescription("Enable or disable").setRequired(true))
        .addIntegerOption((opt) => opt.setName("limit").setDescription("Max mentions allowed (3-15)").setRequired(false))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const settings = db.getGuildSettings(guild.id);
    const automod = settings.automod || {};

    let subcmd, enabledVal, mentionLimit;

    if (isSlash) {
      subcmd = context.options.getSubcommand();
      enabledVal = context.options.getBoolean("enabled");
      mentionLimit = context.options.getInteger("limit");
    } else {
      subcmd = args && args[0] ? args[0].toLowerCase() : "status";
      if (args && args[1]) {
        enabledVal = ["on", "enable", "true", "yes", "1"].includes(args[1].toLowerCase());
      }
    }

    if (subcmd === "status") {
      const statusEmbed = new EmbedBuilder()
        .setColor(config.theme.primary)
        .setTitle(`🛡️ Automod Settings | ${guild.name}`)
        .addFields(
          { name: "Global Automod", value: automod.enabled !== false ? "✅ Enabled" : "❌ Disabled", inline: true },
          { name: "Anti-Invite", value: automod.antiInvite ? "✅ Enabled" : "❌ Disabled", inline: true },
          { name: "Anti-Link", value: automod.antiLink ? "✅ Enabled" : "❌ Disabled", inline: true },
          { name: "Anti-Spam", value: automod.antiSpam ? "✅ Enabled" : "❌ Disabled", inline: true },
          { name: "Anti-Mass-Mention", value: automod.antiMassMention ? `✅ Enabled (${automod.mentionLimit || 5} max)` : "❌ Disabled", inline: true }
        )
        .setFooter({ text: "Use ,automod <invites|links|spam|mentions> <on/off> to toggle" })
        .setTimestamp();

      return context.reply({ embeds: [statusEmbed] });
    }

    if (subcmd === "invites" || subcmd === "invite") {
      automod.antiInvite = enabledVal !== undefined ? enabledVal : !automod.antiInvite;
      db.updateGuildSettings(guild.id, { automod });
      return context.reply({ content: `✅ Anti-Invite filter is now **${automod.antiInvite ? "ENABLED" : "DISABLED"}**.` });
    }

    if (subcmd === "links" || subcmd === "link") {
      automod.antiLink = enabledVal !== undefined ? enabledVal : !automod.antiLink;
      db.updateGuildSettings(guild.id, { automod });
      return context.reply({ content: `✅ Anti-Link filter is now **${automod.antiLink ? "ENABLED" : "DISABLED"}**.` });
    }

    if (subcmd === "spam") {
      automod.antiSpam = enabledVal !== undefined ? enabledVal : !automod.antiSpam;
      db.updateGuildSettings(guild.id, { automod });
      return context.reply({ content: `✅ Anti-Spam rate limiting is now **${automod.antiSpam ? "ENABLED" : "DISABLED"}**.` });
    }

    if (subcmd === "mentions" || subcmd === "mention") {
      automod.antiMassMention = enabledVal !== undefined ? enabledVal : !automod.antiMassMention;
      if (mentionLimit && mentionLimit >= 3 && mentionLimit <= 15) {
        automod.mentionLimit = mentionLimit;
      }
      db.updateGuildSettings(guild.id, { automod });
      return context.reply({
        content: `✅ Anti-Mass-Mention is now **${automod.antiMassMention ? "ENABLED" : "DISABLED"}** (Limit: ${automod.mentionLimit || 5} mentions).`,
      });
    }

    return context.reply({ content: "❌ Unknown automod option. Use `?automod status` or `?automod <invites|links|spam|mentions> <on|off>`." });
  },
};
