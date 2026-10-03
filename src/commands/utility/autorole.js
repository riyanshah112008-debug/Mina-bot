const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const config = require("../../config");
const db = require("../../utils/database");

module.exports = {
  name: "autorole",
  aliases: ["setautorole", "joinroles"],
  category: "Utility",
  description: "Configure automatic role assignment for newly joined members and bots.",
  usage: "autorole [add @role | bot @role | remove @role | clear]",
  data: new SlashCommandBuilder()
    .setName("autorole")
    .setDescription("Configure automatic role assignment for newly joined members and bots.")
    .addSubcommand((sub) =>
      sub.setName("view").setDescription("View the current autorole configuration.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("add_member")
        .setDescription("Add an autorole automatically assigned to human members on join.")
        .addRoleOption((opt) =>
          opt.setName("role").setDescription("Role to assign to new members").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("add_bot")
        .setDescription("Add an autorole automatically assigned to bots on join.")
        .addRoleOption((opt) =>
          opt.setName("role").setDescription("Role to assign to new bots").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a role from the autorole configuration.")
        .addRoleOption((opt) =>
          opt.setName("role").setDescription("Role to remove").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("clear").setDescription("Clear all autorole configurations.")
    ),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const member = context.member;

    if (!guild) {
      return context.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
    }

    const currentConfig = db.getAutoroleConfig(guild.id);
    const prefix = db.getGuildSettings(guild.id)?.prefix || config.prefix || "?";

    let subcommand = isSlash ? context.options.getSubcommand() : null;
    if (!isSlash) {
      const firstArg = args && args[0] ? args[0].toLowerCase() : null;
      if (firstArg === "add" || firstArg === "member" || firstArg === "user") {
        subcommand = "add_member";
        args = args.slice(1);
      } else if (firstArg === "bot" || firstArg === "addbot") {
        subcommand = "add_bot";
        args = args.slice(1);
      } else if (firstArg === "remove" || firstArg === "del" || firstArg === "delete") {
        subcommand = "remove";
        args = args.slice(1);
      } else if (firstArg === "clear" || firstArg === "reset") {
        subcommand = "clear";
      } else {
        subcommand = "view";
      }
    }

    // 1. VIEW CONFIGURATION
    if (subcommand === "view") {
      const memberRoleMentions = currentConfig.memberRoles.length > 0
        ? currentConfig.memberRoles.map((id) => `<@&${id}>`).join(", ")
        : "*None configured*";

      const botRoleMentions = currentConfig.botRoles.length > 0
        ? currentConfig.botRoles.map((id) => `<@&${id}>`).join(", ")
        : "*None configured*";

      const embed = new EmbedBuilder()
        .setColor(config.theme.primary)
        .setTitle(`🛡️ Autorole System • ${guild.name}`)
        .setDescription(
          `Roles configured here are automatically assigned to new users when they join.\n\n` +
          `• **Human Member Roles:** ${memberRoleMentions}\n` +
          `• **Bot Roles:** ${botRoleMentions}\n\n` +
          `**Commands:**\n` +
          `• Add Member Role: \`${prefix}autorole add @role\`\n` +
          `• Add Bot Role: \`${prefix}autorole bot @role\`\n` +
          `• Remove Role: \`${prefix}autorole remove @role\`\n` +
          `• Clear All: \`${prefix}autorole clear\``
        )
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setFooter({ text: "Mina Autorole Engine" })
        .setTimestamp();

      return context.reply({ embeds: [embed] });
    }

    // PERMISSIONS GATE
    if (!member.permissions.has(PermissionFlagsBits.ManageRoles) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return context.reply({
        content: "❌ You need the **Manage Roles** permission to configure autoroles.",
        ephemeral: true,
      });
    }

    // 2. CLEAR ALL
    if (subcommand === "clear") {
      db.setAutoroleConfig(guild.id, { memberRoles: [], botRoles: [], enabled: false });
      return context.reply({
        content: "✅ All autoroles have been cleared and the autorole system is disabled.",
      });
    }

    // RESOLVE TARGET ROLE FOR ADD / REMOVE
    let targetRole = null;
    if (isSlash) {
      targetRole = context.options.getRole("role");
    } else if (context.mentions?.roles?.first()) {
      targetRole = context.mentions.roles.first();
    } else if (args && args[0]) {
      const id = args[0].replace(/[^0-9]/g, "");
      targetRole = guild.roles.cache.get(id);
    }

    if (!targetRole) {
      return context.reply({
        content: `❌ Please mention a valid role.\n**Example:** \`${prefix}autorole add @Members\``,
        ephemeral: true,
      });
    }

    if (targetRole.managed) {
      return context.reply({
        content: "❌ Managed integration/bot roles cannot be assigned via autorole.",
        ephemeral: true,
      });
    }

    const botMember = guild.members.me;
    if (botMember && targetRole.position >= botMember.roles.highest.position) {
      return context.reply({
        content: `❌ That role (<@&${targetRole.id}>) is higher than or equal to my highest role! Please move my role higher in Server Settings.`,
        ephemeral: true,
      });
    }

    // 3. ADD MEMBER ROLE
    if (subcommand === "add_member") {
      const memberRoles = Array.from(new Set([...currentConfig.memberRoles, targetRole.id]));
      db.setAutoroleConfig(guild.id, { memberRoles, enabled: true });
      return context.reply({
        content: `✅ <@&${targetRole.id}> will now be automatically given to all newly joined human members!`,
      });
    }

    // 4. ADD BOT ROLE
    if (subcommand === "add_bot") {
      const botRoles = Array.from(new Set([...currentConfig.botRoles, targetRole.id]));
      db.setAutoroleConfig(guild.id, { botRoles, enabled: true });
      return context.reply({
        content: `✅ <@&${targetRole.id}> will now be automatically given to all newly invited bots!`,
      });
    }

    // 5. REMOVE ROLE
    if (subcommand === "remove") {
      const memberRoles = currentConfig.memberRoles.filter((id) => id !== targetRole.id);
      const botRoles = currentConfig.botRoles.filter((id) => id !== targetRole.id);
      const enabled = memberRoles.length > 0 || botRoles.length > 0;
      db.setAutoroleConfig(guild.id, { memberRoles, botRoles, enabled });
      return context.reply({
        content: `✅ <@&${targetRole.id}> was removed from the autorole configuration.`,
      });
    }
  },
};
