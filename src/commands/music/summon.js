const { SlashCommandBuilder } = require("discord.js");
const { StarryAudioEngine } = require("../../utils/nativeAudioEngine");

module.exports = {
  name: "summon",
  aliases: ["join", "connect"],
  category: "Music",
  description: "Summons the bot into your current voice channel.",
  usage: "summon",
  data: new SlashCommandBuilder().setName("summon").setDescription("Summon the bot to your voice channel."),

  async execute(context, args, client) {
    const member = context.member;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      return context.reply({
        content: "❌ You must be connected to a voice channel first!",
        ephemeral: true,
      });
    }

    try {
      const player = StarryAudioEngine.getOrCreatePlayer(client, context.guild.id, voiceChannel, context.channel);
      await player.connect();
      return context.reply({ content: `🎧 Joined voice channel: **${voiceChannel.name}**` });
    } catch (err) {
      return context.reply({ content: `❌ Could not join voice channel: ${err.message}`, ephemeral: true });
    }
  },
};
