// ==========================================
// 🌐 STARRY SUPREME TRANSLATOR ENGINE
// File Path: ./modules/translator.js
// ==========================================

const { 
    EmbedBuilder, 
    SlashCommandBuilder, 
    ContextMenuCommandBuilder, 
    ApplicationCommandType, 
    ApplicationIntegrationType, 
    InteractionContextType, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    Events,
    MessageFlags 
} = require('discord.js');

const EPHEMERAL_FLAG = MessageFlags.Ephemeral || 6;

const languageMap = {
    'english': 'en', 'en': 'en', '🇺🇸': 'en', '🇬🇧': 'en',
    'spanish': 'es', 'es': 'es', '🇪🇸': 'es',
    'french': 'fr', 'fr': 'fr', '🇫🇷': 'fr',
    'german': 'de', 'de': 'de', '🇩🇪': 'de',
    'italian': 'it', 'it': 'it', '🇮🇹': 'it',
    'portuguese': 'pt', 'pt': 'pt', '🇧🇷': 'pt', '🇵🇹': 'pt',
    'russian': 'ru', 'ru': 'ru', '🇷🇺': 'ru',
    'japanese': 'ja', 'ja': 'ja', '🇯🇵': 'ja',
    'korean': 'ko', 'ko': 'ko', '🇰🇷': 'ko',
    'chinese': 'zh-cn', 'zh': 'zh-cn', 'cn': 'zh-cn', '🇨🇳': 'zh-cn',
    'hindi': 'hi', 'hi': 'hi', '🇮🇳': 'hi',
    'arabic': 'ar', 'ar': 'ar', '🇸🇦': 'ar',
    'dutch': 'nl', 'nl': 'nl', '🇳🇱': 'nl',
    'turkish': 'tr', 'tr': 'tr', '🇹🇷': 'tr',
    'polish': 'pl', 'pl': 'pl', '🇵🇱': 'pl',
    'ukrainian': 'uk', 'uk': 'uk', '🇺🇦': 'uk',
    'vietnamese': 'vi', 'vi': 'vi', '🇻🇳': 'vi',
    'thai': 'th', 'th': 'th', '🇹🇭': 'th',
    'indonesian': 'id', 'id': 'id', '🇮🇩': 'id',
    'tagalog': 'tl', 'tl': 'tl', '🇵🇭': 'tl'
};

const flagMap = {
    'en': '🇺🇸', 'es': '🇪🇸', 'fr': '🇫🇷', 'de': '🇩🇪', 'it': '🇮🇹',
    'pt': '🇵🇹', 'ru': '🇷🇺', 'ja': '🇯🇵', 'ko': '🇰🇷', 'zh-cn': '🇨🇳',
    'hi': '🇮🇳', 'ar': '🇸🇦', 'nl': '🇳🇱', 'tr': '🇹🇷', 'pl': '🇵🇱',
    'uk': '🇺🇦', 'vi': '🇻🇳', 'th': '🇹🇭', 'id': '🇮🇩', 'tl': '🇵🇭'
};

// ==========================================
// 🚀 NATIVE TRANSLATION ENGINE
// ==========================================
async function translateText(text, targetLangCode) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLangCode}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Translation API rejected the request.');
    
    const data = await response.json();
    const translatedText = data[0].map(item => item[0]).join('');
    const sourceLang = data[2] || 'auto';

    return { translatedText, sourceLang };
}

function buildTranslationEmbed(text, translatedText, sourceLang, targetCode) {
    const srcFlag = flagMap[sourceLang.toLowerCase()] || '🌐';
    const tgtFlag = flagMap[targetCode.toLowerCase()] || '🌐';

    return new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ 
            name: 'STARRY NEURAL TRANSLATOR', 
            iconURL: 'https://c.tenor.com/TgKK6YKNkm0AAAAi/verified-verificado.gif' 
        })
        .addFields(
            { name: `${srcFlag} Original (${sourceLang.toUpperCase()})`, value: `\`\`\`\n${text.substring(0, 1000)}\n\`\`\``, inline: false },
            { name: `${tgtFlag} Translated (${targetCode.toUpperCase()})`, value: `>>> ❝ *${translatedText.substring(0, 1000)}* ❞`, inline: false }
        )
        .setFooter({ text: 'Powered by Starry Neural Translation System', iconURL: 'https://cdn.discordapp.com/embed/avatars/0.png' })
        .setTimestamp();
}

