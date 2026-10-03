const { setSnipe } = require("../utils/snipeManager");

module.exports = {
  name: "messageDelete",
  execute(message) {
    if (!message || !message.guild || message.author?.bot) return;
    setSnipe(message);
  },
};
