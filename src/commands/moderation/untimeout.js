const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { sendModLog } = require("../../utils/modLogger");
const config = require("../../config");

module.exports = {
  name: "untimeout",
  aliases: ["unmute"],
  category: "Moderation",
  description: "Remove timeout from a member.",
  usage: "untimeout <@user|id> [reason]",
  permissions: ["ModerateMembers"],
  data: new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Remove timeout from a member.")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The user to remove timeout from").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Reason for removing timeout").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const author = isSlash ? context.user : context.author;

    let targetMember, reason;

    if (isSlash) {
      targetMember = context.options.getMember("user");
      reason = context.options.getString("reason") || "No reason provided";
    } else {
      if (!args || !args[0]) {
        return context.reply({ content: "❌ **Usage:** `,untimeout <@user|id> [reason]`" });
      }
      const rawTarget = args[0].replace(/[^0-9]/g, "");
      targetMember = guild.members.cache.get(rawTarget) || (await guild.members.fetch(rawTarget).catch(() => null));
      reason = args.slice(1).join(" ") || "No reason provided";
    }

    if (!targetMember) {
      return context.reply({ content: "❌ Could not find that member in the server.", ephemeral: true });
    }

    if (!targetMember.communicationDisabledUntilTimestamp || targetMember.communicationDisabledUntilTimestamp < Date.now()) {
      return context.reply({ content: "❌ This member is not currently timed out.", ephemeral: true });
    }

    try {
      await targetMember.timeout(null, `${reason} | By ${author.tag || author.username}`);

      await sendModLog(guild, {
        action: "UNTIMEOUT",
        target: targetMember.user,
        moderator: author,
        reason,
      });

      const embed = new EmbedBuilder()
        .setColor(config.theme.success)
        .setTitle("🔊 Timeout Removed")
        .setDescription(`Timeout for **${targetMember.user.tag || targetMember.user.username}** has been lifted.`)
        .addFields(
          { name: "User", value: `<@${targetMember.id}>`, inline: true },
          { name: "Moderator", value: `<@${author.id}>`, inline: true },
          { name: "Reason", value: `\`\`\`${reason}\`\`\``, inline: false }
        )
        .setTimestamp();

      return context.reply({ embeds: [embed] });
    } catch (err) {
      console.error("[Untimeout Error]:", err);
      return context.reply({ content: `❌ Failed to remove timeout: ${err.message}`, ephemeral: true });
    }
  },
};
