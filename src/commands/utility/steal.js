const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, parseEmoji } = require("discord.js");
const config = require("../../config");
const { downloadAndValidateImage } = require("../../utils/imageHelper");

module.exports = {
  name: "steal",
  aliases: ["addemoji", "clonemoji"],
  category: "Utility",
  description: "Clone an emoji from another server or URL into this server.",
  usage: "steal <emoji|url> [name]",
  data: new SlashCommandBuilder()
    .setName("steal")
    .setDescription("Clone an emoji from another server or URL into this server.")
    .addStringOption((opt) =>
      opt.setName("source").setDescription("The emoji (<:name:id>) or image URL").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("name").setDescription("Custom name for the new emoji").setRequired(false)
    ),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const member = context.member;

    if (!guild) {
      return context.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
    }

    if (!member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return context.reply({
        content: "❌ You need the **Manage Emojis and Stickers** permission to steal emojis.",
        ephemeral: true,
      });
    }

    let source = isSlash ? context.options.getString("source") : args[0];
    let customName = isSlash ? context.options.getString("name") : args[1];

    if (!source) {
      return context.reply({
        content: "❌ Please provide an emoji or direct image URL to steal!\n**Usage:** `?steal <:emoji_name:id> [custom_name]`",
        ephemeral: true,
      });
    }

    let emojiUrl = null;
    let emojiName = customName;

    const parsed = parseEmoji(source);
    if (parsed && parsed.id) {
      const ext = parsed.animated ? "gif" : "png";
      emojiUrl = `https://cdn.discordapp.com/emojis/${parsed.id}.${ext}?size=128&quality=lossless`;
      if (!emojiName) emojiName = parsed.name;
    } else if (/^https?:\/\//i.test(source)) {
      emojiUrl = source;
      if (!emojiName) emojiName = "custom_emoji";
    }

    if (!emojiUrl) {
      return context.reply({
        content: "❌ Could not parse an emoji or valid image URL from your input.",
        ephemeral: true,
      });
    }

    emojiName = emojiName.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 32);
    if (emojiName.length < 2) emojiName = "stolen_emoji";

    if (isSlash && typeof context.deferReply === "function") {
      await context.deferReply().catch(() => {});
    }

    const replyFunc = isSlash
      ? (payload) => context.editReply(payload)
      : (payload) => context.reply(payload);

    try {
      const downloadRes = await downloadAndValidateImage(emojiUrl, 256 * 1024);
      if (!downloadRes.ok) {
        return replyFunc({ content: `❌ ${downloadRes.error}` });
      }

      const createdEmoji = await guild.emojis.create({
        attachment: downloadRes.buffer,
        name: emojiName,
        reason: `Emoji stolen/added by ${context.author?.tag || context.user?.tag}`,
      });

      const embed = new EmbedBuilder()
        .setColor(config.theme.success)
        .setTitle("✅ Emoji Successfully Cloned!")
        .setDescription(
          `Added ${createdEmoji.toString()} with name \`:${createdEmoji.name}:\`!\n` +
          `**Preview:** [Direct Link](${createdEmoji.url})`
        )
        .setThumbnail(createdEmoji.url)
        .setFooter({ text: `Server slots: ${guild.emojis.cache.size}` })
        .setTimestamp();

      return replyFunc({ embeds: [embed] });
    } catch (err) {
      console.error("[steal error]:", err);
      return replyFunc({ content: `❌ Failed to create emoji: ${err.message}` });
    }
  },
};
