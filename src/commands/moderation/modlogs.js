const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const db = require("../../utils/database");
const config = require("../../config");

module.exports = {
  name: "modlogs",
  aliases: ["setmodlogs", "logchannel"],
  category: "Moderation",
  description: "Set or view the server moderation audit log channel.",
  usage: "modlogs [#channel]",
  permissions: ["ManageGuild"],
  data: new SlashCommandBuilder()
    .setName("modlogs")
    .setDescription("Configure the moderation log channel.")
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("The channel to send mod logs to").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;

    let targetChannel;

    if (isSlash) {
      targetChannel = context.options.getChannel("channel");
    } else {
      if (args && args[0]) {
        const chanId = args[0].replace(/[^0-9]/g, "");
        targetChannel = guild.channels.cache.get(chanId);
      }
    }

    const currentSettings = db.getGuildSettings(guild.id);

    // If no channel provided, view current status
    if (!targetChannel) {
      const currentLog = currentSettings.modLogChannel
        ? `<#${currentSettings.modLogChannel}> (\`${currentSettings.modLogChannel}\`)`
        : "`Not Configured`";

      const embed = new EmbedBuilder()
        .setColor(config.theme.primary)
        .setTitle("🛡️ Moderation Log Channel")
        .setDescription(`Current mod log channel: ${currentLog}\n\nTo set a new channel, use: \`,modlogs #channel\` or \`/modlogs channel:#channel\`.`);

      return context.reply({ embeds: [embed] });
    }

    if (!targetChannel.isTextBased()) {
      return context.reply({ content: "❌ Mod log channel must be a text-based channel.", ephemeral: true });
    }

    // Update settings in DB
    db.updateGuildSettings(guild.id, { modLogChannel: targetChannel.id });

    const embed = new EmbedBuilder()
      .setColor(config.theme.success)
      .setTitle("✅ Moderation Logs Configured")
      .setDescription(`All moderation actions (bans, kicks, timeouts, warns, nukes, channel locks) will now be logged to <#${targetChannel.id}>.`)
      .setTimestamp();

    return context.reply({ embeds: [embed] });
  },
};
