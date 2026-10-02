const { SlashCommandBuilder } = require("discord.js");
const { triggerAutoplayBuffer } = require("../../utils/musicManager");

module.exports = {
  name: "autoplay",
  aliases: ["auto"],
  category: "Music",
  description: "Toggle smart autoplay recommendation when queue ends.",
  usage: "autoplay",
  data: new SlashCommandBuilder().setName("autoplay").setDescription("Toggle smart song recommendations."),

  async execute(context, args, client) {
    const player = client.manager?.getPlayer(context.guild.id);
    if (!player) {
      return context.reply({ content: "❌ Nothing is currently playing in this server.", ephemeral: true });
    }

    const current = Boolean(player.data?.get("autoplay") || player.autoplay);
    const newState = !current;

    player.data.set("autoplay", newState);
    player.autoplay = newState;

    if (newState && player.queue.length === 0 && !player.playing) {
      await triggerAutoplayBuffer(player, true).catch(() => {});
    }

    return context.reply({
      content: `📻 **Smart Autoplay is now: \`${newState ? "ENABLED" : "DISABLED"}\`**\nWhen the queue ends, Mina will automatically pick similar tracks!`,
    });
  },
};
