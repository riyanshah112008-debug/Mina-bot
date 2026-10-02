const { EmbedBuilder } = require("discord.js");
const db = require("./database");
const config = require("../config");

/**
 * Dispatches a formatted moderation log embed to the guild's designated mod log channel.
 * @param {import('discord.js').Guild} guild
 * @param {object} logData
 * @param {string} logData.action Action name (e.g. 'BAN', 'KICK', 'TIMEOUT', 'WARN')
 * @param {import('discord.js').User|import('discord.js').GuildMember|string} logData.target
 * @param {import('discord.js').User|import('discord.js').GuildMember} logData.moderator
 * @param {string} [logData.reason]
 * @param {object} [logData.fields] Extra embed fields
 * @param {string} [logData.color] Custom hex color
 */
async function sendModLog(guild, logData) {
  if (!guild) return null;

  try {
    const settings = db.getGuildSettings(guild.id);
    const targetUser = logData.target?.user || logData.target;
    const targetTag = targetUser?.tag || targetUser?.username || logData.target?.id || logData.target;
    const targetId = targetUser?.id || logData.target?.id || logData.target;
    const modUser = logData.moderator?.user || logData.moderator;

    // Record in DB
    db.addModLog(
      guild.id,
      logData.action,
      targetId,
      modUser?.id || "SYSTEM",
      logData.reason || "No reason specified",
      logData.fields || {}
    );

    // If channel configured, post embed
    if (!settings.modLogChannel) return null;
    const logChannel =
      guild.channels.cache.get(settings.modLogChannel) ||
      (await guild.channels.fetch(settings.modLogChannel).catch(() => null));
    if (!logChannel || !logChannel.isTextBased()) return null;

    let embedColor = config.theme.primary;
    if (logData.action.includes("BAN") || logData.action.includes("KICK") || logData.action.includes("NUKE")) {
      embedColor = config.theme.danger;
    } else if (logData.action.includes("WARN") || logData.action.includes("TIMEOUT") || logData.action.includes("LOCK")) {
      embedColor = config.theme.warning;
    } else if (logData.action.includes("UNBAN") || logData.action.includes("UNLOCK") || logData.action.includes("VERIFY")) {
      embedColor = config.theme.success;
    }

    const embed = new EmbedBuilder()
      .setColor(logData.color || embedColor)
      .setTitle(`🛡️ Mina Moderation | ${logData.action}`)
      .setThumbnail(targetUser?.displayAvatarURL ? targetUser.displayAvatarURL({ dynamic: true }) : null)
      .addFields(
        { name: "Target", value: `<@${targetId}> (\`${targetTag}\` / \`${targetId}\`)`, inline: true },
        { name: "Moderator", value: modUser ? `<@${modUser.id}> (\`${modUser.tag || modUser.username}\`)` : "`SYSTEM`", inline: true },
        { name: "Reason", value: `\`\`\`${logData.reason || "No reason provided."}\`\`\``, inline: false }
      )
      .setTimestamp()
      .setFooter({ text: `Mina Bot Moderation • Case ID: ${Date.now().toString().slice(-6)}` });

    if (logData.fields && Array.isArray(logData.fields)) {
      embed.addFields(logData.fields);
    }

    return await logChannel.send({ embeds: [embed] }).catch(() => null);
  } catch (err) {
    console.error("[ModLogger] Error sending mod log:", err.message);
    return null;
  }
}

module.exports = { sendModLog };
