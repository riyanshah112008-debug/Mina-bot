const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const config = require("../../config");
const db = require("../../utils/database");

const categoryMeta = {
  Moderation: { emoji: "🛡️", desc: "Administrative moderation and automod controls" },
  Utility: { emoji: "⚙️", desc: "General server and user utility tools" },
  Fun: { emoji: "🎉", desc: "Mini-games, social interactions, anime actions & fun" },
  Music: { emoji: "🎵", desc: "Hi-Fi audio playback, search, queue & voice controls" },
  Tickets: { emoji: "🎫", desc: "Support ticket management & transcript portal" },
  Verification: { emoji: "✅", desc: "Normal and Voice Video Verification systems" },
};

function getCategoryMap(client) {
  const allCommands = Array.from(client.commands.values());
  const categories = new Map();
  for (const cmd of allCommands) {
    const cat = cmd.category || "Utility";
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat).push(cmd);
  }
  return { allCommands, categories };
}

function buildHelpSelectRow(client, selectedValue = null) {
  const { categories } = getCategoryMap(client);
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("help_category_select")
    .setPlaceholder("📂 Select a module category...");

  // Home / Overview option
  selectMenu.addOptions({
    label: "All Commands (Overview)",
    value: "cat_overview",
    description: "Return to the main category overview and bot statistics",
    emoji: "🏠",
    default: selectedValue === "cat_overview",
  });

  for (const [catName] of categories.entries()) {
    const meta = categoryMeta[catName] || { emoji: "📌", desc: "General commands" };
    const val = `cat_${catName.toLowerCase()}`;
    selectMenu.addOptions({
      label: catName,
      value: val,
      description: meta.desc.slice(0, 100),
      emoji: meta.emoji,
      default: selectedValue === val,
    });
  }

  return new ActionRowBuilder().addComponents(selectMenu);
}

function buildHelpOverview(client, prefix) {
  const { allCommands, categories } = getCategoryMap(client);
  const mainEmbed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle("🌸 Mina Bot Command Hub")
    .setDescription(
      `Welcome to **Mina Bot**! Select a category below or type \`${prefix}help <command>\` for detailed parameter information.\n\n` +
      `**Server Prefix:** \`${prefix}\` | **Slash Commands:** \`/\``
    )
    .setThumbnail(client.user?.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `Mina Bot System • Total Commands: ${allCommands.length}` })
    .setTimestamp();

  for (const [catName, cmds] of categories.entries()) {
    const meta = categoryMeta[catName] || { emoji: "📌", desc: "General commands" };
    mainEmbed.addFields({
      name: `${meta.emoji} ${catName} (${cmds.length})`,
      value: cmds.map((c) => `\`${c.name}\``).join(" "),
      inline: false,
    });
  }

  return mainEmbed;
}

function buildCategoryHelp(client, categoryName, prefix) {
  const { categories } = getCategoryMap(client);
  const matchedCategory = Array.from(categories.keys()).find(
    (c) => c.toLowerCase() === categoryName.toLowerCase()
  );

  if (!matchedCategory) return null;

  const catCmds = categories.get(matchedCategory);
  const meta = categoryMeta[matchedCategory] || { emoji: "📌", desc: "" };

  const catEmbed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle(`${meta.emoji} ${matchedCategory} Module`)
    .setDescription(`${meta.desc}\n\nUse \`${prefix}help <command>\` for full argument usage.`)
    .setFooter({ text: `Mina Bot • ${catCmds.length} commands in this category` });

  for (const cmd of catCmds) {
    catEmbed.addFields({
      name: `\`${prefix}${cmd.name}\``,
      value: `${cmd.description || "No description"}\n**Usage:** \`${prefix}${cmd.usage || cmd.name}\``,
      inline: false,
    });
  }

  return catEmbed;
}

async function handleHelpSelectInteraction(interaction, client) {
  const guild = interaction.guild;
  const settings = guild ? db.getGuildSettings(guild.id) : { prefix: config.prefix };
  const prefix = settings.prefix || config.prefix;

  const selected = interaction.values[0];

  if (selected === "cat_overview") {
    const mainEmbed = buildHelpOverview(client, prefix);
    const row = buildHelpSelectRow(client, "cat_overview");
    return interaction.update({ embeds: [mainEmbed], components: [row] }).catch(() => {});
  }

  const selectedCat = selected.replace("cat_", "");
  const catEmbed = buildCategoryHelp(client, selectedCat, prefix);

  if (!catEmbed) {
    return interaction.deferUpdate().catch(() => {});
  }

  const row = buildHelpSelectRow(client, selected);
  return interaction.update({ embeds: [catEmbed], components: [row] }).catch(() => {});
}

module.exports = {
  name: "help",
  category: "Utility",
  description: "Display all available commands or get details on a specific command.",
  usage: "help [command]",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("View all available commands.")
    .addStringOption((opt) =>
      opt.setName("command").setDescription("Specific command to view").setRequired(false)
    ),

  buildHelpOverview,
  buildCategoryHelp,
  buildHelpSelectRow,
  handleHelpSelectInteraction,

  async execute(context, args, client) {
    const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();
    const guild = context.guild;
    const settings = guild ? db.getGuildSettings(guild.id) : { prefix: config.prefix };
    const prefix = settings.prefix || config.prefix;

    let query;
    if (isSlash) {
      query = context.options.getString("command")?.toLowerCase();
    } else {
      query = args && args[0] ? args[0].toLowerCase() : null;
    }

    const { allCommands } = getCategoryMap(client);

    // Single command lookup
    if (query) {
      const cmd = allCommands.find((c) => c.name === query || (c.aliases || []).includes(query));
      if (!cmd) {
        return context.reply({ content: `❌ Command \`${query}\` does not exist.`, ephemeral: true });
      }

      const detailEmbed = new EmbedBuilder()
        .setColor(config.theme.primary)
        .setTitle(`📖 Command: \`${cmd.name}\``)
        .addFields(
          { name: "Description", value: cmd.description || "No description provided.", inline: false },
          { name: "Category", value: `${categoryMeta[cmd.category]?.emoji || "📌"} ${cmd.category || "General"}`, inline: true },
          { name: "Aliases", value: cmd.aliases?.length ? cmd.aliases.map((a) => `\`${a}\``).join(", ") : "`None`", inline: true },
          { name: "Permissions Required", value: cmd.permissions?.length ? cmd.permissions.map((p) => `\`${p}\``).join(", ") : "`None`", inline: true },
          { name: "Usage", value: `\`\`\`${prefix}${cmd.usage || cmd.name}\`\`\``, inline: false }
        )
        .setFooter({ text: "Mina Bot • Advanced System" })
        .setTimestamp();

      return context.reply({ embeds: [detailEmbed] });
    }

    // Build Overview Embed and Dynamic Select Menu
    const mainEmbed = buildHelpOverview(client, prefix);
    const row = buildHelpSelectRow(client, "cat_overview");

    return isSlash
      ? await context.reply({ embeds: [mainEmbed], components: [row] })
      : await context.channel.send({ embeds: [mainEmbed], components: [row] });
  },
};
