const db = require("../utils/database");
const { buildGoodbyeCard } = require("../commands/utility/goodbye");

module.exports = {
  name: "guildMemberRemove",
  async execute(member, client) {
    if (!member || !member.guild) return;

    const guildId = member.guild.id;

    // 1. CLEANUP AFK
    try {
      db.removeUserAfk(guildId, member.id);
    } catch (err) {
      console.warn("[guildMemberRemove AFK Cleanup Warning]:", err.message);
    }

    // 2. GOODBYE NOTIFICATION
    try {
      const goodbyeCfg = db.getGoodbyeConfig(guildId);
      if (goodbyeCfg.enabled && goodbyeCfg.channelId) {
        const channel = member.guild.channels.cache.get(goodbyeCfg.channelId);
        if (channel && channel.isTextBased()) {
          const card = buildGoodbyeCard(goodbyeCfg, member);
          await channel.send(card).catch(() => {});
        }
      }
    } catch (err) {
      console.warn("[Goodbye Warning]:", err.message);
    }
  },
};
