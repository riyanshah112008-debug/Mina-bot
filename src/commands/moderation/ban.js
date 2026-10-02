const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { sendModLog } = require("../../utils/modLogger");
const config = require("../../config");

module.exports = {
  name: "ban",
  category: "Moderation",
  description: "Ban a member from the server with optional reason and message purge.",
  usage: "ban <@user|id> [reason] [delete_days: 0-7]",
  permissions: ["BanMembers"],
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member from the server.")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The user to ban").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Reason for banning").setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("delete_days")
        .setDescription("Number of days of messages to delete (0-7)")
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const author = isSlash ? context.user : context.author;
    const member = isSlash ? context.member : context.member;

    let targetUser, targetMember, reason, deleteDays;

    if (isSlash) {
      targetUser = context.options.getUser("user");
      targetMember = context.guild.members.cache.get(targetUser.id);
      reason = context.options.getString("reason") || "No reason provided";
      deleteDays = context.options.getInteger("delete_days") || 0;
    } else {
      if (!args || !args[0]) {
        return context.reply({ content: "❌ **Usage:** `?ban <@user|id> [reason] [delete_days]`" });
      }
      const rawTarget = args[0].replace(/[^0-9]/g, "");
      targetMember = guild.members.cache.get(rawTarget) || (await guild.members.fetch(rawTarget).catch(() => null));
      targetUser = targetMember ? targetMember.user : await client.users.fetch(rawTarget).catch(() => null);

      if (!targetUser) {
        return context.reply({ content: "❌ Could not find a valid user with that mention or ID." });
      }

      // Check if last arg is delete days
      const lastArg = parseInt(args[args.length - 1], 10);
      if (!isNaN(lastArg) && lastArg >= 0 && lastArg <= 7 && args.length > 2) {
        deleteDays = lastArg;
        reason = args.slice(1, -1).join(" ") || "No reason provided";
      } else {
        deleteDays = 0;
        reason = args.slice(1).join(" ") || "No reason provided";
      }
    }

    if (targetUser.id === author.id) {
      return context.reply({ content: "❌ You cannot ban yourself.", ephemeral: true });
    }
    if (targetUser.id === client.user.id) {
      return context.reply({ content: "❌ I cannot ban myself.", ephemeral: true });
    }
    if (targetUser.id === guild.ownerId) {
      return context.reply({ content: "❌ You cannot ban the server owner.", ephemeral: true });
    }

    // Role hierarchy check
    if (targetMember) {
      if (!targetMember.bannable) {
        return context.reply({
          content: "❌ I do not have permission to ban this member (their role is higher or equal to mine).",
          ephemeral: true,
        });
      }
      if (
        member.id !== guild.ownerId &&
        targetMember.roles.highest.position >= member.roles.highest.position
      ) {
        return context.reply({
          content: "❌ You cannot ban someone with an equal or higher role than yours.",
          ephemeral: true,
        });
      }

      // Send DM notification
      try {
        await targetUser.send({
          embeds: [
            new EmbedBuilder()
              .setColor(config.theme.danger)
              .setTitle(`🚫 You have been banned from ${guild.name}`)
              .addFields(
                { name: "Reason", value: reason },
                { name: "Moderator", value: author.tag || author.username }
              )
              .setTimestamp(),
          ],
        });
      } catch (e) {
        // DM failed (closed DMs), ignore
      }
    }

    try {
      const deleteSeconds = deleteDays * 86400;
      await guild.bans.create(targetUser.id, {
        reason: `${reason} | By ${author.tag || author.username}`,
        deleteMessageSeconds: deleteSeconds,
      });

      // Dispatch to centralized modlogger
      await sendModLog(guild, {
        action: "BAN",
        target: targetUser,
        moderator: author,
        reason,
        fields: [{ name: "Purged Messages", value: `${deleteDays} day(s)`, inline: true }],
      });

      const responseEmbed = new EmbedBuilder()
        .setColor(config.theme.danger)
        .setTitle("🚫 Member Successfully Banned")
        .setDescription(`**${targetUser.tag || targetUser.username}** has been banned from the server.`)
        .addFields(
          { name: "User", value: `<@${targetUser.id}> (\`${targetUser.id}\`)`, inline: true },
          { name: "Moderator", value: `<@${author.id}>`, inline: true },
          { name: "Reason", value: `\`\`\`${reason}\`\`\``, inline: false }
        )
        .setTimestamp();

      return context.reply({ embeds: [responseEmbed] });
    } catch (err) {
      console.error("[Ban Error]:", err);
      return context.reply({ content: `❌ Failed to ban user: ${err.message}`, ephemeral: true });
    }
  },
};
