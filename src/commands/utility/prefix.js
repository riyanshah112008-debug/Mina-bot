const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const db = require("../../utils/database");
const config = require("../../config");

module.exports = {
  name: "prefix",
  category: "Utility",
  description: "View or change the server command prefix.",
  usage: "prefix [new_prefix]",
  data: new SlashCommandBuilder()
    .setName("prefix")
    .setDescription("View or change server prefix.")
    .addStringOption((opt) =>
      opt.setName("new_prefix").setDescription("New command prefix").setRequired(false)
    ),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const member = context.member;

    let newPrefix;

    if (isSlash) {
      newPrefix = context.options.getString("new_prefix");
    } else {
      newPrefix = args && args[0] ? args[0] : null;
    }

    const settings = db.getGuildSettings(guild.id);

    if (!newPrefix) {
      const currentPrefix = settings.prefix || config.prefix;
      return context.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.theme.primary)
            .setTitle("⚙️ Server Prefix")
            .setDescription(`The current command prefix for **${guild.name}** is: \`${currentPrefix}\`\n\nAdministrators can change it with: \`${currentPrefix}prefix <new_prefix>\``),
        ],
      });
    }

    // Changing prefix requires ManageGuild or Administrator
    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return context.reply({ content: "❌ You need the `Manage Server` permission to change the prefix.", ephemeral: true });
    }

    if (newPrefix.length > 5) {
      return context.reply({ content: "❌ Prefix length cannot exceed 5 characters.", ephemeral: true });
    }

    db.updateGuildSettings(guild.id, { prefix: newPrefix });

    const embed = new EmbedBuilder()
      .setColor(config.theme.success)
      .setTitle("✅ Prefix Updated")
      .setDescription(`The command prefix for **${guild.name}** has been updated to: \`${newPrefix}\``);

    return context.reply({ embeds: [embed] });
  },
};
