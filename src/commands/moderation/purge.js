const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { sendModLog } = require("../../utils/modLogger");
const config = require("../../config");

module.exports = {
  name: "purge",
  aliases: ["clear", "clean"],
  category: "Moderation",
  description: "Bulk delete up to 100 messages in a channel, with optional user filter.",
  usage: "purge <amount: 1-100> [@user]",
  permissions: ["ManageMessages"],
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Bulk delete messages.")
    .addIntegerOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Number of messages to delete (1-100)")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Filter by specific user").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const channel = context.channel;
    const guild = context.guild;
    const author = isSlash ? context.user : context.author;

    let amount, targetUser;

    if (isSlash) {
      amount = context.options.getInteger("amount");
      targetUser = context.options.getUser("user");
    } else {
      if (!args || !args[0]) {
        return context.reply({ content: "❌ **Usage:** `,purge <amount: 1-100> [@user]`" });
      }
      amount = parseInt(args[0], 10);
      if (isNaN(amount) || amount < 1 || amount > 100) {
        return context.reply({ content: "❌ Please provide a valid amount between 1 and 100." });
      }
      if (args[1]) {
        const rawTarget = args[1].replace(/[^0-9]/g, "");
        targetUser = await client.users.fetch(rawTarget).catch(() => null);
      }
    }

    if (!channel.isTextBased()) {
      return context.reply({ content: "❌ Cannot purge non-text channels.", ephemeral: true });
    }

    try {
      // In prefix command, delete command message itself if possible
      if (!isSlash && context.deletable) {
        await context.delete().catch(() => null);
      }

      const fetched = await channel.messages.fetch({ limit: targetUser ? 100 : amount });
      let toDelete = fetched.filter((m) => !m.pinned);

      if (targetUser) {
        toDelete = toDelete.filter((m) => m.author.id === targetUser.id);
        const limited = Array.from(toDelete.values()).slice(0, amount);
        toDelete = new Map(limited.map((m) => [m.id, m]));
      }

      if (toDelete.size === 0) {
        const emptyMsg = await channel.send({ content: "ℹ️ No matching messages found to delete (messages older than 14 days cannot be bulk deleted)." });
        setTimeout(() => emptyMsg.delete().catch(() => null), 4000);
        return;
      }

      const deleted = await channel.bulkDelete(toDelete, true);

      await sendModLog(guild, {
        action: "PURGE",
        target: channel.id,
        moderator: author,
        reason: `Bulk deleted ${deleted.size} messages`,
        fields: [
          { name: "Channel", value: `<#${channel.id}>`, inline: true },
          { name: "Count", value: `${deleted.size} messages`, inline: true },
          ...(targetUser ? [{ name: "User Filter", value: `<@${targetUser.id}>`, inline: true }] : []),
        ],
      });

      const confirmEmbed = new EmbedBuilder()
        .setColor(config.theme.success)
        .setDescription(`🧹 Successfully deleted **${deleted.size}** message(s)${targetUser ? ` from <@${targetUser.id}>` : ""}.`);

      if (isSlash) {
        return context.reply({ embeds: [confirmEmbed], ephemeral: true });
      } else {
        const reply = await channel.send({ embeds: [confirmEmbed] });
        setTimeout(() => reply.delete().catch(() => null), 4000);
      }
    } catch (err) {
      console.error("[Purge Error]:", err);
      return context.reply({ content: `❌ Failed to delete messages: ${err.message}`, ephemeral: true });
    }
  },
};
