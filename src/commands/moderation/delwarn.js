const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const db = require("../../utils/database");
const config = require("../../config");

module.exports = {
  name: "delwarn",
  aliases: ["removewarn", "deletewarn"],
  category: "Moderation",
  description: "Delete a specific warning by its ID.",
  usage: "delwarn <warningId>",
  permissions: ["ModerateMembers"],
  data: new SlashCommandBuilder()
    .setName("delwarn")
    .setDescription("Delete a specific warning by ID.")
    .addStringOption((opt) =>
      opt.setName("id").setDescription("The Warning ID to remove").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();

    let warnId;
    if (isSlash) {
      warnId = context.options.getString("id").trim();
    } else {
      if (!args || !args[0]) {
        return context.reply({ content: "❌ **Usage:** `,delwarn <warningId>`" });
      }
      warnId = args[0].replace("#", "").trim();
    }

    const deleted = db.deleteWarning(warnId);
    if (!deleted) {
      return context.reply({ content: `❌ Warning \`#${warnId}\` was not found.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(config.theme.success)
      .setTitle("✅ Warning Deleted")
      .setDescription(`Warning case \`#${warnId}\` has been permanently removed.`);

    return context.reply({ embeds: [embed] });
  },
};
