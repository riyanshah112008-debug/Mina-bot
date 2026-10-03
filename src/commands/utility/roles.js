const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");

module.exports = {
  name: "roles",
  aliases: ["rolelist", "serverroles"],
  category: "Utility",
  description: "Display an indexed directory of all roles in this server.",
  usage: "roles",
  data: new SlashCommandBuilder()
    .setName("roles")
    .setDescription("Display an indexed directory of all roles in this server."),

  async execute(context, args, client) {
    const guild = context.guild;
    if (!guild) {
      return context.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
    }

    const roles = guild.roles.cache
      .filter((r) => r.id !== guild.id) // Exclude @everyone
      .sort((a, b) => b.position - a.position);

    const totalRoles = roles.size;
    const roleList = Array.from(roles.values()).slice(0, 30);
    const remaining = totalRoles > 30 ? totalRoles - 30 : 0;

    const formattedList = roleList
      .map((r, idx) => `\`${idx + 1}.\` <@&${r.id}> • \`${r.members.size} members\` ${r.hoist ? "📌" : ""}`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle(`📜 Server Roles (${totalRoles}) • ${guild.name}`)
      .setDescription(
        formattedList.length > 0 ? formattedList : "*No custom roles created yet.*"
      )
      .setFooter({
        text: remaining > 0 ? `... and ${remaining} more roles • Mina Role Directory` : "Mina Role Directory",
      })
      .setTimestamp();

    return context.reply({ embeds: [embed] });
  },
};
