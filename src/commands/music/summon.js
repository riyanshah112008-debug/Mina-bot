const { SlashCommandBuilder } = require("discord.js");

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

    if (!client.manager) {
      return context.reply({
        content: "⚠️ Music Manager is currently initializing. Please try again shortly.",
        ephemeral: true,
      });
    }

    try {
      let player = client.manager.getPlayer(context.guild.id);
      if (!player) {
        player = await client.manager.createPlayer({
          guildId: context.guild.id,
          voiceId: voiceChannel.id,
          textId: context.channel.id,
          deaf: true,
        });
      } else {
        player.setVoiceChannel(voiceChannel.id);
      }

      return context.reply({ content: `🎧 Joined voice channel: **${voiceChannel.name}**` });
    } catch (err) {
      return context.reply({ content: `❌ Could not join voice channel: ${err.message}`, ephemeral: true });
    }
  },
};
