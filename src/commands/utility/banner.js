const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");

module.exports = {
  name: "banner",
  category: "Utility",
  description: "Display a user's banner if set.",
  usage: "banner [@user|id]",
  data: new SlashCommandBuilder()
    .setName("banner")
    .setDescription("View user banner.")
    .addUserOption((opt) => opt.setName("user").setDescription("User to get banner for").setRequired(false)),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const author = isSlash ? context.user : context.author;

    let targetUser;

    if (isSlash) {
      targetUser = context.options.getUser("user") || author;
    } else {
      if (args && args[0]) {
        const rawTarget = args[0].replace(/[^0-9]/g, "");
        targetUser = await client.users.fetch(rawTarget, { force: true }).catch(() => null);
      } else {
        targetUser = await client.users.fetch(author.id, { force: true }).catch(() => null);
      }
    }

    if (!targetUser) {
      return context.reply({ content: "❌ Could not find that user.", ephemeral: true });
    }

    // Force fetch user to load banner data
    const fullUser = await client.users.fetch(targetUser.id, { force: true }).catch(() => targetUser);

    if (!fullUser.banner) {
      return context.reply({
        content: `ℹ️ **${fullUser.tag || fullUser.username}** does not have a custom profile banner set.`,
        ephemeral: true,
      });
    }

    const bannerUrl = fullUser.bannerURL({ dynamic: true, size: 1024 });

    const embed = new EmbedBuilder()
      .setColor(config.theme?.primary || config.EMBED_COLORS?.PRIMARY || "#5865F2")
      .setAuthor({
        name: `${fullUser.tag || fullUser.username} • Profile Visuals`,
        iconURL: fullUser.displayAvatarURL({ dynamic: true })
      })
      .setTitle(`🎨 Banner for ${fullUser.tag || fullUser.username}`)
      .setDescription(`[Open Full Resolution](${bannerUrl})`)
      .setImage(bannerUrl)
      .setFooter({ text: `${config.BOT_NAME || "Mina"} Utility • High-Resolution Render` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Open in Browser").setStyle(ButtonStyle.Link).setURL(bannerUrl)
    );

    return context.reply({ embeds: [embed], components: [row] });
  },
};
