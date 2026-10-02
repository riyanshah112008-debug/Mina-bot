const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const db = require("../../utils/database");
const config = require("../../config");

module.exports = {
  name: "warnings",
  aliases: ["warns"],
  category: "Moderation",
  description: "View warning history for a user.",
  usage: "warnings <@user|id>",
  permissions: ["ModerateMembers"],
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View warnings for a user.")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The user whose warnings to view").setRequired(true)
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
        return context.reply({ content: "❌ **Usage:** `,warnings <@user|id>`" });
      }
      const rawTarget = args[0].replace(/[^0-9]/g, "");
      targetUser = await client.users.fetch(rawTarget).catch(() => null);
    }

    if (!targetUser) {
      return context.reply({ content: "❌ Could not find that user.", ephemeral: true });
    }

    const warns = db.getWarnings(guild.id, targetUser.id);

    if (!warns.length) {
      const cleanEmbed = new EmbedBuilder()
        .setColor(config.theme.success)
        .setTitle(`🛡️ Warnings for ${targetUser.tag || targetUser.username}`)
        .setDescription("This user has a clean record with **0 warnings**.")
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

      return context.reply({ embeds: [cleanEmbed] });
    }

    const embed = new EmbedBuilder()
      .setColor(config.theme.warning)
      .setTitle(`⚠️ Warnings for ${targetUser.tag || targetUser.username} (${warns.length})`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: "Use ,delwarn <id> to delete a specific warning or ,clearwarns to wipe all." });

    const recentWarns = warns.slice(-10).reverse();
    for (const w of recentWarns) {
      const dateStr = new Date(w.timestamp).toLocaleDateString();
      embed.addFields({
        name: `Case #${w.id} • ${dateStr}`,
        value: `**Reason:** ${w.reason}\n**Moderator:** <@${w.moderatorId}>`,
        inline: false,
      });
    }

    return context.reply({ embeds: [embed] });
  },
};
