const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { sendModLog } = require("../../utils/modLogger");
const { parseDuration, formatDuration } = require("../../utils/timeParser");
const config = require("../../config");

module.exports = {
  name: "timeout",
  aliases: ["mute"],
  category: "Moderation",
  description: "Timeout a member for a specified duration (e.g. 10m, 1h, 1d).",
  usage: "timeout <@user|id> <duration> [reason]",
  permissions: ["ModerateMembers"],
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member in the server.")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The user to timeout").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("duration").setDescription("Duration (e.g. 5m, 1h, 1d)").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Reason for timeout").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const author = isSlash ? context.user : context.author;
    const member = isSlash ? context.member : context.member;

    let targetMember, durationStr, reason;

    if (isSlash) {
      targetMember = context.options.getMember("user");
      durationStr = context.options.getString("duration");
      reason = context.options.getString("reason") || "No reason provided";
    } else {
      if (!args || args.length < 2) {
        return context.reply({ content: "❌ **Usage:** `,timeout <@user|id> <duration> [reason]` (e.g. `,timeout @user 10m Spamming`)" });
      }
      const rawTarget = args[0].replace(/[^0-9]/g, "");
      targetMember = guild.members.cache.get(rawTarget) || (await guild.members.fetch(rawTarget).catch(() => null));
      durationStr = args[1];
      reason = args.slice(2).join(" ") || "No reason provided";
    }

    if (!targetMember) {
      return context.reply({ content: "❌ Could not find that member in the server.", ephemeral: true });
    }

    if (targetMember.id === author.id) {
      return context.reply({ content: "❌ You cannot timeout yourself.", ephemeral: true });
    }
    if (targetMember.id === client.user.id) {
      return context.reply({ content: "❌ I cannot timeout myself.", ephemeral: true });
    }
    if (targetMember.id === guild.ownerId) {
      return context.reply({ content: "❌ You cannot timeout the server owner.", ephemeral: true });
    }

    const durationMs = parseDuration(durationStr);
    // Discord max timeout is 28 days
    const maxTimeoutMs = 28 * 24 * 60 * 60 * 1000;

    if (!durationMs || durationMs < 5000 || durationMs > maxTimeoutMs) {
      return context.reply({
        content: "❌ Invalid duration. Please provide a valid timeframe between 5s and 28d (e.g. `10m`, `2h`, `7d`).",
        ephemeral: true,
      });
    }

    if (!targetMember.moderatable) {
      return context.reply({
        content: "❌ I cannot timeout this member (their role is higher or equal to mine).",
        ephemeral: true,
      });
    }

    if (
      member.id !== guild.ownerId &&
      targetMember.roles.highest.position >= member.roles.highest.position
    ) {
      return context.reply({
        content: "❌ You cannot timeout someone with an equal or higher role than yours.",
        ephemeral: true,
      });
    }

    try {
      await targetMember.timeout(durationMs, `${reason} | By ${author.tag || author.username}`);

      // Try sending DM
      try {
        await targetMember.send({
          embeds: [
            new EmbedBuilder()
              .setColor(config.theme.warning)
              .setTitle(`⏳ You have been timed out in ${guild.name}`)
              .addFields(
                { name: "Duration", value: formatDuration(durationMs), inline: true },
                { name: "Moderator", value: author.tag || author.username, inline: true },
                { name: "Reason", value: reason, inline: false }
              )
              .setTimestamp(),
          ],
        });
      } catch (e) {}

      await sendModLog(guild, {
        action: "TIMEOUT",
        target: targetMember.user,
        moderator: author,
        reason,
        fields: [{ name: "Duration", value: formatDuration(durationMs), inline: true }],
      });

      const embed = new EmbedBuilder()
        .setColor(config.theme.warning)
        .setTitle("⏳ Member Timed Out")
        .setDescription(`**${targetMember.user.tag || targetMember.user.username}** has been timed out.`)
        .addFields(
          { name: "User", value: `<@${targetMember.id}> (\`${targetMember.id}\`)`, inline: true },
          { name: "Duration", value: formatDuration(durationMs), inline: true },
          { name: "Moderator", value: `<@${author.id}>`, inline: true },
          { name: "Reason", value: `\`\`\`${reason}\`\`\``, inline: false }
        )
        .setTimestamp();

      return context.reply({ embeds: [embed] });
    } catch (err) {
      console.error("[Timeout Error]:", err);
      return context.reply({ content: `❌ Failed to timeout user: ${err.message}`, ephemeral: true });
    }
  },
};
