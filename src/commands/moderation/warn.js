const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { sendModLog } = require("../../utils/modLogger");
const db = require("../../utils/database");
const config = require("../../config");

module.exports = {
  name: "warn",
  category: "Moderation",
  description: "Issue a formal warning to a server member.",
  usage: "warn <@user|id> [reason]",
  permissions: ["ModerateMembers"],
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Issue a formal warning to a member.")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The user to warn").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Reason for warning").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const author = isSlash ? context.user : context.author;
    const member = isSlash ? context.member : context.member;

    let targetMember, targetUser, reason;

    if (isSlash) {
      targetUser = context.options.getUser("user");
      targetMember = guild.members.cache.get(targetUser.id);
      reason = context.options.getString("reason") || "No reason provided";
    } else {
      if (!args || !args[0]) {
        return context.reply({ content: "❌ **Usage:** `,warn <@user|id> [reason]`" });
      }
      const rawTarget = args[0].replace(/[^0-9]/g, "");
      targetMember = guild.members.cache.get(rawTarget) || (await guild.members.fetch(rawTarget).catch(() => null));
      targetUser = targetMember ? targetMember.user : await client.users.fetch(rawTarget).catch(() => null);
      reason = args.slice(1).join(" ") || "No reason provided";
    }

    if (!targetUser) {
      return context.reply({ content: "❌ Could not find a valid member with that mention or ID.", ephemeral: true });
    }

    if (targetUser.id === author.id) {
      return context.reply({ content: "❌ You cannot warn yourself.", ephemeral: true });
    }
    if (targetUser.id === client.user.id) {
      return context.reply({ content: "❌ I cannot warn myself.", ephemeral: true });
    }

    if (targetMember && member.id !== guild.ownerId) {
      if (targetMember.roles.highest.position >= member.roles.highest.position) {
        return context.reply({
          content: "❌ You cannot warn someone with an equal or higher role than yours.",
          ephemeral: true,
        });
      }
    }

    // Save warning to DB
    const warning = db.addWarning(guild.id, targetUser.id, author.id, reason);
    const allWarnings = db.getWarnings(guild.id, targetUser.id);

    // Try sending DM
    try {
      await targetUser.send({
        embeds: [
          new EmbedBuilder()
            .setColor(config.theme.warning)
            .setTitle(`⚠️ You have received a warning in ${guild.name}`)
            .addFields(
              { name: "Reason", value: reason },
              { name: "Moderator", value: author.tag || author.username },
              { name: "Total Warnings", value: `${allWarnings.length}` }
            )
            .setTimestamp(),
        ],
      });
    } catch (e) {}

    await sendModLog(guild, {
      action: "WARN",
      target: targetUser,
      moderator: author,
      reason,
      fields: [
        { name: "Warning ID", value: `\`#${warning.id}\``, inline: true },
        { name: "Total Warnings", value: `${allWarnings.length}`, inline: true },
      ],
    });

    const embed = new EmbedBuilder()
      .setColor(config.theme.warning)
      .setTitle("⚠️ Warning Issued")
      .setDescription(`**${targetUser.tag || targetUser.username}** has received a formal warning.`)
      .addFields(
        { name: "User", value: `<@${targetUser.id}> (\`${targetUser.id}\`)`, inline: true },
        { name: "Moderator", value: `<@${author.id}>`, inline: true },
        { name: "Warning ID", value: `\`#${warning.id}\``, inline: true },
        { name: "Total Warnings", value: `**${allWarnings.length}**`, inline: true },
        { name: "Reason", value: `\`\`\`${reason}\`\`\``, inline: false }
      )
      .setTimestamp();

    return context.reply({ embeds: [embed] });
  },
};
