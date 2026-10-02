const { handleAutomod } = require("../modules/automod/automodEngine");

module.exports = {
  name: "messageUpdate",
  async execute(oldMessage, newMessage, client) {
    if (!newMessage || !newMessage.guild || !newMessage.author || newMessage.author.bot) return;

    try {
      await handleAutomod(newMessage, client);
    } catch (err) {
      console.error("[messageUpdate Error]:", err.message);
    }
  },
};
