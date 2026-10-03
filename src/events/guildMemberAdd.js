const db = require("../utils/database");
const { buildWelcomeCard } = require("../commands/utility/welcome");

module.exports = {
  name: "guildMemberAdd",
  async execute(member, client) {
    if (!member || !member.guild) return;

    const guildId = member.guild.id;

    // 1. AUTOROLE ASSIGNMENT
    try {
      const autoroleCfg = db.getAutoroleConfig(guildId);
      if (autoroleCfg.enabled) {
        const rolesToAssign = member.user.bot ? autoroleCfg.botRoles : autoroleCfg.memberRoles;
        if (rolesToAssign && rolesToAssign.length > 0) {
          for (const roleId of rolesToAssign) {
            const role = member.guild.roles.cache.get(roleId);
            if (role) {
              await member.roles.add(role, "Mina Autorole System").catch(() => {});
            }
          }
        }
      }
    } catch (err) {
      console.warn("[Autorole Warning]:", err.message);
    }

    // 2. VERIFICATION UNVERIFIED ROLE
    try {
      if (!member.user.bot) {
        const verifConfig = db.getVerificationConfig(guildId);
        if (verifConfig.unverifiedRoleId) {
          const unverifiedRole = member.guild.roles.cache.get(verifConfig.unverifiedRoleId);
          if (unverifiedRole) {
            await member.roles.add(unverifiedRole, "Auto-assigned unverified role on join").catch(() => {});
          }
        }
      }
    } catch (err) {
      console.warn("[Verification Role Warning]:", err.message);
    }

    // 3. WELCOME NOTIFICATION
    try {
      const welcomeCfg = db.getWelcomeConfig(guildId);
      if (welcomeCfg.enabled && welcomeCfg.channelId) {
        const channel = member.guild.channels.cache.get(welcomeCfg.channelId);
        if (channel && channel.isTextBased()) {
          const card = buildWelcomeCard(welcomeCfg, member);
          await channel.send(card).catch(() => {});
        }
      }
    } catch (err) {
      console.warn("[Welcome Warning]:", err.message);
    }
  },
};
