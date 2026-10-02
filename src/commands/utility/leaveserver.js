const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");

module.exports = {
  name: "leaveserver",
  aliases: ["botleave", "forceleave", "emergencyleave"],
  category: "Utility",
  description: "Emergency command for Bot Owners to force the bot to leave a server.",
  usage: "leaveserver <guildId> [reason]",
  data: new SlashCommandBuilder()
    .setName("leaveserver")
    .setDescription("Emergency command for Bot Owners to force the bot to leave a server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt.setName("guild_id").setDescription("ID of the server to leave").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Reason for emergency departure").setRequired(false)
    ),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const user = isSlash ? context.user : context.author;

    // Strict Bot Owner access check
    if (!config.isOwner(user.id)) {
      return context.reply({
        content: "⛔ **Access Denied**: This emergency command is strictly restricted to Mina Bot Owners.",
        ephemeral: true,
      });
    }

    let targetGuildId, reason;

    if (isSlash) {
      targetGuildId = context.options.getString("guild_id")?.trim();
      reason = context.options.getString("reason")?.trim() || "No reason specified";
    } else {
      if (!args || !args[0]) {
        const prefix = config.prefix || "?";
        return context.reply({
          content: `❌ **Usage:** \`${prefix}leaveserver <guildId> [reason]\`\nAliases: \`${prefix}botleave\`, \`${prefix}forceleave\``,
        });
      }
      targetGuildId = args[0].trim();
      reason = args.slice(1).join(" ").trim() || "No reason specified";
    }

    if (!/^\d{17,20}$/.test(targetGuildId)) {
      return context.reply({
        content: `❌ Invalid Guild ID format: \`${targetGuildId}\`. Guild IDs are 17–20 digits.`,
        ephemeral: true,
      });
    }

    // Defer reply if possible
    if (isSlash) {
      await context.deferReply({ ephemeral: true });
    }

    try {
      let guild = client.guilds.cache.get(targetGuildId);
      if (!guild) {
        guild = await client.guilds.fetch(targetGuildId).catch(() => null);
      }

      if (!guild) {
        const errMsg = `❌ Guild with ID \`${targetGuildId}\` was not found in the bot's cache or Discord API.`;
        return isSlash ? context.editReply({ content: errMsg }) : context.reply({ content: errMsg });
      }

      const guildName = guild.name;
      const memberCount = guild.memberCount;
      const ownerId = guild.ownerId;

      // Execute emergency departure
      await guild.leave();

      const embed = new EmbedBuilder()
        .setColor(config.theme.danger || 0xed4245)
        .setTitle("🚪 Emergency Server Departure Executed")
        .setDescription(`Successfully disconnected and severed bot connection from target guild.`)
        .addFields(
          { name: "Server Name", value: `**${guildName}**`, inline: true },
          { name: "Server ID", value: `\`${targetGuildId}\``, inline: true },
          { name: "Members", value: `${memberCount.toLocaleString()}`, inline: true },
          { name: "Guild Owner", value: `<@${ownerId}> (\`${ownerId}\`)`, inline: true },
          { name: "Reason", value: `\`\`\`${reason}\`\`\``, inline: false },
          { name: "Executed By", value: `<@${user.id}> (\`${user.tag || user.username}\`)`, inline: true }
        )
        .setFooter({ text: "Mina Bot Dev Security Operations" })
        .setTimestamp();

      if (isSlash) {
        return context.editReply({ embeds: [embed] });
      } else {
        return context.reply({ embeds: [embed] });
      }
    } catch (err) {
      console.error("[leaveserver] Emergency departure failed:", err);
      const errReply = `❌ Failed to leave server \`${targetGuildId}\`: ${err.message}`;
      return isSlash ? context.editReply({ content: errReply }) : context.reply({ content: errReply });
    }
  },
};
