const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");

module.exports = {
  name: "userinfo",
  aliases: ["whois", "uinfo"],
  category: "Utility",
  description: "Display detailed information about a user or yourself.",
  usage: "userinfo [@user|id]",
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Display user information.")
    .addUserOption((opt) => opt.setName("user").setDescription("The user to lookup").setRequired(false)),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const author = isSlash ? context.user : context.author;

    let targetUser, targetMember;

    if (isSlash) {
      targetUser = context.options.getUser("user") || author;
      targetMember = guild.members.cache.get(targetUser.id);
    } else {
      if (args && args[0]) {
        const rawTarget = args[0].replace(/[^0-9]/g, "");
        targetMember = guild.members.cache.get(rawTarget) || (await guild.members.fetch(rawTarget).catch(() => null));
        targetUser = targetMember ? targetMember.user : await client.users.fetch(rawTarget).catch(() => null);
      } else {
        targetUser = author;
        targetMember = context.member;
      }
    }

    if (!targetUser) {
      return context.reply({ content: "❌ Could not find that user.", ephemeral: true });
    }

    const createdTs = Math.floor(targetUser.createdTimestamp / 1000);
    const joinedTs = targetMember ? Math.floor(targetMember.joinedTimestamp / 1000) : null;

    const roles = targetMember
      ? targetMember.roles.cache
          .filter((r) => r.id !== guild.id)
          .sort((a, b) => b.position - a.position)
          .map((r) => `<@&${r.id}>`)
      : [];

    const displayedRoles = roles.length > 10 ? `${roles.slice(0, 10).join(", ")} and ${roles.length - 10} more...` : roles.join(", ") || "`None`";

    const embed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle(`👤 User Information | ${targetUser.tag || targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
      .addFields(
        { name: "User Tag / ID", value: `${targetUser.tag || targetUser.username}\n\`${targetUser.id}\``, inline: true },
        { name: "Nickname", value: targetMember?.nickname ? `\`${targetMember.nickname}\`` : "`None`", inline: true },
        { name: "Bot Account", value: targetUser.bot ? "🤖 Yes" : "👤 No", inline: true },
        { name: "Account Created", value: `<t:${createdTs}:F>\n(<t:${createdTs}:R>)`, inline: true },
        ...(joinedTs ? [{ name: "Joined Server", value: `<t:${joinedTs}:F>\n(<t:${joinedTs}:R>)`, inline: true }] : []),
        { name: `Roles (${roles.length})`, value: displayedRoles, inline: false }
      )
      .setFooter({ text: "Mina Bot Utility" })
      .setTimestamp();

    return context.reply({ embeds: [embed] });
  },
};
