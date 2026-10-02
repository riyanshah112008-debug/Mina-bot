const db = require("../utils/database");

module.exports = {
  name: "guildMemberAdd",
  async execute(member, client) {
    if (!member || member.user.bot) return;

    try {
      const verifConfig = db.getVerificationConfig(member.guild.id);
      if (verifConfig.unverifiedRoleId) {
        const unverifiedRole = member.guild.roles.cache.get(verifConfig.unverifiedRoleId);
        if (unverifiedRole) {
          await member.roles.add(unverifiedRole, "Auto-assigned unverified role on join");
        }
      }
    } catch (err) {
      console.error("[guildMemberAdd Error]:", err.message);
    }
  },
};
