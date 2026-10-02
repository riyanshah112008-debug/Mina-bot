const { PermissionsBitField, EmbedBuilder } = require("discord.js");
const db = require("../../utils/database");
const { sendModLog } = require("../../utils/modLogger");
const config = require("../../config");

// Regex patterns
const INVITE_REGEX = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/i;
const LINK_REGEX = /https?:\/\/[^\s<]+[^<.,:;"')\]\s]/i;

/**
 * Executes automod inspections on a received message.
 * Returns true if the message was handled/deleted by automod.
 * @param {import('discord.js').Message} message
 * @param {import('discord.js').Client} client
 * @returns {Promise<boolean>}
 */
async function handleAutomod(message, client) {
  if (!message.guild || message.author.bot || !message.content) return false;

  const member = message.member;
  if (!member) return false;

  // Bypass for server owner and staff with ManageMessages
  if (
    member.id === message.guild.ownerId ||
    member.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
    member.permissions.has(PermissionsBitField.Flags.Administrator)
  ) {
    return false;
  }

  const settings = db.getGuildSettings(message.guild.id);
  const automod = settings.automod || {};
  if (automod.enabled === false) return false;

  const content = message.content;

  // 1. Anti-Invite
  if (automod.antiInvite && INVITE_REGEX.test(content)) {
    try {
      if (message.deletable) await message.delete();

      const warning = await message.channel.send({
        content: `⚠️ <@${message.author.id}>, Discord invite links are not permitted here!`,
      });
      setTimeout(() => warning.delete().catch(() => null), 4000);

      await sendModLog(message.guild, {
        action: "AUTOMOD_INVITE",
        target: message.author,
        moderator: client.user,
        reason: "Posted prohibited Discord invite link",
        fields: [
          { name: "Channel", value: `<#${message.channel.id}>`, inline: true },
          { name: "Filtered Content", value: `\`\`\`${content.slice(0, 100)}\`\`\``, inline: false },
        ],
      });
      return true;
    } catch (e) {
      console.error("[Automod] Invite delete error:", e.message);
    }
  }

  // 2. Anti-Link
  if (automod.antiLink && LINK_REGEX.test(content)) {
    try {
      if (message.deletable) await message.delete();

      const warning = await message.channel.send({
        content: `⚠️ <@${message.author.id}>, posting links is prohibited in this channel!`,
      });
      setTimeout(() => warning.delete().catch(() => null), 4000);

      await sendModLog(message.guild, {
        action: "AUTOMOD_LINK",
        target: message.author,
        moderator: client.user,
        reason: "Posted unauthorized link",
        fields: [
          { name: "Channel", value: `<#${message.channel.id}>`, inline: true },
          { name: "Filtered Content", value: `\`\`\`${content.slice(0, 100)}\`\`\``, inline: false },
        ],
      });
      return true;
    } catch (e) {
      console.error("[Automod] Link delete error:", e.message);
    }
  }

  // 3. Anti-Mass-Mention
  const mentionLimit = automod.mentionLimit || config.automod.maxMentions || 5;
  const totalMentions = (message.mentions.users.size || 0) + (message.mentions.roles.size || 0);

  if (automod.antiMassMention && totalMentions > mentionLimit) {
    try {
      if (message.deletable) await message.delete();

      // Timeout if significantly exceeded
      if (member.moderatable) {
        await member.timeout(10 * 60 * 1000, "Automod: Mass mention spam");
      }

      const warning = await message.channel.send({
        content: `🚨 <@${message.author.id}> has been timed out for 10 minutes for mass mention spam (${totalMentions} mentions).`,
      });
      setTimeout(() => warning.delete().catch(() => null), 6000);

      await sendModLog(message.guild, {
        action: "AUTOMOD_MASS_MENTION",
        target: message.author,
        moderator: client.user,
        reason: `Exceeded mention threshold (${totalMentions}/${mentionLimit})`,
        fields: [
          { name: "Channel", value: `<#${message.channel.id}>`, inline: true },
          { name: "Mentions Count", value: `${totalMentions}`, inline: true },
          { name: "Action", value: "Message deleted + 10m timeout", inline: true },
        ],
      });
      return true;
    } catch (e) {
      console.error("[Automod] Mass mention error:", e.message);
    }
  }

  // 4. Anti-Spam
  if (automod.antiSpam) {
    if (!client.spamTracker) client.spamTracker = new Map();
    const key = `${message.guild.id}_${message.author.id}`;
    const now = Date.now();
    const spamWindow = config.automod.spamWindowMs || 4000;
    const spamThreshold = config.automod.spamThreshold || 5;

    const userTimestamps = client.spamTracker.get(key) || [];
    const validTimestamps = userTimestamps.filter((ts) => now - ts < spamWindow);
    validTimestamps.push(now);
    client.spamTracker.set(key, validTimestamps);

    if (validTimestamps.length >= spamThreshold) {
      client.spamTracker.delete(key);
      try {
        if (message.deletable) await message.delete();

        if (member.moderatable) {
          await member.timeout(5 * 60 * 1000, "Automod: Rapid message spam");
        }

        const warning = await message.channel.send({
          content: `🛑 <@${message.author.id}> has been timed out for 5 minutes for spamming messages rapidly.`,
        });
        setTimeout(() => warning.delete().catch(() => null), 5000);

        await sendModLog(message.guild, {
          action: "AUTOMOD_SPAM",
          target: message.author,
          moderator: client.user,
          reason: `Sent ${validTimestamps.length} messages in ${Math.round(spamWindow / 1000)}s`,
          fields: [
            { name: "Channel", value: `<#${message.channel.id}>`, inline: true },
            { name: "Action", value: "Message deleted + 5m timeout", inline: true },
          ],
        });
        return true;
      } catch (e) {
        console.error("[Automod] Spam timeout error:", e.message);
      }
    }
  }

  return false;
}

module.exports = { handleAutomod };
