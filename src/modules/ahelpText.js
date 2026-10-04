// ==========================================
// 🛡️ ADMIN HELP TEXT MODULE
// Unified through CommandRegistry in commandHandler.js
// ==========================================
const { buildAdminHelpEmbed } = require('../commands/moderation/help-admin');

module.exports = (client) => {
    // ahelp is routed through CommandRegistry / utilityCommands
};
module.exports.buildAdminHelpEmbed = buildAdminHelpEmbed;
