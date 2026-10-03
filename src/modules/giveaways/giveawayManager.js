const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const db = require("../../utils/database");
const config = require("../../config");

const EPHEMERAL_FLAG = MessageFlags && MessageFlags.Ephemeral ? MessageFlags.Ephemeral : 64;

// Store active timers to prevent duplicates
const activeTimers = new Map();

/**
 * Initialize giveaways on client startup
 * @param {import("discord.js").Client} client
 */
function initGiveaways(client) {
  try {
    const all = db.getAllGiveaways();
    if (!all) return;

    for (const [messageId, g] of Object.entries(all)) {
      if (g.status === "active") {
        const remaining = g.endTime - Date.now();
        if (remaining <= 0) {
          endGiveaway(messageId, client);
        } else {
          scheduleEnd(messageId, remaining, client);
        }
      }
    }
  } catch (err) {
    console.error("[GiveawayManager] Error initializing giveaways:", err.message);
  }
}

/**
 * Schedule timeout for giveaway conclusion
 */
function scheduleEnd(messageId, delayMs, client) {
  if (activeTimers.has(messageId)) {
    clearTimeout(activeTimers.get(messageId));
  }

  const timer = setTimeout(() => {
    activeTimers.delete(messageId);
    endGiveaway(messageId, client);
  }, delayMs);

  activeTimers.set(messageId, timer);
}

/**
 * Build Discord Embed for a Giveaway
 */
function buildGiveawayEmbed(data) {
  const isEnded = data.status === "ended";
  const embed = new EmbedBuilder()
    .setColor(isEnded ? 0x2b2d31 : config.theme?.primary || 0x5865f2)
    .setTitle(`🎉 GIVEAWAY: ${data.prize}`)
    .setDescription(
      isEnded
        ? `This giveaway has ended!\n\n👑 **Winner(s):** ${
            data.winners && data.winners.length > 0
              ? data.winners.map((id) => `<@${id}>`).join(", ")
              : "*No valid entries*"
          }\nHosted by: <@${data.hostId}>`
        : `Click the **Enter** button below to participate!\n\n👑 **Winners:** \`${data.winnerCount}\`\n👤 **Hosted by:** <@${
            data.hostId
          }>\n⏳ **Ends:** <t:${Math.floor(data.endTime / 1000)}:R> (<t:${Math.floor(
            data.endTime / 1000
          )}:f>)\n🎟️ **Entries:** \`${data.entries?.length || 0}\``
    )
    .setFooter({ text: `Giveaway ID: ${data.messageId} • Mina Giveaways` })
    .setTimestamp(new Date(data.endTime));

  return embed;
}

/**
 * Build ActionRow button for giveaway
 */
