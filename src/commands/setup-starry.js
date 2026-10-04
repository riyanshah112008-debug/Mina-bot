// ==========================================
// 🧠 STARRY MASTER SETUP SLASH COMMAND
// File Path: src/commands/setup-starry.js
// Multilingual Setup Wizard & Neural Server Sync
// ==========================================

const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder 
} = require('discord.js');
const { 
    getGuildLanguage, 
    setGuildLanguage, 
    t, 
    createSetupPromptCard, 
    SUPPORTED_LANGUAGES 
} = require('../utils/i18n');
const { runServerSync } = require('../modules/masterSetupText');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-starry')
        .setDescription('🧠 AI MASTER COMMAND: Scans, builds, & configures custom server layout in your language.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('language')
                .setDescription('Select your preferred server language')
                .setRequired(false)
                .addChoices(
                    { name: '🇬🇧 English', value: 'en' },
                    { name: '🇪🇸 Español (Spanish)', value: 'es' },
                    { name: '🇧🇷 Português (Portuguese)', value: 'pt' },
                    { name: '🇯🇵 日本語 (Japanese)', value: 'ja' },
                    { name: '🇮🇳 हिन्दी (Hindi)', value: 'hi' },
                    { name: '🇫🇷 Français (French)', value: 'fr' },
                    { name: '🇩🇪 Deutsch (German)', value: 'de' },
                    { name: '🇷🇺 Русский (Russian)', value: 'ru' },
                    { name: '🇮🇩 Bahasa Indonesia', value: 'id' },
                    { name: '🇮🇹 Italiano (Italian)', value: 'it' },
                    { name: '🇻🇳 Tiếng Việt (Vietnamese)', value: 'vi' },
                    { name: '🇹🇷 Türkçe (Turkish)', value: 'tr' },
                    { name: '🇸🇦 العربية (Arabic)', value: 'ar' },
                    { name: '🇰🇷 한국어 (Korean)', value: 'ko' }
                )
        )
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('Describe your server theme (e.g., "Anime Chill Server", "Cyberpunk Gaming Community")')
                .setRequired(false)
        ),

    async execute(interaction, client) {
        if (!interaction.guild) {
            return interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
        }

        const chosenLang = interaction.options.getString('language');
        if (chosenLang) {
            await setGuildLanguage(interaction.guild.id, chosenLang);
        }

        let currentLang = await getGuildLanguage(interaction.guild.id);
        const card = createSetupPromptCard(interaction.guild, currentLang, client.user);

        const response = await interaction.reply({ ...card, fetchReply: true });

        const filter = i => i.user.id === interaction.user.id;
        const collector = response.createMessageComponentCollector({ filter, time: 120000 });

        collector.on('collect', async i => {
            try {
                // Language Dropdown Selection
                if (i.isStringSelectMenu() && (i.customId === 'starry_setup_lang_select' || i.customId === 'starry_lang_select')) {
                    const newLangCode = i.values[0];
                    await setGuildLanguage(interaction.guild.id, newLangCode);
                    currentLang = newLangCode;

                    const updatedCard = createSetupPromptCard(interaction.guild, currentLang, client.user);
                    return await i.update(updatedCard);
                }

                // Cancel Button
                if (i.customId === 'master_txt_cancel') {
                    collector.stop('cancelled');
                    return await i.update({
                        content: t(currentLang, 'setup.aborted'),
                        embeds: [],
                        components: []
                    });
                }

                // Confirm & Sync Button
                if (i.customId === 'master_txt_confirm') {
                    collector.stop('synced');
                    await i.update({
                        content: t(currentLang, 'setup.scanning'),
                        embeds: [],
                        components: []
                    });

                    const report = await runServerSync(interaction.guild, client, currentLang);
                    const langInfo = SUPPORTED_LANGUAGES[currentLang] || SUPPORTED_LANGUAGES['en'];

                    const successEmbed = new EmbedBuilder()
                        .setColor('#2ECC71')
                        .setTitle(t(currentLang, 'setup.complete_title'))
                        .setDescription(
                            `${t(currentLang, 'setup.complete_desc')}\n\n` +
                            `🌐 **Language:** ${langInfo.flag} **${langInfo.native}**\n\n` +
                            `${report.join('\n')}`
                        )
                        .setFooter({ text: 'Starry Master Brain • Language: ' + langInfo.name, iconURL: client.user.displayAvatarURL() })
                        .setTimestamp();

                    return await interaction.followUp({ embeds: [successEmbed] });
                }
            } catch (err) {
                console.error('[setup-starry] Interaction error:', err);
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                await interaction.editReply({
                    content: t(currentLang, 'setup.timeout'),
                    embeds: [],
                    components: []
                }).catch(() => {});
            }
        });
    }
};
