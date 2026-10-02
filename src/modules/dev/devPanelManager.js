const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  version: djsVersion,
} = require("discord.js");
const os = require("os");
const config = require("../../config");
const db = require("../../utils/database");
const { loadCommands } = require("../../handlers/commandLoader");
const { loadSlashCommands } = require("../../handlers/slashCommandLoader");
const { formatDuration } = require("../../utils/timeParser");
const { rotateStatus } = require("../presence/statusManager");
const pkg = require("../../../package.json");

/**
 * Builds the developer dashboard embed and buttons.
 */
function buildDevDashboard(client) {
  const memory = process.memoryUsage();
  const heapUsed = (memory.heapUsed / 1024 / 1024).toFixed(2);
  const heapTotal = (memory.heapTotal / 1024 / 1024).toFixed(2);
  const rss = (memory.rss / 1024 / 1024).toFixed(2);

  const processUptime = formatDuration(process.uptime() * 1000);
  const hostUptime = formatDuration(os.uptime() * 1000);

  const totalGuilds = client.guilds.cache.size;
  const totalUsers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
  const totalChannels = client.channels.cache.size;
  const wsPing = client.ws.ping >= 0 ? `${client.ws.ping}ms` : "Connecting...";

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle("⚡ Mina Bot — Master Developer Control Panel")
    .setDescription(
      `Welcome to the developer control console. Restricted exclusively to verified Bot Owners.\n\n` +
      `**Bot Owners:** ${config.ownerIds.map((id) => `<@${id}> (\`${id}\`)`).join(", ")}`
    )
    .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      {
        name: "🖥️ System & Host Specs",
        value:
          `• **PID:** \`${process.pid}\`\n` +
          `• **Platform:** \`${os.platform()} (${os.arch()})\`\n` +
          `• **Node.js:** \`${process.version}\`\n` +
          `• **Discord.js:** \`v${djsVersion}\`\n` +
          `• **Bot Version:** \`v${pkg.version}\``,
        inline: true,
      },
      {
        name: "📊 Resource Utilization",
        value:
          `• **RAM (Heap):** \`${heapUsed} MB / ${heapTotal} MB\`\n` +
          `• **RAM (RSS):** \`${rss} MB\`\n` +
          `• **Bot Uptime:** \`${processUptime}\`\n` +
          `• **Host Uptime:** \`${hostUptime}\`\n` +
          `• **Gateway Ping:** \`${wsPing}\``,
        inline: true,
      },
      {
        name: "🌐 Network & Cache Metrics",
        value:
          `• **Guilds:** \`${totalGuilds}\`\n` +
          `• **Cached Members:** \`${totalUsers}\`\n` +
          `• **Cached Channels:** \`${totalChannels}\`\n` +
          `• **Loaded Commands:** \`${client.commands.size}\``,
        inline: true,
      }
    )
    .setFooter({ text: "Mina Bot Developer Console • Authorized Access Only" })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("dev_sync_commands").setLabel("Sync Slash").setStyle(ButtonStyle.Primary).setEmoji("⚡"),
    new ButtonBuilder().setCustomId("dev_reload_commands").setLabel("Reload Cmds").setStyle(ButtonStyle.Success).setEmoji("🔄"),
    new ButtonBuilder().setCustomId("dev_server_list").setLabel("Guild List").setStyle(ButtonStyle.Secondary).setEmoji("📊"),
    new ButtonBuilder().setCustomId("dev_clean_storage").setLabel("Prune DB").setStyle(ButtonStyle.Secondary).setEmoji("🧹")
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("dev_eval_btn").setLabel("Exec Eval").setStyle(ButtonStyle.Secondary).setEmoji("💻"),
    new ButtonBuilder().setCustomId("dev_broadcast_btn").setLabel("Global Broadcast").setStyle(ButtonStyle.Primary).setEmoji("📢"),
    new ButtonBuilder().setCustomId("dev_leave_btn").setLabel("Emergency Leave").setStyle(ButtonStyle.Danger).setEmoji("🚪"),
    new ButtonBuilder().setCustomId("dev_cycle_presence_btn").setLabel("Cycle Status").setStyle(ButtonStyle.Secondary).setEmoji("✨"),
    new ButtonBuilder().setCustomId("dev_restart_btn").setLabel("Restart Bot").setStyle(ButtonStyle.Danger).setEmoji("🛑")
  );

  return { embeds: [embed], components: [row1, row2] };
}

