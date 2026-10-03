const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const config = require("../../config");
const db = require("../../utils/database");

const SOCIAL_ACTIONS = {
  hug: {
    verb: "hugged",
    emoji: "🤗",
    buttonLabel: "Hug Back",
    requiresTarget: true,
    gifs: [
      "https://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif",
      "https://media.giphy.com/media/l2QDM9Jnim1YV55y8/giphy.gif",
      "https://media.giphy.com/media/wnsgren9NtITS/giphy.gif",
      "https://media.giphy.com/media/xJlOdEYy0N55K/giphy.gif",
    ],
  },
  kiss: {
    verb: "kissed",
    emoji: "💋",
    buttonLabel: "Kiss Back",
    requiresTarget: true,
    gifs: [
      "https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif",
      "https://media.giphy.com/media/FqBTvSNjNzeZG/giphy.gif",
      "https://media.giphy.com/media/flmwZUuOTjLXW/giphy.gif",
    ],
  },
  slap: {
    verb: "slapped",
    emoji: "👋",
    buttonLabel: "Slap Back",
    requiresTarget: true,
    gifs: [
      "https://media.giphy.com/media/Gf3AUz3eBNbTW/giphy.gif",
      "https://media.giphy.com/media/jLeyZWgtwWP2U/giphy.gif",
      "https://media.giphy.com/media/mEtSQlxqBtWWA/giphy.gif",
    ],
  },
  pat: {
    verb: "patted",
    emoji: "🐱",
    buttonLabel: "Pat Back",
    requiresTarget: true,
    gifs: [
      "https://media.giphy.com/media/L2z7dnOduq50wZTCvZ/giphy.gif",
      "https://media.giphy.com/media/ARSp9T7wwxNcs/giphy.gif",
      "https://media.giphy.com/media/109LtcamNpOgzK/giphy.gif",
    ],
  },
  cuddle: {
    verb: "cuddled",
    emoji: "🥰",
    buttonLabel: "Cuddle Back",
    requiresTarget: true,
    gifs: [
      "https://media.giphy.com/media/PHZ7vmg350LPM5vyYR/giphy.gif",
      "https://media.giphy.com/media/3bqtLDeiDtwhq/giphy.gif",
    ],
  },
  poke: {
    verb: "poked",
    emoji: "👉",
    buttonLabel: "Poke Back",
    requiresTarget: true,
    gifs: [
      "https://media.giphy.com/media/pWd360nZhk85oBaPX4/giphy.gif",
      "https://media.giphy.com/media/x4NFvjxokZRi8/giphy.gif",
    ],
  },
  punch: {
    verb: "punched",
    emoji: "🥊",
    buttonLabel: "Punch Back",
    requiresTarget: true,
    gifs: [
      "https://media.giphy.com/media/yo3TC0yeHd53G/giphy.gif",
      "https://media.giphy.com/media/AlsIdbROVJ2lW/giphy.gif",
    ],
  },
  wave: {
    verb: "waved at",
    emoji: "👋",
    buttonLabel: "Wave Back",
    requiresTarget: true,
    gifs: [
      "https://media.giphy.com/media/dzaUX7CAG0Ihi/giphy.gif",
      "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif",
    ],
  },
  dance: {
    verb: "is dancing with joy",
    emoji: "💃",
    buttonLabel: "Dance Along",
    requiresTarget: false,
    gifs: [
      "https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif",
      "https://media.giphy.com/media/mKMGLhoD8L4yc/giphy.gif",
      "https://media.giphy.com/media/13Y6LAZJqRspI4/giphy.gif",
    ],
  },
  cry: {
    verb: "is crying softly",
    emoji: "😢",
    buttonLabel: "Comfort",
    requiresTarget: false,
    gifs: [
      "https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif",
      "https://media.giphy.com/media/ROF8OQvDmxytW/giphy.gif",
    ],
  },
};

function getRandomGif(actionKey) {
  const meta = SOCIAL_ACTIONS[actionKey];
  if (!meta || !meta.gifs.length) return "https://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif";
  return meta.gifs[Math.floor(Math.random() * meta.gifs.length)];
}

