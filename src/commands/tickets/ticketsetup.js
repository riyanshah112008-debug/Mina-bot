const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const db = require("../../utils/database");
const config = require("../../config");

module.exports = {
  name: "ticketsetup",
  aliases: ["setuptickets", "tickets"],
  category: "Tickets",
  description: "Deploy the interactive support ticket portal in this channel.",
  usage: "ticketsetup",
  permissions: ["ManageGuild"],
  data: new SlashCommandBuilder()
    .setName("ticketsetup")
    .setDescription("Deploy the ticket portal in the current channel.")
    .addRoleOption((opt) =>
      opt.setName("support_role").setDescription("Role that can respond to tickets").setRequired(false)
    )
    .addChannelOption((opt) =>
      opt.setName("log_channel").setDescription("Channel for ticket transcripts & logs").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const channel = context.channel;

    let supportRole, logChannel;

    if (isSlash) {
      supportRole = context.options.getRole("support_role");
      logChannel = context.options.getChannel("log_channel");
    } else {
      supportRole = guild.roles.cache.find(
        (r) => ["staff", "support", "moderator", "admin"].includes(r.name.toLowerCase())
      );
    }

    // Get or create Ticket Categories
    let openCategory = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && c.name.toUpperCase() === "SUPPORT TICKETS"
    );
    if (!openCategory) {
      try {
        openCategory = await guild.channels.create({
          name: "SUPPORT TICKETS",
          type: ChannelType.GuildCategory,
        });
      } catch (e) {
        console.error("Could not create support tickets category:", e.message);
      }
    }

    let closedCategory = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && c.name.toUpperCase() === "CLOSED TICKETS"
    );
    if (!closedCategory) {
      try {
        closedCategory = await guild.channels.create({
          name: "CLOSED TICKETS",
          type: ChannelType.GuildCategory,
        });
      } catch (e) {}
    }

    // Save configuration
    db.setTicketConfig(guild.id, {
      panelChannelId: channel.id,
      categoryId: openCategory ? openCategory.id : null,
      closedCategoryId: closedCategory ? closedCategory.id : null,
      logChannelId: logChannel ? logChannel.id : null,
      supportRoles: supportRole ? [supportRole.id] : [],
    });

    const panelEmbed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle("🎫 Support & Assistance Portal")
      .setDescription(
        "Welcome to the official server support desk!\n\n" +
        "Need help, want to report a rule breaker, or discuss a partnership?\n" +
        "Select the category that best matches your request below to open a private ticket.\n\n" +
        "• 💬 **General Support** — General questions & technical inquiries\n" +
        "• 🛡️ **Player / Staff Report** — Report harassment, TOS breaks, or issues\n" +
        "• 💼 **Partnerships & Staff** — Server partnership or staff applications\n" +
        "• ❓ **Other Assistance** — Miscellaneous queries\n\n" +
        "*(Please do not create duplicate tickets. A staff member will assist you promptly).* "
      )
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setFooter({ text: "Mina Bot Ticket Engine • 24/7 Support" })
      .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("ticket_category_select")
      .setPlaceholder("📩 Select a ticket category to open...")
      .addOptions(
        {
          label: "General Support",
          value: "ticket_general",
          description: "General assistance, account questions, and server help",
          emoji: "💬",
        },
        {
          label: "Player / Staff Report",
          value: "ticket_report",
          description: "Confidential reports regarding rule-breaking or abuse",
          emoji: "🛡️",
        },
        {
          label: "Partnerships & Staff",
          value: "ticket_apply",
          description: "Inquire about server partnerships or staff positions",
          emoji: "💼",
        },
        {
          label: "Other Assistance",
          value: "ticket_other",
          description: "Questions not covered by the categories above",
          emoji: "❓",
        }
      );

    const quickButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_quick_open")
        .setLabel("Quick Support Ticket")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("📩")
    );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await channel.send({ embeds: [panelEmbed], components: [row, quickButton] });

    if (isSlash) {
      return context.reply({ content: "✅ Ticket panel successfully deployed!", ephemeral: true });
    } else if (context.deletable) {
      await context.delete().catch(() => null);
    }
  },
};
