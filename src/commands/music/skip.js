const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  name: "skip",
  aliases: ["s", "next"],
  category: "Music",
  description: "Skip to the next song in the queue.",
  usage: "skip",
  data: new SlashCommandBuilder().setName("skip").setDescription("Skip the current song."),

  async execute(context, args, client) {
    const player = client.manager?.getPlayer(context.guild.id);
    if (!player || (!player.playing && !player.queue.current)) {
      return context.reply({ content: "❌ Nothing is currently playing.", ephemeral: true });
    }

    const currentTitle = player.queue.current?.title || "Track";
    player.skip();
    return context.reply({ content: `⏭️ **Skipped:** \`${currentTitle}\`` });
  },
};