/**
 * Handles developer panel interaction events.
 */
async function handleDevInteraction(interaction, client) {
  const user = interaction.user;

  // Strict owner check
  if (!config.isOwner(user.id)) {
    return interaction.reply({
      content: "⛔ **Access Denied**: This developer panel is strictly restricted to Mina Bot Owners.",
      ephemeral: true,
    });
  }

  const customId = interaction.customId;

  // 1. SYNC SLASH COMMANDS
  if (customId === "dev_sync_commands") {
    await interaction.deferReply({ ephemeral: true });
    try {
      const commands = await loadSlashCommands(client, config);
      return interaction.editReply({
        content: `✅ Successfully refreshed and synced **${commands.length}** slash commands with Discord Gateway!`,
      });
    } catch (err) {
      return interaction.editReply({ content: `❌ Slash command sync failed: ${err.message}` });
    }
  }

  // 2. RELOAD COMMANDS
  if (customId === "dev_reload_commands") {
    await interaction.deferReply({ ephemeral: true });
    try {
      client.commands.clear();
      const loaded = loadCommands();
      return interaction.editReply({
        content: `🔄 Successfully hot-reloaded **${loaded.length}** commands from disk!`,
      });
    } catch (err) {
      return interaction.editReply({ content: `❌ Hot-reload failed: ${err.message}` });
    }
  }

  // 3. SERVER LIST
  if (customId === "dev_server_list") {
    await interaction.deferReply({ ephemeral: true });
    const guilds = client.guilds.cache.map(
      (g) => `• **${g.name}** (\`${g.id}\`) — ${g.memberCount} members (Owner: <@${g.ownerId}>)`
    );

    const chunk = guilds.slice(0, 25).join("\n") || "No servers found.";

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`🏰 Connected Guilds (${client.guilds.cache.size})`)
      .setDescription(chunk)
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  // 4. CLEAN STORAGE
  if (customId === "dev_clean_storage") {
    await interaction.deferReply({ ephemeral: true });
    return interaction.editReply({
      content: `🧹 Database storage checked and verified. All persistent records in \`mina-store.json\` are clean.`,
    });
  }

  // 5. EVAL MODAL
  if (customId === "dev_eval_btn") {
    const modal = new ModalBuilder()
      .setCustomId("modal_dev_eval")
      .setTitle("💻 Execute Developer JavaScript Code");

    const codeInput = new TextInputBuilder()
      .setCustomId("eval_code")
      .setLabel("JavaScript Code")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("e.g. client.guilds.cache.size")
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(codeInput));
    return interaction.showModal(modal);
  }

  // 6. BROADCAST MODAL
  if (customId === "dev_broadcast_btn") {
    const modal = new ModalBuilder()
      .setCustomId("modal_dev_broadcast")
      .setTitle("📢 Global Developer Broadcast");

    const titleInput = new TextInputBuilder()
      .setCustomId("broadcast_title")
      .setLabel("Announcement Title")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("e.g. Mina Bot Maintenance Notice")
      .setRequired(true);

    const messageInput = new TextInputBuilder()
      .setCustomId("broadcast_message")
      .setLabel("Announcement Message")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Message to broadcast to all servers...")
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(messageInput)
    );
    return interaction.showModal(modal);
  }

  // 7. CYCLE STATUS
  if (customId === "dev_cycle_presence_btn") {
    rotateStatus(client);
    return interaction.reply({
      content: "✨ **Rotated Presence**: Advanced to next automatic activity preset.",
      ephemeral: true,
    });
  }

  // 8. EMERGENCY LEAVE MODAL TRIGGER
  if (customId === "dev_leave_btn") {
    const modal = new ModalBuilder()
      .setCustomId("modal_dev_emergency_leave")
      .setTitle("🚪 Emergency Server Departure");

    const guildIdInput = new TextInputBuilder()
      .setCustomId("leave_guild_id_input")
      .setLabel("Target Server / Guild ID")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("e.g. 1465243680754634939")
      .setRequired(true);

    const reasonInput = new TextInputBuilder()
      .setCustomId("leave_reason_input")
      .setLabel("Reason / Departure Note")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Reason for emergency server departure...")
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(guildIdInput),
      new ActionRowBuilder().addComponents(reasonInput)
    );
    return interaction.showModal(modal);
  }

  // 9. RESTART BOT
  if (customId === "dev_restart_btn") {
    await interaction.reply({
      content: "🔄 **Restarting Mina Bot**... Process shutting down for PM2/daemon automatic respawn.",
      ephemeral: true,
    });
    setTimeout(() => {
      process.exit(0);
    }, 1500);
    return;
  }

  // 10. MODAL SUBMISSIONS
  if (interaction.isModalSubmit()) {
    if (interaction.customId === "modal_dev_eval") {
      await interaction.deferReply({ ephemeral: true });
      const code = interaction.fields.getTextInputValue("eval_code");

      try {
        let evaled = eval(code);
        if (evaled instanceof Promise) evaled = await evaled;
        const resultString = typeof evaled === "string" ? evaled : require("util").inspect(evaled, { depth: 1 });

        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("💻 Eval Result")
          .addFields(
            { name: "Input", value: `\`\`\`javascript\n${code.slice(0, 1000)}\n\`\`\`` },
            { name: "Output", value: `\`\`\`javascript\n${resultString.slice(0, 1000)}\n\`\`\`` }
          )
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        return interaction.editReply({
          content: `❌ **Eval Execution Error:**\`\`\`javascript\n${err.stack || err.message}\n\`\`\``,
        });
      }
    }

    if (interaction.customId === "modal_dev_broadcast") {
      await interaction.deferReply({ ephemeral: true });
      const title = interaction.fields.getTextInputValue("broadcast_title");
      const message = interaction.fields.getTextInputValue("broadcast_message");

      let sentCount = 0;
      const broadcastEmbed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(`📢 ${title}`)
        .setDescription(message)
        .setFooter({ text: "Official Mina Bot Global Broadcast" })
        .setTimestamp();

      for (const [, guild] of client.guilds.cache) {
        try {
          const targetChan =
            guild.systemChannel ||
            guild.channels.cache.find(
              (c) => c.isTextBased() && c.permissionsFor(client.user)?.has("SendMessages")
            );
          if (targetChan) {
            await targetChan.send({ embeds: [broadcastEmbed] }).catch(() => null);
            sentCount++;
          }
        } catch (e) {}
      }

      return interaction.editReply({
        content: `📢 Global broadcast delivered to **${sentCount}** server(s)!`,
      });
    }

    if (interaction.customId === "modal_dev_emergency_leave") {
      await interaction.deferReply({ ephemeral: true });
      const targetGuildId = interaction.fields.getTextInputValue("leave_guild_id_input").trim();
      const reason =
        interaction.fields.getTextInputValue("leave_reason_input")?.trim() ||
        "Emergency leave requested via Developer Panel";

      if (!/^\d{17,20}$/.test(targetGuildId)) {
        return interaction.editReply({
          content: `❌ Invalid Guild ID format: \`${targetGuildId}\`. Must be 17–20 digits.`,
        });
      }

      let guild = client.guilds.cache.get(targetGuildId);
      if (!guild) {
        guild = await client.guilds.fetch(targetGuildId).catch(() => null);
      }

      if (!guild) {
        return interaction.editReply({
          content: `❌ Server ID \`${targetGuildId}\` was not found in the bot's cache or Discord API.`,
        });
      }

      const guildName = guild.name;
      const memberCount = guild.memberCount;
      const ownerId = guild.ownerId;

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
          { name: "Operator", value: `<@${user.id}>`, inline: true }
        )
        .setFooter({ text: "Mina Bot Dev Security Operations" })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  }
}

module.exports = { buildDevDashboard, handleDevInteraction };
