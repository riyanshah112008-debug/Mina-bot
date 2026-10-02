const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  name: "loop",
  aliases: ["repeat"],
  category: "Music",
  description: "Set loop mode: off, track, or queue.",
  usage: "loop [off|track|queue]",
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Toggle or set loop mode.")
    .addStringOption((opt) =>
      opt
        .setName("mode")
        .setDescription("Loop mode")
        .setRequired(false)
        .addChoices(
          { name: "Off", value: "none" },
          { name: "Current Track", value: "track" },
          { name: "Entire Queue", value: "queue" }
        )
    ),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const player = client.manager?.getPlayer(context.guild.id);

    if (!player) {
      return context.reply({ content: "❌ Nothing is currently playing in this server.", ephemeral: true });
    }

    let mode;
    if (isSlash) {
      mode = context.options.getString("mode");
    } else {
      mode = args && args[0] ? args[0].toLowerCase() : null;
    }

    if (!mode) {
      // Toggle
      const current = player.loop || "none";
      if (current === "none") mode = "track";
      else if (current === "track") mode = "queue";
      else mode = "none";
    }

    if (!["none", "off", "track", "queue"].includes(mode)) {
      return context.reply({ content: "❌ Valid loop options are: `off`, `track`, or `queue`.", ephemeral: true });
    }

    const setMode = mode === "off" ? "none" : mode;
    player.setLoop(setMode);
    return context.reply({ content: `🔁 **Loop mode set to:** \`${setMode.toUpperCase()}\`` });
  },
};
