const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { sendModLog } = require("../../utils/modLogger");
const config = require("../../config");

module.exports = {
  name: "unban",
  category: "Moderation",
  description: "Unban a user from the server by their ID.",
  usage: "unban <userId> [reason]",
  permissions: ["BanMembers"],
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user from the server.")
    .addStringOption((opt) =>
      opt.setName("user_id").setDescription("The ID of the user to unban").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Reason for unbanning").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const author = isSlash ? context.user : context.author;

    let userId, reason;

    if (isSlash) {
      userId = context.options.getString("user_id").trim();
      reason = context.options.getString("reason") || "No reason provided";
    } else {
      if (!args || !args[0]) {
        return context.reply({ content: "❌ **Usage:** `,unban <userId> [reason]`" });
      }
      userId = args[0].replace(/[^0-9]/g, "");
      reason = args.slice(1).join(" ") || "No reason provided";
    }

    try {
      // Check if user is in bans
      const banInfo = await guild.bans.fetch(userId).catch(() => null);
      if (!banInfo) {
        return context.reply({
          content: "❌ That user is not currently banned from this server.",
          ephemeral: true,
        });
      }

      await guild.bans.remove(userId, `${reason} | By ${author.tag || author.username}`);

      await sendModLog(guild, {
        action: "UNBAN",
        target: banInfo.user,
        moderator: author,
        reason,
      });

      const embed = new EmbedBuilder()
        .setColor(config.theme.success)
        .setTitle("✅ Member Successfully Unbanned")
        .setDescription(`**${banInfo.user.tag || banInfo.user.username}** has been unbanned.`)
        .addFields(
          { name: "User", value: `<@${userId}> (\`${userId}\`)`, inline: true },
          { name: "Moderator", value: `<@${author.id}>`, inline: true },
          { name: "Reason", value: `\`\`\`${reason}\`\`\``, inline: false }
        )
        .setTimestamp();

      return context.reply({ embeds: [embed] });
    } catch (err) {
      console.error("[Unban Error]:", err);
      return context.reply({ content: `❌ Failed to unban: ${err.message}`, ephemeral: true });
    }
  },
};