function buildLanguageSelector() {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('translate_select_lang')
            .setPlaceholder('Re-translate to another language...')
            .addOptions([
                { label: 'English', value: 'en', emoji: '🇺🇸' },
                { label: 'Spanish', value: 'es', emoji: '🇪🇸' },
                { label: 'French', value: 'fr', emoji: '🇫🇷' },
                { label: 'German', value: 'de', emoji: '🇩🇪' },
                { label: 'Japanese', value: 'ja', emoji: '🇯🇵' },
                { label: 'Hindi', value: 'hi', emoji: '🇮🇳' },
                { label: 'Chinese', value: 'zh-cn', emoji: '🇨🇳' },
                { label: 'Russian', value: 'ru', emoji: '🇷🇺' }
            ])
    );
}

// --- SLASH COMMAND PAYLOADS ---
const translatorPayload = new SlashCommandBuilder()
    .setName('translate')
    .setDescription('🌐 Translate text from any language into another')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
    .addStringOption(option => 
        option.setName('language')
            .setDescription('Target language (e.g., english, es, japanese, hi)')
            .setRequired(true)
    )
    .addStringOption(option => 
        option.setName('text')
            .setDescription('The text you want to translate')
            .setRequired(true)
    )
    .toJSON();

const translatorAliasPayload = new SlashCommandBuilder()
    .setName('translator')
    .setDescription('🌐 Translate text from any language into another')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
    .addStringOption(option => 
        option.setName('language')
            .setDescription('Target language')
            .setRequired(true)
    )
    .addStringOption(option => 
        option.setName('text')
            .setDescription('The text you want to translate')
            .setRequired(true)
    )
    .toJSON();

const translateContextPayload = new ContextMenuCommandBuilder()
    .setName('Translate to English')
    .setType(ApplicationCommandType.Message)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
    .toJSON();

