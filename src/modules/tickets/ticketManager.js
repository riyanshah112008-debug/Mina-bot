const {
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
} = require("discord.js");
const db = require("../../utils/database");
const config = require("../../config");

// Category label mappings
const CATEGORY_NAMES = {
  ticket_general: "General Support",
  ticket_report: "Player / Staff Report",
  ticket_apply: "Partnerships & Staff",
  ticket_other: "Other Assistance",
  ticket_quick_open: "Quick Support",
};

/**
 * Checks if a member has staff / support permissions.
 */
function isStaff(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return true;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  const settings = db.getTicketConfig(member.guild.id);
  if (settings.supportRoles && settings.supportRoles.some((rId) => member.roles.cache.has(rId))) {
    return true;
  }
  return member.roles.cache.some((r) =>
    ["staff", "moderator", "admin", "support", "helper"].includes(r.name.toLowerCase())
  );
}

/**
 * Generates an HTML transcript file from messages in a channel.
 */
async function generateTranscript(channel) {
  try {
    const fetched = await channel.messages.fetch({ limit: 100 });
    const messages = Array.from(fetched.values()).reverse();

    let transcriptText = `Mina Bot Ticket Transcript - #${channel.name}\n`;
    transcriptText += `Guild: ${channel.guild.name} (${channel.guild.id})\n`;
    transcriptText += `Exported At: ${new Date().toISOString()}\n`;
    transcriptText += `========================================================\n\n`;

    for (const msg of messages) {
      const time = new Date(msg.createdTimestamp).toLocaleTimeString();
      const author = `${msg.author.tag || msg.author.username} (${msg.author.id})`;
      const content = msg.content || (msg.embeds.length ? "[Embed Content]" : "");
      transcriptText += `[${time}] ${author}: ${content}\n`;
      if (msg.attachments.size) {
        msg.attachments.forEach((a) => {
          transcriptText += `   [Attachment: ${a.url}]\n`;
        });
      }
    }

    return new AttachmentBuilder(Buffer.from(transcriptText, "utf-8"), {
      name: `transcript-${channel.name}.txt`,
    });
  } catch (err) {
    console.error("[Transcript Error]:", err);
    return null;
  }
}

/**
 * Main Interaction Handler for Tickets.
 */
