// ==========================================
// 🔍 STARRY MULTI-PLATFORM SEARCH SLASH COMMAND
// File Path: src/commands/music/search.js
// ==========================================
const { SlashCommandBuilder } = require('discord.js');
const { getSongAutocomplete, executeSearchCommand } = require('../../utils/musicSearchHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('🔍 Interactive multi-platform search across SoundCloud, Spotify, Apple Music & YouTube')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Song title, artist, or keywords to search')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction, client) {
    const focused = interaction.options.getFocused();
    const choices = await getSongAutocomplete(focused, client.manager);
    return interaction.respond(choices).catch(() => {});
  },

  async execute(interaction, client) {
    const query = interaction.options.getString('query');
    const { CommandContext } = require('../../utils/contextHelper');
    const ctx = new CommandContext(interaction, client, []);
    return executeSearchCommand(ctx, query);
  }
};