function translatorModule(client, app) {
    const config = require('../config');
    const PREFIX = config.DEFAULT_PREFIX || ',';

    // 1. EXPRESS WEB API ENDPOINT
    if (app) {
        app.get('/api/translate', async (req, res) => {
            const text = req.query.text;
            const requestedLang = req.query.to || 'en';
            const guildId = req.query.guildId; 

            if (!guildId || (typeof client.isPremium === 'function' && !client.isPremium(guildId))) {
                return res.status(403).json({ error: 'Premium required' });
            }
            if (!text) return res.status(400).json({ error: 'No text provided' });

            const targetCode = languageMap[requestedLang.toLowerCase()] || requestedLang.toLowerCase();
            try {
                const result = await translateText(text, targetCode);
                res.json({ success: true, translatedText: result.translatedText, sourceLang: result.sourceLang });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    // 2. INTERACTION HANDLER (Slash Commands, Context Menu, Select Menu)
    client.on(Events.InteractionCreate, async (interaction) => {
        try {
            // A. SLASH COMMANDS (/translate & /translator)
            if (interaction.isChatInputCommand() && (interaction.commandName === 'translate' || interaction.commandName === 'translator')) {
                if (typeof client.isPremium === 'function' && interaction.guildId && !client.isPremium(interaction.guildId)) {
                    return interaction.reply({ content: '❌ **Translator is a Premium feature!** Use `/activatepremium` to upgrade.', flags: [EPHEMERAL_FLAG] });
                }

                await interaction.deferReply();
                const requestedLang = interaction.options.getString('language');
                const text = interaction.options.getString('text');
                const targetCode = languageMap[requestedLang.toLowerCase()] || requestedLang.toLowerCase();

                try {
                    const result = await translateText(text, targetCode);
                    const embed = buildTranslationEmbed(text, result.translatedText, result.sourceLang, targetCode);
                    const selector = buildLanguageSelector();

                    return await interaction.editReply({ embeds: [embed], components: [selector] });
                } catch (error) {
                    return await interaction.editReply(`❌ Translation Failed: \`Invalid language code or API timeout.\``);
                }
            }

            // B. CONTEXT MENU COMMAND ("Translate to English")
            if (interaction.isMessageContextMenuCommand() && interaction.commandName === 'Translate to English') {
                if (typeof client.isPremium === 'function' && interaction.guildId && !client.isPremium(interaction.guildId)) {
                    return interaction.reply({ content: '❌ **Translator is a Premium feature!** Use `/activatepremium` to upgrade.', flags: [EPHEMERAL_FLAG] });
                }

                await interaction.deferReply({ flags: [EPHEMERAL_FLAG] });
                const text = interaction.targetMessage.content;

                if (!text || text.trim().length === 0) {
                    return interaction.editReply('❌ The selected message contains no text to translate!');
                }

                const result = await translateText(text, 'en');
                const embed = buildTranslationEmbed(text, result.translatedText, result.sourceLang, 'en');
                return interaction.editReply({ embeds: [embed] });
            }

            // C. SELECT MENU RE-TRANSLATION
            if (interaction.isStringSelectMenu() && interaction.customId === 'translate_select_lang') {
                await interaction.deferReply({ flags: [EPHEMERAL_FLAG] });

                const targetCode = interaction.values[0];
                const originalField = interaction.message.embeds[0]?.fields[0]?.value;
                const cleanText = originalField ? originalField.replace(/```\n?/g, '').trim() : null;

                if (!cleanText) {
                    return interaction.editReply('❌ Could not extract original text for re-translation.');
                }

                const result = await translateText(cleanText, targetCode);
                const embed = buildTranslationEmbed(cleanText, result.translatedText, result.sourceLang, targetCode);
                return interaction.editReply({ embeds: [embed] });
            }
        } catch (err) {
            console.error('❌ Translator Interaction Error:', err);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '⚠️ Translation error occurred.', flags: [EPHEMERAL_FLAG] }).catch(() => {});
            }
        }
    });

    // 3. PREFIX COMMAND (.translate)
    client.on(Events.MessageCreate, async (message) => {
        if (message.author.bot || !message.guild) return;
        const startsWithPrefix = message.content.toLowerCase().startsWith(PREFIX + 'translate');
        const startsWithComma = message.content.toLowerCase().startsWith(',translate');
        if (!startsWithPrefix && !startsWithComma) return;
        if (!config.isBotOwner(message.author.id, client)) return;

        if (typeof client.isPremium === 'function' && !client.isPremium(message.guild.id)) {
            return message.reply('❌ **Translator is a Premium feature!** Use `.activatepremium` to upgrade.').catch(() => {});
        }

        const prefixLen = startsWithPrefix ? (PREFIX.length + 9) : 10;
        const args = message.content.slice(prefixLen).trim().split(/ +/);
        const requestedLang = args.shift(); 
        let text = args.join(' '); 

        if (!requestedLang) return message.reply('🔹 **Usage:** `.translate <language> <text>`\n*Tip: Reply to any message with `.translate en` to translate it!*');
        
        if (!text && message.reference) {
            const repliedMessage = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
            text = repliedMessage?.content;
        }

        if (!text) return message.reply('❌ Please provide text to translate or reply to a message.');

        const targetCode = languageMap[requestedLang.toLowerCase()] || requestedLang.toLowerCase();
        const waitMessage = await message.reply('🔄 Translating text...');

        try {
            const result = await translateText(text, targetCode);
            const embed = buildTranslationEmbed(text, result.translatedText, result.sourceLang, targetCode);
            const selector = buildLanguageSelector();

            await waitMessage.edit({ content: null, embeds: [embed], components: [selector] });
        } catch (error) {
            await waitMessage.edit(`❌ Translation Failed: \`Invalid language code or API timeout.\``);
        }
    });

    console.log('🌐 Translator Engine Module initialized.');
}

// Attach payloads so deploy-commands.js reads them!
translatorModule.translatorPayload = translatorPayload;
translatorModule.translatorAliasPayload = translatorAliasPayload;
translatorModule.translateContextPayload = translateContextPayload;

module.exports = translatorModule;
