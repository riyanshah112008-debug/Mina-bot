const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require("discord.js");
const config = require("../../config");
const db = require("../../utils/database");

function formatWelcomeText(template, member) {
  const guild = member.guild;
  return template
    .replace(/{user}/g, `<@${member.id}>`)
    .replace(/{username}/g, member.user?.username || member.displayName)
    .replace(/{server}/g, guild.name)
    .replace(/{memberCount}/g, String(guild.memberCount));
}

function buildWelcomeCard(configData, member) {
  const text = formatWelcomeText(configData.message, member);
  if (!configData.useEmbed) {
    return { content: text };
  }

  const embed = new EmbedBuilder()
    .setColor(configData.embedColor || config.theme.primary)
    .setTitle(`🌸 Welcome to ${member.guild.name}!`)
    .setDescription(text)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
    .setFooter({ text: `Member #${member.guild.memberCount} • Mina Welcome Engine` })
    .setTimestamp();

  return { embeds: [embed] };
}

module.exports = {
  name: "welcome",
  aliases: ["welcomesetup", "setwelcome"],
  category: "Utility",
  description: "Configure or test the server welcome system.",
  usage: "welcome [set #channel | message <text> | embed <on|off> | test | disable]",
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Configure or test the server welcome system.")
    .addSubcommand((sub) =>
      sub.setName("view").setDescription("View current welcome system configuration.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set the welcome notification channel.")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel where welcome messages will be sent")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("message")
        .setDescription("Set custom welcome message ({user}, {server}, {memberCount}).")
        .addStringOption((opt) =>
          opt.setName("text").setDescription("Welcome message template").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("embed")
        .setDescription("Toggle whether welcome messages use rich embeds.")
        .addBooleanOption((opt) =>
          opt.setName("enabled").setDescription("Enable rich embed format").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("test").setDescription("Simulate and preview a welcome message.")
    )
    .addSubcommand((sub) =>
      sub.setName("disable").setDescription("Disable welcome messages for this server.")
    ),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const member = context.member;

    if (!guild) {
      return context.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
    }

    const currentConfig = db.getWelcomeConfig(guild.id);
    const prefix = db.getGuildSettings(guild.id)?.prefix || config.prefix || "?";

    let subcommand = isSlash ? context.options.getSubcommand() : null;
    if (!isSlash) {
      const firstArg = args && args[0] ? args[0].toLowerCase() : null;
      if (firstArg === "set" || firstArg === "channel") {
        subcommand = "set";
        args = args.slice(1);
      } else if (firstArg === "message" || firstArg === "msg") {
        subcommand = "message";
        args = args.slice(1);
      } else if (firstArg === "embed") {
        subcommand = "embed";
        args = args.slice(1);
      } else if (firstArg === "test" || firstArg === "preview") {
        subcommand = "test";
      } else if (firstArg === "disable" || firstArg === "off") {
        subcommand = "disable";
      } else {
        subcommand = "view";
      }
    }

    // 1. VIEW CONFIGURATION
    if (subcommand === "view") {
      const embed = new EmbedBuilder()
        .setColor(config.theme.primary)
        .setTitle(`🌸 Welcome System • ${guild.name}`)
        .addFields(
          { name: "Status", value: currentConfig.enabled ? "✅ **Active**" : "❌ **Disabled**", inline: true },
          { name: "Channel", value: currentConfig.channelId ? `<#${currentConfig.channelId}>` : "*Not Set*", inline: true },
          { name: "Format", value: currentConfig.useEmbed ? "🖼️ **Rich Embed**" : "📝 **Plain Text**", inline: true },
          { name: "Message Template", value: `\`\`\`${currentConfig.message}\`\`\``, inline: false },
          {
            name: "Supported Variables",
            value: "`{user}` → User mention\n`{username}` → Raw username\n`{server}` → Server name\n`{memberCount}` → Total members",
            inline: false,
          }
        )
        .setDescription(
          `**Commands:**\n` +
          `• Set Channel: \`${prefix}welcome set #channel\`\n` +
          `• Custom Message: \`${prefix}welcome message <text>\`\n` +
          `• Toggle Embed: \`${prefix}welcome embed on/off\`\n` +
          `• Test Preview: \`${prefix}welcome test\`\n` +
          `• Disable: \`${prefix}welcome disable\``
        )
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setFooter({ text: "Mina Welcome Engine" });

      return context.reply({ embeds: [embed] });
    }

    // PERMISSIONS GATE FOR CHANGES
    if (!member.permissions.has(PermissionFlagsBits.ManageGuild) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return context.reply({
        content: "❌ You need the **Manage Server** permission to configure welcome settings.",
        ephemeral: true,
      });
    }

    // 2. SET CHANNEL
    if (subcommand === "set") {
      let targetChannel = null;
      if (isSlash) {
        targetChannel = context.options.getChannel("channel");
      } else if (context.mentions?.channels?.first()) {
        targetChannel = context.mentions.channels.first();
      } else if (args && args[0]) {
        const id = args[0].replace(/[^0-9]/g, "");
        targetChannel = guild.channels.cache.get(id);
      }

      if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
        return context.reply({
          content: `❌ Please mention a valid text channel.\n**Example:** \`${prefix}welcome set #welcome\``,
          ephemeral: true,
        });
      }

      db.setWelcomeConfig(guild.id, { channelId: targetChannel.id, enabled: true });
      return context.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.theme.success)
            .setTitle("✅ Welcome Channel Saved")
            .setDescription(`Welcome notifications will now be sent to <#${targetChannel.id}>!`),
        ],
      });
    }

    // 3. SET MESSAGE
    if (subcommand === "message") {
      const newMsg = isSlash ? context.options.getString("text") : args.join(" ");
      if (!newMsg || newMsg.trim().length === 0) {
        return context.reply({
          content: `❌ Please provide a welcome message template.\n**Variables:** \`{user}\`, \`{server}\`, \`{memberCount}\``,
          ephemeral: true,
        });
      }

      db.setWelcomeConfig(guild.id, { message: newMsg.trim(), enabled: true });
      return context.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.theme.success)
            .setTitle("✅ Welcome Message Updated")
            .setDescription(`New template:\n\`\`\`${newMsg.trim()}\`\`\``),
        ],
      });
    }

    // 4. TOGGLE EMBED
    if (subcommand === "embed") {
      let enabled = isSlash
        ? context.options.getBoolean("enabled")
        : /^(on|true|yes|enable|1)$/i.test(args[0]);

      db.setWelcomeConfig(guild.id, { useEmbed: enabled });
      return context.reply({
        content: `✅ Welcome messages will now use **${enabled ? "Rich Embeds 🖼️" : "Plain Text 📝"}**.`,
      });
    }

    // 5. TEST PREVIEW
    if (subcommand === "test") {
      const cfg = db.getWelcomeConfig(guild.id);
      const card = buildWelcomeCard(cfg, member);
      if (cfg.channelId && cfg.channelId !== context.channel.id) {
        const dest = guild.channels.cache.get(cfg.channelId);
        if (dest) {
          dest.send(card).catch(() => {});
          return context.reply({
            content: `✅ Test welcome message dispatched to <#${cfg.channelId}>!`,
          });
        }
      }
      return context.reply({ content: "*(Welcome Preview)*", ...card });
    }

    // 6. DISABLE
    if (subcommand === "disable") {
      db.setWelcomeConfig(guild.id, { enabled: false });
      return context.reply({ content: "✅ Welcome messages have been **disabled** for this server." });
    }
  },

  buildWelcomeCard,
};
