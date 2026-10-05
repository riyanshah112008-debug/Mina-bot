const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");

module.exports = {
  name: "userinfo",
  aliases: ["whois", "uinfo"],
  category: "Utility",
  description: "Display detailed profile intelligence and member status.",
  usage: "userinfo [@user|id]",
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Display user profile intelligence and server status.")
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

    // Try fetching full user for banner & badges
    const fullUser = await client.users.fetch(targetUser.id, { force: true }).catch(() => targetUser);

    const createdTs = Math.floor(fullUser.createdTimestamp / 1000);
    const joinedTs = targetMember ? Math.floor(targetMember.joinedTimestamp / 1000) : null;

    const roles = targetMember
      ? targetMember.roles.cache
          .filter((r) => r.id !== guild.id)
          .sort((a, b) => b.position - a.position)
          .map((r) => `<@&${r.id}>`)
      : [];

    const displayedRoles = roles.length > 8 ? `${roles.slice(0, 8).join(", ")} and ${roles.length - 8} more...` : (roles.join(", ") || "`None`");

    const keyPerms = [];
    if (targetMember) {
      if (targetMember.permissions.has(PermissionFlagsBits.Administrator)) keyPerms.push("Administrator 🛡️");
      else {
        if (targetMember.permissions.has(PermissionFlagsBits.ManageGuild)) keyPerms.push("Manage Server");
        if (targetMember.permissions.has(PermissionFlagsBits.BanMembers)) keyPerms.push("Ban Members");
        if (targetMember.permissions.has(PermissionFlagsBits.KickMembers)) keyPerms.push("Kick Members");
        if (targetMember.permissions.has(PermissionFlagsBits.ManageChannels)) keyPerms.push("Manage Channels");
        if (targetMember.permissions.has(PermissionFlagsBits.MentionEveryone)) keyPerms.push("Mention @everyone");
      }
    }

    const embedColor = (targetMember?.displayHexColor && targetMember.displayHexColor !== "#000000")
      ? targetMember.displayHexColor
      : (config.theme?.primary || config.EMBED_COLORS?.PRIMARY || "#5865F2");

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setAuthor({
        name: `${fullUser.tag || fullUser.username} • User Identity`,
        iconURL: fullUser.displayAvatarURL({ dynamic: true })
      })
      .setThumbnail(fullUser.displayAvatarURL({ dynamic: true, size: 512 }))
      .setDescription(
        `>>> **Profile Summary & Attributes**\n` +
        `• **Mention:** <@${fullUser.id}>\n` +
        `• **User ID:** \`${fullUser.id}\`\n` +
        `• **Account Type:** ${fullUser.bot ? "🤖 **Bot Account**" : "👤 **Human User**"}`
      )
      .addFields(
        {
          name: "📅 Account Created",
          value: `<t:${createdTs}:D>\n(<t:${createdTs}:R>)`,
          inline: true
        },
        ...(joinedTs ? [{
          name: "📥 Joined Server",
          value: `<t:${joinedTs}:D>\n(<t:${joinedTs}:R>)`,
          inline: true
        }] : []),
        {
          name: "👑 Top Role",
          value: targetMember?.roles?.highest ? `<@&${targetMember.roles.highest.id}>` : "`None`",
          inline: true
        },
        ...(keyPerms.length > 0 ? [{
          name: "🛡️ Key Privileges",
          value: `\`${keyPerms.join(", ")}\``,
          inline: false
        }] : []),
        {
          name: `🏷️ Roles (${roles.length})`,
          value: displayedRoles,
          inline: false
        }
      )
      .setFooter({ text: `${config.BOT_NAME || "Mina"} System • Identity Intelligence` })
      .setTimestamp();

    if (fullUser.banner) {
      embed.setImage(fullUser.bannerURL({ dynamic: true, size: 1024 }));
    }

    return context.reply({ embeds: [embed] });
  },
};
