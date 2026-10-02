const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const db = require("../../utils/database");
const config = require("../../config");

module.exports = {
  name: "clearwarns",
  aliases: ["resetwarns"],
  category: "Moderation",
  description: "Clear all warnings for a user.",
  usage: "clearwarns <@user|id>",
  permissions: ["ModerateMembers"],
  data: new SlashCommandBuilder()
    .setName("clearwarns")
    .setDescription("Clear all warnings for a user.")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The user whose warnings to clear").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;

    let targetUser;

    if (isSlash) {
      targetUser = context.options.getUser("user");
    } else {
      if (!args || !args[0]) {
        return context.reply({ content: "❌ **Usage:** `,clearwarns <@user|id>`" });
      }
      const rawTarget = args[0].replace(/[^0-9]/g, "");
      targetUser = await client.users.fetch(rawTarget).catch(() => null);
    }

    if (!targetUser) {
      return context.reply({ content: "❌ Could not find that user.", ephemeral: true });
    }

    const count = db.clearWarnings(guild.id, targetUser.id);
    if (!count) {
      return context.reply({ content: `ℹ️ **${targetUser.tag || targetUser.username}** has no active warnings to clear.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(config.theme.success)
      .setTitle("✅ Warnings Cleared")
      .setDescription(`Successfully cleared **${count} warning(s)** for <@${targetUser.id}>.`);

    return context.reply({ embeds: [embed] });
  },
};
