const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { sendModLog } = require("../../utils/modLogger");
const config = require("../../config");

module.exports = {
  name: "kick",
  category: "Moderation",
  description: "Kick a member from the server.",
  usage: "kick <@user|id> [reason]",
  permissions: ["KickMembers"],
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server.")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The user to kick").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Reason for kicking").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const author = isSlash ? context.user : context.author;
    const member = isSlash ? context.member : context.member;

    let targetMember, reason;

    if (isSlash) {
      targetMember = context.options.getMember("user");
      reason = context.options.getString("reason") || "No reason provided";
    } else {
      if (!args || !args[0]) {
        return context.reply({ content: "❌ **Usage:** `,kick <@user|id> [reason]`" });
      }
      const rawTarget = args[0].replace(/[^0-9]/g, "");
      targetMember = guild.members.cache.get(rawTarget) || (await guild.members.fetch(rawTarget).catch(() => null));
      reason = args.slice(1).join(" ") || "No reason provided";
    }

    if (!targetMember) {
      return context.reply({ content: "❌ Could not find that member in the server.", ephemeral: true });
    }

    if (targetMember.id === author.id) {
      return context.reply({ content: "❌ You cannot kick yourself.", ephemeral: true });
    }
    if (targetMember.id === client.user.id) {
      return context.reply({ content: "❌ I cannot kick myself.", ephemeral: true });
    }
    if (targetMember.id === guild.ownerId) {
      return context.reply({ content: "❌ You cannot kick the server owner.", ephemeral: true });
    }

    if (!targetMember.kickable) {
      return context.reply({
        content: "❌ I do not have permission to kick this member (their role is higher or equal to mine).",
        ephemeral: true,
      });
    }

    if (
      member.id !== guild.ownerId &&
      targetMember.roles.highest.position >= member.roles.highest.position
    ) {
      return context.reply({
        content: "❌ You cannot kick someone with an equal or higher role than yours.",
        ephemeral: true,
      });
    }

    // Try sending DM
    try {
      await targetMember.send({
        embeds: [
          new EmbedBuilder()
            .setColor(config.theme.danger)
            .setTitle(`👢 You have been kicked from ${guild.name}`)
            .addFields(
              { name: "Reason", value: reason },
              { name: "Moderator", value: author.tag || author.username }
            )
            .setTimestamp(),
        ],
      });
    } catch (e) {
      // Ignored if user has DMs closed
    }

    try {
      await targetMember.kick(`${reason} | By ${author.tag || author.username}`);

      await sendModLog(guild, {
        action: "KICK",
        target: targetMember.user,
        moderator: author,
        reason,
      });

      const embed = new EmbedBuilder()
        .setColor(config.theme.danger)
        .setTitle("👢 Member Successfully Kicked")
        .setDescription(`**${targetMember.user.tag || targetMember.user.username}** has been kicked from the server.`)
        .addFields(
          { name: "User", value: `<@${targetMember.id}> (\`${targetMember.id}\`)`, inline: true },
          { name: "Moderator", value: `<@${author.id}>`, inline: true },
          { name: "Reason", value: `\`\`\`${reason}\`\`\``, inline: false }
        )
        .setTimestamp();

      return context.reply({ embeds: [embed] });
    } catch (err) {
      console.error("[Kick Error]:", err);
      return context.reply({ content: `❌ Failed to kick user: ${err.message}`, ephemeral: true });
    }
  },
};
