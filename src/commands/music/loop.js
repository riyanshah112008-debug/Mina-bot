const { SlashCommandBuilder } = require("discord.js");
const { StarryAudioEngine } = require("../../utils/nativeAudioEngine");

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
    const kPlayer = client.manager?.getPlayer(context.guild.id);
    const nPlayer = StarryAudioEngine.getPlayer(context.guild.id);

    if (!kPlayer && !nPlayer) {
      return context.reply({ content: "❌ Nothing is currently playing in this server.", ephemeral: true });
    }

    let mode;
    if (isSlash) {
      mode = context.options.getString("mode");
    } else {
      mode = args && args[0] ? args[0].toLowerCase() : null;
    }

    const currentMode = nPlayer ? (nPlayer.loop || "none") : (kPlayer.loop || "none");

    if (!mode) {
      if (currentMode === "none") mode = "track";
      else if (currentMode === "track") mode = "queue";
      else mode = "none";
    }

    if (!["none", "off", "track", "queue"].includes(mode)) {
      return context.reply({ content: "❌ Valid loop options are: `off`, `track`, or `queue`.", ephemeral: true });
    }

    const setMode = mode === "off" ? "none" : mode;
    if (kPlayer) kPlayer.setLoop(setMode);
    if (nPlayer) {
      nPlayer.loop = setMode;
      if (nPlayer.currentTrack) await nPlayer.sendNowPlayingPanel(nPlayer.currentTrack, true).catch(() => {});
    }

    return context.reply({ content: `🔁 **Loop mode set to:** \`${setMode.toUpperCase()}\`` });
  },
};
