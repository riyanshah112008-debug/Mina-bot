const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { buildDevDashboard } = require("../../modules/dev/devPanelManager");

module.exports = {
  name: "devpanel",
  aliases: ["dev", "ownerpanel", "adminpanel"],
  category: "Utility",
  description: "Open the master developer dashboard (Bot Owners only).",
  usage: "devpanel",
  data: new SlashCommandBuilder()
    .setName("devpanel")
    .setDescription("Open the master developer control panel (Bot Owners only)."),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const author = isSlash ? context.user : context.author;

    // Strict owner verification
    if (!config.isOwner(author.id)) {
      return context.reply({
        content: "⛔ **Access Denied**: This developer panel is strictly restricted to Mina Bot Owners.",
        ephemeral: true,
      });
    }

    const payload = buildDevDashboard(client);

    if (isSlash) {
      return context.reply({ ...payload, ephemeral: true });
    } else {
      return context.reply(payload);
    }
  },
};
