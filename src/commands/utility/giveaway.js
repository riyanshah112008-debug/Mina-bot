const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const db = require("../../utils/database");
const config = require("../../config");
const { parseDuration, formatDuration } = require("../../utils/timeParser");
const {
  scheduleEnd,
  buildGiveawayEmbed,
  buildGiveawayComponents,
  endGiveaway,
  rerollGiveaway,
} = require("../../modules/giveaways/giveawayManager");

module.exports = {
  name: "giveaway",
  aliases: ["gstart", "gend", "greroll", "giveaways"],
  category: "Utility",
  description: "Create and manage interactive server giveaways with button entries.",
  usage: "giveaway <start <time> <winners> <prize> | end <id> | reroll <id> | list>",
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Create and manage server giveaways.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("start")
        .setDescription("Start a new giveaway.")
        .addStringOption((opt) =>
          opt.setName("duration").setDescription("Duration (e.g. 10m, 1h, 1d)").setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName("winners").setDescription("Number of winners").setMinValue(1).setMaxValue(20).setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("prize").setDescription("The giveaway prize").setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel to host the giveaway in (default: current)")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("end")
        .setDescription("End an active giveaway early.")
        .addStringOption((opt) => opt.setName("message_id").setDescription("Message ID of the giveaway").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("reroll")
        .setDescription("Reroll winners for an ended giveaway.")
        .addStringOption((opt) => opt.setName("message_id").setDescription("Message ID of the giveaway").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("List active giveaways in this server.")
    ),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const author = isSlash ? context.user : context.author;
    const member = context.member;

    if (!member || !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const reply = { content: "❌ You need the **Manage Server** permission to manage giveaways.", ephemeral: true };
      return isSlash ? context.reply(reply) : context.reply(reply);
    }

    let subcmd = "start";
    let targetChannel = context.channel;
    let durationStr = "";
    let winnerCount = 1;
    let prize = "";
    let messageId = "";

    // Determine command trigger from prefix alias or subcommand
    if (isSlash) {
      subcmd = context.options.getSubcommand();
      if (subcmd === "start") {
        durationStr = context.options.getString("duration");
        winnerCount = context.options.getInteger("winners") || 1;
        prize = context.options.getString("prize");
        targetChannel = context.options.getChannel("channel") || context.channel;
      } else if (subcmd === "end" || subcmd === "reroll") {
        messageId = context.options.getString("message_id");
      }
    } else {
      const invoker = context.content
        .slice((db.getGuildSettings(guild.id).prefix || config.prefix).length)
        .trim()
        .split(/\s+/)[0]
        ?.toLowerCase();

      if (invoker === "gstart") {
        subcmd = "start";
        durationStr = args[0];
        winnerCount = parseInt(args[1], 10);
        prize = args.slice(2).join(" ");
      } else if (invoker === "gend") {
        subcmd = "end";
        messageId = args[0];
      } else if (invoker === "greroll") {
        subcmd = "reroll";
        messageId = args[0];
      } else {
        const firstArg = args[0]?.toLowerCase();
        if (firstArg === "start") {
          subcmd = "start";
          durationStr = args[1];
          winnerCount = parseInt(args[2], 10);
          prize = args.slice(3).join(" ");
        } else if (firstArg === "end") {
          subcmd = "end";
          messageId = args[1];
        } else if (firstArg === "reroll") {
          subcmd = "reroll";
          messageId = args[1];
        } else if (firstArg === "list") {
          subcmd = "list";
        } else {
          subcmd = "help";
        }
      }
    }

    const prefix = db.getGuildSettings(guild.id).prefix || config.prefix;

    if (subcmd === "help") {
      return context.reply({
        content: `🎉 **Giveaway Commands:**\n• \`${prefix}gstart <time> <winners> <prize>\` — Start giveaway\n• \`${prefix}gend <messageId>\` — End giveaway\n• \`${prefix}greroll <messageId>\` — Pick new winners\n• \`${prefix}giveaway list\` — List active giveaways`,
      });
    }

    if (subcmd === "start") {
      if (!durationStr || isNaN(winnerCount) || !prize) {
        return context.reply({
          content: `❌ **Usage:** \`${prefix}gstart <time> <winners> <prize>\`\nExample: \`${prefix}gstart 1h 2 Discord Nitro Classic\``,
        });
      }

      const durationMs = parseDuration(durationStr);
      if (!durationMs || durationMs < 10000 || durationMs > 30 * 24 * 60 * 60 * 1000) {
        return context.reply({
          content: "❌ Invalid duration. Must be between `10s` and `30d` (e.g. `10m`, `2h`, `7d`).",
        });
      }

      if (winnerCount < 1 || winnerCount > 50) {
        return context.reply({ content: "❌ Winner count must be between `1` and `50`." });
      }

      const endTime = Date.now() + durationMs;
      const initialData = {
        guildId: guild.id,
        channelId: targetChannel.id,
        hostId: author.id,
        prize,
        winnerCount,
        endTime,
        status: "active",
        entries: [],
        winners: [],
        messageId: "pending",
      };

      const embed = buildGiveawayEmbed(initialData);
      const components = buildGiveawayComponents("pending", false, 0);

      const msg = await targetChannel.send({ embeds: [embed], components }).catch((err) => {
        console.error("[Giveaway] Failed to send message:", err.message);
        return null;
      });

      if (!msg) {
        return context.reply({ content: `❌ Failed to send giveaway in ${targetChannel}. Check my permissions!` });
      }

      // Update with actual message ID
      initialData.messageId = msg.id;
      db.setGiveaway(msg.id, initialData);

      // Re-render embed & components with true ID
      const finalEmbed = buildGiveawayEmbed(initialData);
      const finalComponents = buildGiveawayComponents(msg.id, false, 0);
      await msg.edit({ embeds: [finalEmbed], components: finalComponents }).catch(() => null);

      // Schedule automated conclusion
      scheduleEnd(msg.id, durationMs, client);

      const replyContent = `🎉 **Giveaway started in ${targetChannel}!** [Jump to Giveaway](${msg.url})`;
      if (isSlash) {
        return context.reply({ content: replyContent });
      } else {
        if (targetChannel.id !== context.channel.id) {
          return context.reply({ content: replyContent });
        }
      }
      return;
    }

    if (subcmd === "end") {
      if (!messageId) {
        return context.reply({ content: `❌ **Usage:** \`${prefix}gend <messageId>\`` });
      }

      const giveaway = db.getGiveaway(messageId);
      if (!giveaway || giveaway.guildId !== guild.id) {
        return context.reply({ content: `❌ Giveaway with ID \`${messageId}\` not found in this server.` });
      }

      if (giveaway.status === "ended") {
        return context.reply({ content: "ℹ️ That giveaway has already ended." });
      }

      await endGiveaway(messageId, client);
      return context.reply({ content: `✅ Giveaway \`${messageId}\` has been ended manually!` });
    }

    if (subcmd === "reroll") {
      if (!messageId) {
        return context.reply({ content: `❌ **Usage:** \`${prefix}greroll <messageId>\`` });
      }

      const giveaway = db.getGiveaway(messageId);
      if (!giveaway || giveaway.guildId !== guild.id) {
        return context.reply({ content: `❌ Giveaway with ID \`${messageId}\` not found in this server.` });
      }

      try {
        const newWinners = await rerollGiveaway(messageId, client);
        return context.reply({
          content: `🎉 **Rerolled!** New winner(s): ${newWinners.map((w) => `<@${w}>`).join(", ")}`,
        });
      } catch (err) {
        return context.reply({ content: `❌ Could not reroll giveaway: ${err.message}` });
      }
    }

    if (subcmd === "list") {
      const all = db.getAllGiveaways();
      const guildGiveaways = Object.values(all).filter((g) => g.guildId === guild.id && g.status === "active");

      if (guildGiveaways.length === 0) {
        return context.reply({ content: "ℹ️ There are no active giveaways running in this server." });
      }

      const embed = new EmbedBuilder()
        .setColor(config.theme?.primary || 0x5865f2)
        .setTitle(`🎉 Active Giveaways in ${guild.name}`)
        .setDescription(
          guildGiveaways
            .map(
              (g, idx) =>
                `**${idx + 1}. [${g.prize}](https://discord.com/channels/${guild.id}/${g.channelId}/${g.messageId})**\n• Ends: <t:${Math.floor(
                  g.endTime / 1000
                )}:R> | Winners: \`${g.winnerCount}\` | Entries: \`${g.entries?.length || 0}\`\n• Channel: <#${g.channelId}> | ID: \`${g.messageId}\``
            )
            .join("\n\n")
        );

      return context.reply({ embeds: [embed] });
    }
  },
};