async function handleTicketInteraction(interaction, client) {
  const guild = interaction.guild;
  const user = interaction.user;
  const member = interaction.member;

  // 1. OPEN TICKET
  if (
    (interaction.isStringSelectMenu() && interaction.customId === "ticket_category_select") ||
    (interaction.isButton() && interaction.customId === "ticket_quick_open")
  ) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const categoryValue = interaction.isStringSelectMenu()
        ? interaction.values[0]
        : "ticket_quick_open";
      const categoryLabel = CATEGORY_NAMES[categoryValue] || "General Support";

      const ticketConfig = db.getTicketConfig(guild.id);

      // Check existing open ticket for user
      const existingChannel = guild.channels.cache.find(
        (c) => c.topic === user.id && c.name.startsWith("ticket-")
      );
      if (existingChannel) {
        return interaction.editReply({
          content: `⚠️ You already have an open ticket in <#${existingChannel.id}>. Please resolve that ticket before opening a new one!`,
        });
      }

      const ticketNum = (ticketConfig.ticketCounter || 1).toString().padStart(4, "0");
      db.setTicketConfig(guild.id, { ticketCounter: (ticketConfig.ticketCounter || 1) + 1 });

      const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15) || "user";
      const channelName = `ticket-${cleanUsername}-${ticketNum}`;

      // Overwrites
      const permissionOverwrites = [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.EmbedLinks,
          ],
        },
        {
          id: client.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.EmbedLinks,
            PermissionsBitField.Flags.AttachFiles,
          ],
        },
      ];

      // Add support roles to permissions
      if (ticketConfig.supportRoles && ticketConfig.supportRoles.length) {
        for (const roleId of ticketConfig.supportRoles) {
          const r = guild.roles.cache.get(roleId);
          if (r) {
            permissionOverwrites.push({
              id: r.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
              ],
            });
          }
        }
      }

      const category = ticketConfig.categoryId
        ? guild.channels.cache.get(ticketConfig.categoryId)
        : null;

      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        topic: user.id,
        parent: category ? category.id : undefined,
        permissionOverwrites,
      });

      // Save record in DB
      db.createTicketRecord(ticketChannel.id, {
        guildId: guild.id,
        userId: user.id,
        username: user.username,
        category: categoryLabel,
        ticketNumber: ticketNum,
      });

      // In-Ticket Header Embed
      const ticketEmbed = new EmbedBuilder()
        .setColor(config.theme.primary)
        .setTitle(`🎫 Support Ticket #${ticketNum} | ${categoryLabel}`)
        .setDescription(
          `Hello <@${user.id}>! Thank you for reaching out to **${guild.name}** support.\n\n` +
          `A member of our support team has been notified and will assist you shortly.\n` +
          `Please provide all relevant details, screenshots, or questions below.\n\n` +
          `• **Status:** \`UNCLAIMED 🟡\`\n` +
          `• **Category:** \`${categoryLabel}\``
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "Use the buttons below to manage this ticket session." })
        .setTimestamp();

      const actionRow1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ticket_claim").setLabel("Claim Ticket").setStyle(ButtonStyle.Success).setEmoji("✋"),
        new ButtonBuilder().setCustomId("ticket_close").setLabel("Close Ticket").setStyle(ButtonStyle.Danger).setEmoji("🔒"),
        new ButtonBuilder().setCustomId("ticket_transcript").setLabel("Transcript").setStyle(ButtonStyle.Secondary).setEmoji("📝")
      );

      const actionRow2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ticket_add_member").setLabel("Add Member").setStyle(ButtonStyle.Primary).setEmoji("👥"),
        new ButtonBuilder().setCustomId("ticket_remove_member").setLabel("Remove Member").setStyle(ButtonStyle.Secondary).setEmoji("🚫")
      );

      await ticketChannel.send({
        content: `<@${user.id}> Welcome! Staff notification: ${
          ticketConfig.supportRoles?.length ? ticketConfig.supportRoles.map((r) => `<@&${r}>`).join(" ") : "@here"
        }`,
        embeds: [ticketEmbed],
        components: [actionRow1, actionRow2],
      });

      return interaction.editReply({
        content: `✅ Your support ticket has been created: <#${ticketChannel.id}>`,
      });
    } catch (err) {
      console.error("[Ticket Creation Error]:", err);
      return interaction.editReply({ content: `❌ Failed to open ticket: ${err.message}` }).catch(() => null);
    }
  }

  // 2. CLAIM TICKET
  if (interaction.isButton() && interaction.customId === "ticket_claim") {
    if (!isStaff(member)) {
      return interaction.reply({ content: "❌ Only support staff members can claim tickets.", ephemeral: true });
    }

    const channel = interaction.channel;
    const ticketRecord = db.getTicketRecord(channel.id);

    if (ticketRecord && ticketRecord.claimedBy) {
      return interaction.reply({
        content: `⚠️ This ticket has already been claimed by <@${ticketRecord.claimedBy}>!`,
        ephemeral: true,
      });
    }

    db.updateTicketRecord(channel.id, { claimedBy: user.id, status: "claimed" });

    const cleanName = channel.name.replace("ticket-", "").replace("claimed-", "");
    await channel.setName(`claimed-${cleanName}`).catch(() => null);

    const claimedEmbed = new EmbedBuilder()
      .setColor(config.theme.success)
      .setTitle("✋ Ticket Claimed")
      .setDescription(`This ticket is now being handled by <@${user.id}>.`)
      .setTimestamp();

    const updatedRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("ticket_claimed_btn").setLabel(`Claimed by ${user.username}`).setStyle(ButtonStyle.Secondary).setDisabled(true).setEmoji("✅"),
      new ButtonBuilder().setCustomId("ticket_close").setLabel("Close Ticket").setStyle(ButtonStyle.Danger).setEmoji("🔒"),
      new ButtonBuilder().setCustomId("ticket_transcript").setLabel("Transcript").setStyle(ButtonStyle.Secondary).setEmoji("📝")
    );

    const msg = interaction.message;
    if (msg) {
      const components = [...msg.components];
      components[0] = updatedRow;
      await interaction.update({ components }).catch(() => null);
    } else {
      await interaction.deferUpdate().catch(() => null);
    }

    return channel.send({ embeds: [claimedEmbed] });
  }

  // 3. CLOSE TICKET
  if (interaction.isButton() && interaction.customId === "ticket_close") {
    if (!isStaff(member) && interaction.channel.topic !== user.id) {
      return interaction.reply({ content: "❌ You do not have permission to close this ticket.", ephemeral: true });
    }

    await interaction.reply({ content: "🔒 Closing ticket and generating transcript in 5 seconds..." });

    const channel = interaction.channel;
    const ticketRecord = db.getTicketRecord(channel.id);
    const openerId = channel.topic || ticketRecord?.userId;

    const transcriptAttachment = await generateTranscript(channel);

    const closeEmbed = new EmbedBuilder()
      .setColor(config.theme.danger)
      .setTitle("🔒 Support Ticket Closed")
      .addFields(
        { name: "Ticket", value: `#${channel.name}`, inline: true },
        { name: "Closed By", value: `<@${user.id}>`, inline: true },
        { name: "Opener", value: openerId ? `<@${openerId}>` : "`Unknown`", inline: true }
      )
      .setTimestamp();

    // Send transcript to ticket log channel
    const ticketConfig = db.getTicketConfig(guild.id);
    if (ticketConfig.logChannelId) {
      const logChan = guild.channels.cache.get(ticketConfig.logChannelId);
      if (logChan && logChan.isTextBased()) {
        await logChan.send({
          embeds: [closeEmbed],
          files: transcriptAttachment ? [transcriptAttachment] : [],
        }).catch(() => null);
      }
    }

    // Try sending transcript to opener
    if (openerId) {
      try {
        const openerUser = await client.users.fetch(openerId).catch(() => null);
        if (openerUser) {
          await openerUser.send({
            content: `Your support ticket in **${guild.name}** has been closed. Attached is a full transcript for your records.`,
            embeds: [closeEmbed],
            files: transcriptAttachment ? [transcriptAttachment] : [],
          });
        }
      } catch (e) {}
    }

    db.updateTicketRecord(channel.id, {
      status: "closed",
      closedAt: new Date().toISOString(),
      closedBy: user.id,
    });

    setTimeout(async () => {
      await channel.delete(`Ticket closed by ${user.tag || user.username}`).catch(() => null);
    }, 5000);
  }

  // 4. TRANSCRIPT ON DEMAND
  if (interaction.isButton() && interaction.customId === "ticket_transcript") {
    await interaction.deferReply();
    const attachment = await generateTranscript(interaction.channel);
    if (!attachment) {
      return interaction.editReply({ content: "❌ Could not generate transcript." });
    }
    return interaction.editReply({
      content: "📝 Here is the current transcript for this ticket:",
      files: [attachment],
    });
  }

  // 5. ADD MEMBER MODAL
  if (interaction.isButton() && interaction.customId === "ticket_add_member") {
    if (!isStaff(member)) {
      return interaction.reply({ content: "❌ Only staff can add members to a ticket.", ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId("modal_ticket_add_member")
      .setTitle("Add Member to Ticket");

    const input = new TextInputBuilder()
      .setCustomId("target_user_id")
      .setLabel("User ID or Mention")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("e.g. 123456789012345678")
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  // 6. REMOVE MEMBER MODAL
  if (interaction.isButton() && interaction.customId === "ticket_remove_member") {
    if (!isStaff(member)) {
      return interaction.reply({ content: "❌ Only staff can remove members from a ticket.", ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId("modal_ticket_remove_member")
      .setTitle("Remove Member from Ticket");

    const input = new TextInputBuilder()
      .setCustomId("target_user_id")
      .setLabel("User ID or Mention")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("e.g. 123456789012345678")
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  // 7. HANDLE MODAL SUBMISSION
  if (interaction.isModalSubmit()) {
    if (interaction.customId === "modal_ticket_add_member") {
      const raw = interaction.fields.getTextInputValue("target_user_id").replace(/[^0-9]/g, "");
      const targetUser = await client.users.fetch(raw).catch(() => null);

      if (!targetUser) {
        return interaction.reply({ content: "❌ Invalid User ID provided.", ephemeral: true });
      }

      await interaction.channel.permissionOverwrites.edit(targetUser.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

      return interaction.reply({
        content: `👥 Added <@${targetUser.id}> to this ticket channel.`,
      });
    }

    if (interaction.customId === "modal_ticket_remove_member") {
      const raw = interaction.fields.getTextInputValue("target_user_id").replace(/[^0-9]/g, "");
      const targetUser = await client.users.fetch(raw).catch(() => null);

      if (!targetUser) {
        return interaction.reply({ content: "❌ Invalid User ID provided.", ephemeral: true });
      }

      await interaction.channel.permissionOverwrites.delete(targetUser.id);

      return interaction.reply({
        content: `🚫 Removed <@${targetUser.id}> from this ticket channel.`,
      });
    }
  }
}

module.exports = { handleTicketInteraction };