function buildGiveawayComponents(messageId, isEnded = false, entryCount = 0) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway_enter_${messageId}`)
      .setLabel(`Enter (${entryCount})`)
      .setEmoji("🎉")
      .setStyle(isEnded ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(isEnded)
  );
  return [row];
}

/**
 * Handle button interaction for giveaway entry
 * @param {import("discord.js").ButtonInteraction} interaction
 * @param {import("discord.js").Client} client
 */
async function handleGiveawayInteraction(interaction, client) {
  const customId = interaction.customId;
  if (!customId.startsWith("giveaway_enter_")) return;

  const messageId = customId.replace("giveaway_enter_", "");
  const giveaway = db.getGiveaway(messageId);

  if (!giveaway || giveaway.status !== "active") {
    return interaction.reply({
      content: "❌ This giveaway has already ended!",
      flags: [EPHEMERAL_FLAG],
    });
  }

  const userId = interaction.user.id;
  if (!Array.isArray(giveaway.entries)) giveaway.entries = [];

  const existingIndex = giveaway.entries.indexOf(userId);
  let entered = false;

  if (existingIndex > -1) {
    // Leave giveaway
    giveaway.entries.splice(existingIndex, 1);
    entered = false;
  } else {
    // Enter giveaway
    giveaway.entries.push(userId);
    entered = true;
  }

  db.setGiveaway(messageId, giveaway);

  // Update original message button label and embed entry count
  try {
    const embed = buildGiveawayEmbed(giveaway);
    const components = buildGiveawayComponents(messageId, false, giveaway.entries.length);
    await interaction.message.edit({ embeds: [embed], components }).catch(() => null);
  } catch (_) {}

  return interaction.reply({
    content: entered
      ? `🎉 **You entered the giveaway for ${giveaway.prize}!** Good luck!`
      : `👋 **You left the giveaway for ${giveaway.prize}.**`,
    flags: [EPHEMERAL_FLAG],
  });
}

/**
 * Conclude a giveaway
 * @param {string} messageId
 * @param {import("discord.js").Client} client
 */
async function endGiveaway(messageId, client) {
  const giveaway = db.getGiveaway(messageId);
  if (!giveaway || giveaway.status === "ended") return null;

  if (activeTimers.has(messageId)) {
    clearTimeout(activeTimers.get(messageId));
    activeTimers.delete(messageId);
  }

  giveaway.status = "ended";
  giveaway.endedAt = Date.now();

  const entries = Array.isArray(giveaway.entries) ? [...giveaway.entries] : [];
  const winnersCount = Math.min(giveaway.winnerCount || 1, entries.length);
  const winners = [];

  // Pick unique winners
  for (let i = 0; i < winnersCount; i++) {
    const randIndex = Math.floor(Math.random() * entries.length);
    winners.push(entries[randIndex]);
    entries.splice(randIndex, 1);
  }

  giveaway.winners = winners;
  db.setGiveaway(messageId, giveaway);

  try {
    const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
    if (channel) {
      const msg = await channel.messages.fetch(messageId).catch(() => null);
      if (msg) {
        const embed = buildGiveawayEmbed(giveaway);
        const components = buildGiveawayComponents(messageId, true, giveaway.entries.length);
        await msg.edit({ embeds: [embed], components }).catch(() => null);
      }

      if (winners.length > 0) {
        const winnerMentions = winners.map((id) => `<@${id}>`).join(", ");
        await channel.send({
          content: `🎉 Congratulations ${winnerMentions}! You won the giveaway for **${giveaway.prize}**!\n🔗 [Jump to Giveaway](https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${messageId})`,
        });
      } else {
        await channel.send({
          content: `😢 The giveaway for **${giveaway.prize}** has ended, but there were no valid entries!`,
        });
      }
    }
  } catch (err) {
    console.error(`[GiveawayManager] Error ending giveaway ${messageId}:`, err.message);
  }

  return giveaway;
}

/**
 * Reroll winners for an ended giveaway
 * @param {string} messageId
 * @param {import("discord.js").Client} client
 */
async function rerollGiveaway(messageId, client) {
  const giveaway = db.getGiveaway(messageId);
  if (!giveaway) throw new Error("Giveaway not found.");
  if (giveaway.status !== "ended") throw new Error("Cannot reroll a giveaway that hasn't ended yet!");

  const entries = Array.isArray(giveaway.entries) ? [...giveaway.entries] : [];
  if (entries.length === 0) throw new Error("There are no entries in this giveaway to reroll!");

  const winnersCount = Math.min(giveaway.winnerCount || 1, entries.length);
  const winners = [];

  for (let i = 0; i < winnersCount; i++) {
    const randIndex = Math.floor(Math.random() * entries.length);
    winners.push(entries[randIndex]);
    entries.splice(randIndex, 1);
  }

  giveaway.winners = winners;
  db.setGiveaway(messageId, giveaway);

  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (channel) {
    const msg = await channel.messages.fetch(messageId).catch(() => null);
    if (msg) {
      const embed = buildGiveawayEmbed(giveaway);
      const components = buildGiveawayComponents(messageId, true, giveaway.entries.length);
      await msg.edit({ embeds: [embed], components }).catch(() => null);
    }

    const winnerMentions = winners.map((id) => `<@${id}>`).join(", ");
    await channel.send({
      content: `🎉 **Rerolled!** New winner(s) for **${giveaway.prize}**: ${winnerMentions}!\n🔗 [Jump to Giveaway](https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${messageId})`,
    });
  }

  return winners;
}

module.exports = {
  initGiveaways,
  scheduleEnd,
  buildGiveawayEmbed,
  buildGiveawayComponents,
  handleGiveawayInteraction,
  endGiveaway,
  rerollGiveaway,
};
