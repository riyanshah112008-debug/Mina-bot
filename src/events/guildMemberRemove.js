const db = require("../utils/database");

module.exports = {
  name: "guildMemberRemove",
  async execute(member, client) {
    if (!member || !member.guild) return;

    try {
      db.removeUserAfk(member.guild.id, member.id);
    } catch (err) {
      console.error("[guildMemberRemove Error]:", err.message);
    }
  },
};