function buildSocialPayload(actionKey, sender, target) {
  const meta = SOCIAL_ACTIONS[actionKey] || SOCIAL_ACTIONS.hug;
  let desc = "";

  if (target && target.id !== sender.id) {
    const totalCount = db.incrementSocialStat(sender.id, target.id, actionKey);
    const countNote = totalCount > 1 ? `\n*That's **${totalCount}** ${actionKey}s shared between them!*` : "";
    desc = `${meta.emoji} <@${sender.id}> **${meta.verb}** <@${target.id}>!${countNote}`;
  } else if (target && target.id === sender.id) {
    desc = `${meta.emoji} <@${sender.id}> **${meta.verb}** themselves! (Self love is important ✨)`;
  } else {
    desc = `${meta.emoji} <@${sender.id}> **${meta.verb}**!`;
  }

  const embed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setDescription(desc)
    .setImage(getRandomGif(actionKey))
    .setTimestamp();

  const components = [];
  if (target && target.id !== sender.id && !target.bot) {
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`social_action_${actionKey}_${sender.id}_${target.id}`)
          .setLabel(meta.buttonLabel)
          .setEmoji(meta.emoji)
          .setStyle(ButtonStyle.Primary)
      )
    );
  }

  return { embeds: [embed], components };
}

module.exports = {
  name: "social",
  aliases: ["hug", "kiss", "slap", "pat", "cuddle", "poke", "punch", "dance", "cry", "wave"],
  category: "Fun",
  description: "Express social emotions & anime reactions (hug, kiss, slap, pat, cuddle, dance, etc.).",
  usage: "hug @user | kiss @user | slap @user | social <action> [@user]",
  data: new SlashCommandBuilder()
    .setName("social")
    .setDescription("Express social reactions & anime interactions.")
    .addStringOption((opt) =>
      opt
        .setName("action")
        .setDescription("Action to perform")
        .setRequired(true)
        .addChoices(
          { name: "🤗 Hug", value: "hug" },
          { name: "💋 Kiss", value: "kiss" },
          { name: "👋 Slap", value: "slap" },
          { name: "🐱 Pat", value: "pat" },
          { name: "🥰 Cuddle", value: "cuddle" },
          { name: "👉 Poke", value: "poke" },
          { name: "🥊 Punch", value: "punch" },
          { name: "💃 Dance", value: "dance" },
          { name: "😢 Cry", value: "cry" },
          { name: "👋 Wave", value: "wave" }
        )
    )
    .addUserOption((opt) =>
      opt.setName("target").setDescription("User to interact with").setRequired(false)
    ),

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const sender = isSlash ? context.user : context.author;

    let actionKey = "hug";
    let target = null;

    if (isSlash) {
      actionKey = context.options.getString("action") || "hug";
      target = context.options.getUser("target");
    } else {
      // Determine action from command alias (e.g. if invoked as "?kiss @user")
      const invokedAlias = (context.content || "").slice(1).trim().split(/\s+/)[0]?.toLowerCase();
      if (invokedAlias && SOCIAL_ACTIONS[invokedAlias]) {
        actionKey = invokedAlias;
      } else if (args[0] && SOCIAL_ACTIONS[args[0].toLowerCase()]) {
        actionKey = args[0].toLowerCase();
        args = args.slice(1);
      }

      if (context.mentions?.users?.size > 0) {
        target = context.mentions.users.first();
      } else if (args[0]) {
        const id = args[0].replace(/[^0-9]/g, "");
        target = await client.users.fetch(id).catch(() => null);
      }
    }

    const payload = buildSocialPayload(actionKey, sender, target);
    return context.reply(payload);
  },

  async handleSocialInteraction(interaction, client) {
    const parts = interaction.customId.split("_"); // ["social", "action", "hug", "senderId", "targetId"]
    const actionKey = parts[2] || "hug";
    const originalSenderId = parts[3];
    const originalTargetId = parts[4];

    // Only the target can click the "Back" button
    if (interaction.user.id !== originalTargetId) {
      return interaction.reply({
        content: `❌ Only <@${originalTargetId}> can use this reciprocal action button!`,
        ephemeral: true,
      });
    }

    const originalSender = await client.users.fetch(originalSenderId).catch(() => null);
    if (!originalSender) {
      return interaction.reply({ content: "❌ Target user not found.", ephemeral: true });
    }

    const payload = buildSocialPayload(actionKey, interaction.user, originalSender);
    return interaction.reply(payload);
  },
};
