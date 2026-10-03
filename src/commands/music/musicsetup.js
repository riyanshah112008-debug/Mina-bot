const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { setupMusicRequestChannel } = require("../../modules/music/musicRequestManager");

module.exports = {
  name: "musicsetup",
  aliases: ["setup", "setmusic", "requestchannel"],
  category: "Music",
  description: "Create or reset a dedicated zero-prefix music request channel with live interactive controls.",
  usage: "musicsetup",
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName("musicsetup")
    .setDescription("Create or configure the zero-prefix music request channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const member = context.member;

    if (!member || !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const reply = { content: "❌ You need the **Manage Server** permission to set up the music channel.", ephemeral: true };
      return isSlash ? context.reply(reply) : context.reply(reply);
    }

    if (isSlash) {
      await context.deferReply({ ephemeral: true }).catch(() => {});
    }

    try {
      const { channel } = await setupMusicRequestChannel(guild, client);
      const content = `✅ **Music Request Channel successfully set up in ${channel}!**\nMembers can now simply send song names or links in that channel without any prefix to listen to music.`;

      if (isSlash) {
        return context.editReply({ content });
      } else {
        return context.reply({ content });
      }
    } catch (err) {
      const errMsg = `❌ Failed to setup music channel: ${err.message}`;
      if (isSlash) {
        return context.editReply({ content: errMsg });
      } else {
        return context.reply({ content: errMsg });
      }
    }
  },
};
