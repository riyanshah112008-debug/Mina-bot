const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require("discord.js");
const config = require("../../config");

module.exports = {
  name: "embed",
  aliases: ["embedbuilder"],
  category: "Utility",
  description: "Construct and broadcast a formatted Discord embed.",
  usage: "embed title=<title> desc=<description> [color=<hex>] [channel=<#channel>]",
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Construct and broadcast a formatted Discord embed.")
    .addStringOption((opt) =>
      opt.setName("title").setDescription("Embed title").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("description").setDescription("Embed description text").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("color").setDescription("Hex color code (e.g. #5865F2 or GREEN)").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("footer").setDescription("Footer text").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("image").setDescription("Image URL").setRequired(false)
    )
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Channel to post into")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const member = context.member;
    const guild = context.guild;

    if (!guild) {
      return context.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
    }

    if (!member.permissions.has(PermissionFlagsBits.ManageMessages) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return context.reply({
        content: "❌ You need the **Manage Messages** permission to create custom embeds.",
        ephemeral: true,
      });
    }

    let title = "";
    let desc = "";
    let color = config.theme.primary;
    let footer = null;
    let image = null;
    let targetChannel = context.channel;

    if (isSlash) {
      title = context.options.getString("title");
      desc = context.options.getString("description");
      const hexColor = context.options.getString("color");
      if (hexColor) color = hexColor;
      footer = context.options.getString("footer");
      image = context.options.getString("image");
      targetChannel = context.options.getChannel("channel") || context.channel;
    } else {
      const fullText = args.join(" ");
      // Try parsing JSON first
      if (fullText.startsWith("{") && fullText.endsWith("}")) {
        try {
          const parsed = JSON.parse(fullText);
          title = parsed.title || "Announcement";
          desc = parsed.description || parsed.desc || "";
          color = parsed.color || color;
          footer = parsed.footer || null;
          image = parsed.image || null;
        } catch (_) {}
      }

      if (!desc) {
        // Parse key-value tokens: title="something" desc="something"
        const titleMatch = fullText.match(/title="([^"]+)"/i) || fullText.match(/title=([^\s]+)/i);
        const descMatch = fullText.match(/desc="([^"]+)"/i) || fullText.match(/desc=([^\s]+)/i);
        const colorMatch = fullText.match(/color="([^"]+)"/i) || fullText.match(/color=([^\s]+)/i);
        const footerMatch = fullText.match(/footer="([^"]+)"/i);

        if (titleMatch) title = titleMatch[1];
        if (descMatch) desc = descMatch[1];
        if (colorMatch) color = colorMatch[1];
        if (footerMatch) footer = footerMatch[1];

        if (!title && !desc) {
          title = "Notice";
          desc = fullText;
        }
      }

      if (context.mentions?.channels?.first()) {
        targetChannel = context.mentions.channels.first();
      }

      if (typeof context.delete === "function") {
        context.delete().catch(() => {});
      }
    }

    if (!desc || desc.trim().length === 0) {
      return context.reply({
        content: `❌ Description cannot be empty!\n**Usage:** \`?embed title="Welcome" desc="Welcome to our server!"\``,
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title.slice(0, 256))
      .setDescription(desc.slice(0, 4096))
      .setTimestamp();

    if (footer) embed.setFooter({ text: footer.slice(0, 2048) });
    if (image && /^https?:\/\//i.test(image)) embed.setImage(image);

    try {
      await targetChannel.send({ embeds: [embed] });
      if (isSlash) {
        return context.reply({ content: `✅ Embed dispatched to <#${targetChannel.id}>!`, ephemeral: true });
      }
    } catch (err) {
      return context.reply({ content: `❌ Could not send embed: ${err.message}`, ephemeral: true });
    }
  },
};
