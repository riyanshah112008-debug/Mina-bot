/**
 * In-memory Snipe & EditSnipe Manager
 * Stores deleted and edited messages per channel
 */
const snipes = new Map();
const editSnipes = new Map();

/**
 * Record a deleted message for snipe
 * @param {import("discord.js").Message} message
 */
function setSnipe(message) {
  if (!message) return;
  const channelId = message.channelId || message.channel?.id;
  if (!channelId) return;

  snipes.set(channelId, {
    content: message.content || null,
    author: message.author,
    channelId,
    timestamp: Date.now(),
    attachments: message.attachments ? Array.from(message.attachments.values()).map((a) => (typeof a === "string" ? a : a.url)) : [],
    embeds: message.embeds || [],
  });
}

/**
 * Retrieve the last deleted message for a channel
 * @param {string} channelId
 */
function getSnipe(channelId) {
  return snipes.get(channelId) || null;
}

/**
 * Record an edited message for editsnipe
 * @param {import("discord.js").Message} oldMessage
 * @param {import("discord.js").Message} newMessage
 */
function setEditSnipe(oldMessage, newMessage) {
  if (!newMessage) return;
  const channelId = newMessage.channelId || newMessage.channel?.id;
  if (!channelId) return;

  editSnipes.set(channelId, {
    oldContent: oldMessage?.content || "*Empty message*",
    newContent: newMessage?.content || "*Empty message*",
    author: newMessage.author || oldMessage?.author,
    channelId,
    timestamp: Date.now(),
  });
}

/**
 * Retrieve the last edited message for a channel
 * @param {string} channelId
 */
function getEditSnipe(channelId) {
  return editSnipes.get(channelId) || null;
}

module.exports = {
  setSnipe,
  getSnipe,
  setEditSnipe,
  getEditSnipe,
  recordDelete: setSnipe,
  getDelete: getSnipe,
  recordEdit: setEditSnipe,
  getEdit: getEditSnipe,
};
