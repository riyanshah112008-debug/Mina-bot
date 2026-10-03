const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../../utils/database");
const config = require("../../config");

// In-memory set to prevent race conditions when multiple messages arrive quickly
const channelLocks = new Set();

/**
 * Handle incoming message to re-post sticky message at the bottom
 * @param {import("discord.js").Message} message
 * @param {import("discord.js").Client} client
 */
async function handleStickyMessage(message, client) {
  if (!message.guild || message.author.bot) return;

  const channelId = message.channel.id;
  const sticky = db.getStickyMessage(channelId);
  if (!sticky || !sticky.enabled || !sticky.content) return;

  // If a sticky re-post is already queued or processing for this channel, skip to avoid spam
  if (channelLocks.has(channelId)) return;
  channelLocks.add(channelId);

  try {
    // If the bot lacks permissions to Send Messages or Embed Links, abort
    const me = message.guild.members.me;
    if (me) {
      const perms = message.channel.permissionsFor(me);
      if (perms && (!perms.has(PermissionFlagsBits.SendMessages) || !perms.has(PermissionFlagsBits.EmbedLinks))) {
        channelLocks.delete(channelId);
        return;
      }
    }

    // Try deleting the previous sticky message
    if (sticky.lastMessageId) {
      try {
        const oldMsg = await message.channel.messages.fetch(sticky.lastMessageId).catch(() => null);
        if (oldMsg && oldMsg.deletable) {
          await oldMsg.delete().catch(() => null);
        }
      } catch (_) {}
    }

    const embed = new EmbedBuilder()
      .setColor(config.theme?.primary || 0x5865f2)
      .setTitle("📌 Sticky Notice")
      .setDescription(sticky.content)
      .setFooter({ text: "This message automatically sticks to the bottom of the channel." })
      .setTimestamp();

    const newMsg = await message.channel.send({ embeds: [embed] }).catch(() => null);
    if (newMsg) {
      db.setStickyMessage(channelId, {
        ...sticky,
        lastMessageId: newMsg.id,
      });
    }
  } catch (err) {
    console.error(`[StickyManager] Error re-posting sticky in #${message.channel.name}:`, err.message);
  } finally {
    // Keep debounce lock for 2 seconds to prevent rate limits
    setTimeout(() => {
      channelLocks.delete(channelId);
    }, 2000);
  }
}

module.exports = {
  handleStickyMessage,
};
