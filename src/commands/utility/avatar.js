const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");

module.exports = {
  name: "avatar",
  aliases: ["av", "pfp"],
  category: "Utility",
  description: "Display a user's avatar with direct download links.",
  usage: "avatar [@user|id]",
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("View user avatar.")
    .addUserOption((opt) => opt.setName("user").setDescription("User to get avatar for").setRequired(false)),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const author = isSlash ? context.user : context.author;

    let targetUser;

    if (isSlash) {
      targetUser = context.options.getUser("user") || author;
    } else {
      if (args && args[0]) {
        const rawTarget = args[0].replace(/[^0-9]/g, "");
        targetUser = await client.users.fetch(rawTarget).catch(() => null);
      } else {
        targetUser = author;
      }
    }

    if (!targetUser) {
      return context.reply({ content: "❌ Could not find that user.", ephemeral: true });
    }

    const png = targetUser.displayAvatarURL({ extension: "png", size: 1024 });
    const jpg = targetUser.displayAvatarURL({ extension: "jpg", size: 1024 });
    const webp = targetUser.displayAvatarURL({ extension: "webp", size: 1024 });
    const dynamicUrl = targetUser.displayAvatarURL({ dynamic: true, size: 1024 });
    const isAnimated = Boolean(targetUser.avatar && targetUser.avatar.startsWith("a_"));

    let desc = `[PNG](${png}) • [JPG](${jpg}) • [WEBP](${webp})`;
    if (isAnimated) {
      const gif = targetUser.displayAvatarURL({ extension: "gif", size: 1024 });
      desc += ` • [GIF](${gif})`;
    }

    const embed = new EmbedBuilder()
      .setColor(config.theme?.primary || config.EMBED_COLORS?.PRIMARY || "#5865F2")
      .setAuthor({
        name: `${targetUser.tag || targetUser.username} • Profile Visuals`,
        iconURL: dynamicUrl
      })
      .setTitle(`🖼️ Avatar for ${targetUser.tag || targetUser.username}`)
      .setDescription(desc)
      .setImage(dynamicUrl)
      .setFooter({ text: `${config.BOT_NAME || "Mina"} Utility • High-Resolution Render` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Open in Browser").setStyle(ButtonStyle.Link).setURL(dynamicUrl)
    );

    return context.reply({ embeds: [embed], components: [row] });
  },
};
