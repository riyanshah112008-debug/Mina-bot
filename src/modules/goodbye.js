// ==========================================
// 🥀 AESTHETIC GOODBYE MODULE & EMBED VISUALITY SUITE
// File Path: src/modules/goodbye.js
// Interactive Control Panel • Real-time Modals • Live Preview
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    PermissionFlagsBits, 
    SlashCommandBuilder 
} = require('discord.js');
const mongoose = require('mongoose');
const { getGuildLanguageSync, t } = require('../utils/i18n');

const goodbyeSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    title: { type: String, default: '🥀 FAREWELL FROM {server} 🥀' },
    description: { type: String, default: 'Goodbye {user}! We are sad to see you leave our community. We wish you the absolute best on your journey! ✨' },
    color: { type: String, default: '#7289DA' },
    image: { type: String, default: 'https://media.tenor.com/images/99208a68b444b0593457a82b3d39575e/tenor.gif' },
    thumbnail: { type: String, default: 'avatar' },
    footer: { type: String, default: 'We are now down to {count} members.' },
    pingContent: { type: String, default: '👋 Farewell, **{username}**.' }
});

const GoodbyeSettings = mongoose.models.GoodbyeSettings || mongoose.model('GoodbyeSettings', goodbyeSchema);

const setupGoodbyeCommand = new SlashCommandBuilder()
    .setName('setupgoodbye')
    .setDescription('🥀 Set up and interactively customize goodbye messages')
    .addChannelOption(option => 
        option.setName('channel')
            .setDescription('The text channel to send aesthetic goodbye cards in')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

const customizeGoodbyeCommand = new SlashCommandBuilder()
    .setName('customizegoodbye')
    .setDescription('🎨 Interactively design and customize goodbye embed visuality')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

function cleanImageUrl(str) {
    if (!str || typeof str !== 'string' || str === 'undefined' || str === 'avatar') return '';
    return str.trim().replace(/[\`\<\>\s]/g, '');
}

function isValidUrl(str) {
    const cleaned = cleanImageUrl(str);
    if (!cleaned) return false;
    try {
        const url = new URL(cleaned);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function isValidHex(color) {
    if (!color || typeof color !== 'string' || color === 'undefined') return false;
    return /^#([0-9A-F]{3}){1,2}$/i.test(color.trim());
}

function replacePlaceholders(text, member) {
    if (!text || typeof text !== 'string' || text === 'undefined') return '';
    const user = member?.user || member;
    const guild = member?.guild || { name: 'Server', memberCount: 100 };
    return text
        .replace(/\{user\}/g, `<@${user.id}>`)
        .replace(/\{username\}/g, user.username || 'User')
        .replace(/\{tag\}/g, user.tag || user.username || 'User')
        .replace(/\{server\}/g, guild.name)
        .replace(/\{count\}/g, `${guild.memberCount}`);
}

function getGoodbyeDefaults(lang, serverName) {
    return {
        title: '🥀 FAREWELL FROM {server} 🥀',
        description: 'Goodbye {user}! We are sad to see you leave our community. We wish you the absolute best on your journey! ✨',
        color: '#7289DA',
        image: 'https://media.tenor.com/images/99208a68b444b0593457a82b3d39575e/tenor.gif',
        thumbnail: 'avatar',
        footer: 'We are now down to {count} members.',
        pingContent: '👋 Farewell, **{username}**.'
    };
}

async function getGoodbyeControlPanel(guildId, client) {
    let settings = await GoodbyeSettings.findOne({ guildId });
    if (!settings) return null;

    const channelDisplay = settings.channelId ? `<#${settings.channelId}>` : '*Not Set*';
    const pingDisplay = (settings.pingContent && settings.pingContent !== 'undefined') ? settings.pingContent : '👋 Farewell, **{username}**.';
    const titleDisplay = (settings.title && settings.title !== 'undefined') ? settings.title : '🥀 FAREWELL FROM {server} 🥀';
    const descDisplay = (settings.description && settings.description !== 'undefined') ? settings.description : 'Goodbye {user}! We are sad to see you leave our community.';
    const colorDisplay = isValidHex(settings.color) ? settings.color : '#7289DA';
    const footerDisplay = (settings.footer && settings.footer !== 'undefined') ? settings.footer : 'We are now down to {count} members.';
    
    const activeImage = cleanImageUrl(settings.image);
    const imageDisplay = isValidUrl(activeImage) ? `[View Media Link](${activeImage})` : '*Default GIF*';

    const panelEmbed = new EmbedBuilder()
        .setColor(colorDisplay)
        .setTitle('🥀 Goodbye Embed Visuality Control Panel')
        .setDescription(
            `Configure and design custom farewell cards for departing members.\n\n` +
            `**📍 Goodbye Channel:** ${channelDisplay}\n` +
            `**💬 Message Header:** \`${pingDisplay}\`\n` +
            `**🏷️ Title:** \`${titleDisplay}\`\n` +
            `**📝 Description:** \`\`\`${descDisplay}\`\`\`\n` +
            `**🎨 Hex Color:** \`${colorDisplay}\` | **🌸 Footer:** \`${footerDisplay}\`\n` +
            `**🖼️ Banner Image/GIF:** ${imageDisplay}`
        )
        .addFields({
            name: '🔤 Supported Variables',
            value: '`{user}` • `{username}` • `{tag}` • `{server}` • `{count}`',
            inline: false
        })
        .setFooter({ text: 'Use the interactive buttons below to modify each section in real time.' });

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('goodbye_btn_text').setLabel('Edit Text').setStyle(ButtonStyle.Primary).setEmoji('✏️'),
        new ButtonBuilder().setCustomId('goodbye_btn_media').setLabel('Edit Media').setStyle(ButtonStyle.Secondary).setEmoji('🖼️'),
        new ButtonBuilder().setCustomId('goodbye_btn_style').setLabel('Edit Style & Footer').setStyle(ButtonStyle.Secondary).setEmoji('🎨')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('goodbye_btn_ping').setLabel('Edit Header').setStyle(ButtonStyle.Secondary).setEmoji('💬'),
        new ButtonBuilder().setCustomId('goodbye_btn_preview').setLabel('Live Preview').setStyle(ButtonStyle.Success).setEmoji('👁️'),
        new ButtonBuilder().setCustomId('goodbye_btn_reset').setLabel('Reset Defaults').setStyle(ButtonStyle.Danger).setEmoji('🔄'),
        new ButtonBuilder().setCustomId('visuality_btn_studio').setLabel('Studio Hub').setStyle(ButtonStyle.Secondary).setEmoji('🎨')
    );

    return { embeds: [panelEmbed], components: [row1, row2] };
}

const goodbyeModule = (client) => {
    if (client.commands && typeof client.commands.set === 'function') {
        client.commands.set('setupgoodbye', { data: setupGoodbyeCommand, execute: handleSetupGoodbye });
        client.commands.set('customizegoodbye', { data: customizeGoodbyeCommand, execute: handleCustomizeGoodbye });
    }

    async function handleSetupGoodbye(interaction) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ ephemeral: true });
            }
        } catch (e) { return; }

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.editReply({ content: '❌ You need **Manage Server** permissions to configure goodbye messages.' });
        }

        const channel = interaction.options.getChannel('channel', true);
        const lang = getGuildLanguageSync(interaction.guildId);

        let settings = await GoodbyeSettings.findOne({ guildId: interaction.guildId });
        if (!settings) {
            const defs = getGoodbyeDefaults(lang, interaction.guild.name);
            settings = await GoodbyeSettings.create({
                guildId: interaction.guildId,
                channelId: channel.id,
                title: defs.title,
                description: defs.description,
                color: defs.color,
                image: defs.image,
                thumbnail: defs.thumbnail,
                footer: defs.footer,
                pingContent: defs.pingContent
            });
        } else {
            settings.channelId = channel.id;
            await settings.save();
        }

        const panelData = await getGoodbyeControlPanel(interaction.guildId, client);
        return interaction.editReply({ 
            content: `✅ **Goodbye Channel Set to ${channel}!** Customize the visuality below:`,
            ...panelData 
        });
    }

    async function handleCustomizeGoodbye(interaction) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ ephemeral: true });
            }
        } catch (e) { return; }

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.editReply({ content: '❌ You need **Manage Server** permissions to configure goodbye visuality.' });
        }

        let settings = await GoodbyeSettings.findOne({ guildId: interaction.guildId });
        if (!settings) {
            return interaction.editReply({ content: '❌ Please run `/setupgoodbye <channel>` or `,setupgoodbye #channel` first to set a goodbye channel!' });
        }

        const panelData = await getGoodbyeControlPanel(interaction.guildId, client);
        return interaction.editReply(panelData);
    }

    // ==========================================
    // 🔘 INTERACTIVE EMBED MANAGER BUTTON & MODAL HANDLERS
    // ==========================================
    client.on('interactionCreate', async (interaction) => {
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'setupgoodbye') await handleSetupGoodbye(interaction);
            if (interaction.commandName === 'customizegoodbye') await handleCustomizeGoodbye(interaction);
            return;
        }

        if (interaction.isButton() && interaction.customId.startsWith('goodbye_btn_')) {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({ content: '❌ You need **Manage Server** permissions.', ephemeral: true });
            }

            let settings = await GoodbyeSettings.findOne({ guildId: interaction.guildId });
            if (!settings) return interaction.reply({ content: '❌ Please run `/setupgoodbye` first.', ephemeral: true });

            // EDIT TITLE & DESCRIPTION MODAL
            if (interaction.customId === 'goodbye_btn_text') {
                const modal = new ModalBuilder().setCustomId('goodbye_modal_text').setTitle('Edit Goodbye Title & Text');
                
                const titleInput = new TextInputBuilder()
                    .setCustomId('in_goodbye_title')
                    .setLabel('Goodbye Embed Title')
                    .setStyle(TextInputStyle.Short)
                    .setValue((settings.title && settings.title !== 'undefined') ? settings.title : '🥀 FAREWELL FROM {server} 🥀')
                    .setRequired(true);

                const descInput = new TextInputBuilder()
                    .setCustomId('in_goodbye_desc')
                    .setLabel('Goodbye Description')
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue((settings.description && settings.description !== 'undefined') ? settings.description : 'Goodbye {user}! We are sad to see you leave.')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(titleInput), new ActionRowBuilder().addComponents(descInput));
                return interaction.showModal(modal);
            }

            // EDIT BANNER & THUMBNAIL MODAL
            if (interaction.customId === 'goodbye_btn_media') {
                const modal = new ModalBuilder().setCustomId('goodbye_modal_media').setTitle('Edit Goodbye Banner & Thumbnail');

                const imageInput = new TextInputBuilder()
                    .setCustomId('in_goodbye_image')
                    .setLabel('Banner Image/GIF URL')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Paste image/GIF URL (e.g. https://... or leave empty)')
                    .setValue(cleanImageUrl(settings.image) || 'https://media.tenor.com/images/99208a68b444b0593457a82b3d39575e/tenor.gif')
                    .setRequired(false);

                const thumbInput = new TextInputBuilder()
                    .setCustomId('in_goodbye_thumb')
                    .setLabel('Thumbnail ("avatar" or custom image URL)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue((settings.thumbnail && settings.thumbnail !== 'undefined') ? settings.thumbnail : 'avatar')
                    .setRequired(false);

                modal.addComponents(new ActionRowBuilder().addComponents(imageInput), new ActionRowBuilder().addComponents(thumbInput));
                return interaction.showModal(modal);
            }

            // EDIT STYLE & FOOTER MODAL
            if (interaction.customId === 'goodbye_btn_style') {
                const modal = new ModalBuilder().setCustomId('goodbye_modal_style').setTitle('Edit Hex Color & Footer');

                const colorInput = new TextInputBuilder()
                    .setCustomId('in_goodbye_color')
                    .setLabel('Hex Color Code (e.g. #7289DA)')
                    .setStyle(TextInputStyle.Short)
                    .setValue(isValidHex(settings.color) ? settings.color : '#7289DA')
                    .setRequired(true);

                const footerInput = new TextInputBuilder()
                    .setCustomId('in_goodbye_footer')
                    .setLabel('Footer Text')
                    .setStyle(TextInputStyle.Short)
                    .setValue((settings.footer && settings.footer !== 'undefined') ? settings.footer : 'We are now down to {count} members.')
                    .setRequired(false);

                modal.addComponents(new ActionRowBuilder().addComponents(colorInput), new ActionRowBuilder().addComponents(footerInput));
                return interaction.showModal(modal);
            }

            // EDIT PING/HEADER MODAL
            if (interaction.customId === 'goodbye_btn_ping') {
                const modal = new ModalBuilder().setCustomId('goodbye_modal_ping').setTitle('Edit Message Header');

                const pingInput = new TextInputBuilder()
                    .setCustomId('in_goodbye_ping')
                    .setLabel('Content Above Embed')
                    .setStyle(TextInputStyle.Short)
                    .setValue((settings.pingContent && settings.pingContent !== 'undefined') ? settings.pingContent : '👋 Farewell, **{username}**.')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(pingInput));
                return interaction.showModal(modal);
            }

            // TEST PREVIEW CARD HANDLER
            if (interaction.customId === 'goodbye_btn_preview') {
                try {
                    const latest = await GoodbyeSettings.findOne({ guildId: interaction.guildId }) || settings;
                    const member = interaction.member;

                    const pingMsg = replacePlaceholders(latest.pingContent, member);
                    const titleMsg = replacePlaceholders(latest.title, member);
                    const descMsg = replacePlaceholders(latest.description, member);
                    const footerMsg = replacePlaceholders(latest.footer, member);

                    const previewEmbed = new EmbedBuilder()
                        .setColor(isValidHex(latest.color) ? latest.color : '#7289DA')
                        .setTitle(titleMsg.slice(0, 256))
                        .setDescription(descMsg.slice(0, 4000))
                        .addFields(
                            { name: '👥 Member Census', value: `\`${member.guild.memberCount}\` members remaining`, inline: false }
                        )
                        .setTimestamp();

                    const imageUrl = cleanImageUrl(latest.image);
                    if (isValidUrl(imageUrl)) {
                        previewEmbed.setImage(imageUrl);
                    }

                    const thumbUrl = cleanImageUrl(latest.thumbnail);
                    if (latest.thumbnail === 'avatar') {
                        previewEmbed.setThumbnail(member.user.displayAvatarURL({ size: 256 }));
                    } else if (isValidUrl(thumbUrl)) {
                        previewEmbed.setThumbnail(thumbUrl);
                    }

                    if (footerMsg) {
                        previewEmbed.setFooter({ text: `${footerMsg} (Setup Preview)`.slice(0, 2048) });
                    }

                    return await interaction.reply({ 
                        content: `${pingMsg} *(Setup Preview)*`, 
                        embeds: [previewEmbed], 
                        ephemeral: true 
                    });
                } catch (err) {
                    return await interaction.reply({ 
                        content: `❌ **Preview Error:** \`${err.message}\``, 
                        ephemeral: true 
                    }).catch(() => {});
                }
            }

            // RESET TO DEFAULTS HANDLER
            if (interaction.customId === 'goodbye_btn_reset') {
                const lang = getGuildLanguageSync(interaction.guildId);
                const defs = getGoodbyeDefaults(lang, interaction.guild.name);
                await GoodbyeSettings.findOneAndUpdate(
                    { guildId: interaction.guildId },
                    defs,
                    { upsert: true }
                );
                await interaction.reply({ content: '🔄 **Goodbye embed visuality reset to defaults!**', ephemeral: true });
                const panelData = await getGoodbyeControlPanel(interaction.guildId, client);
                if (interaction.message && panelData) {
                    await interaction.message.edit(panelData).catch(() => {});
                }
                return;
            }
        }

        // ==========================================
        // 📝 MODAL SUBMISSION PROCESSORS
        // ==========================================
        if (interaction.isModalSubmit() && interaction.customId.startsWith('goodbye_modal_')) {
            const guildId = interaction.guildId;

            if (interaction.customId === 'goodbye_modal_text') {
                const title = interaction.fields.getTextInputValue('in_goodbye_title');
                const description = interaction.fields.getTextInputValue('in_goodbye_desc');
                await GoodbyeSettings.findOneAndUpdate({ guildId }, { title, description }, { upsert: true });
            }

            if (interaction.customId === 'goodbye_modal_media') {
                let imageRaw = interaction.fields.getTextInputValue('in_goodbye_image');
                let thumbnailRaw = interaction.fields.getTextInputValue('in_goodbye_thumb');
                
                let image = cleanImageUrl(imageRaw);
                let thumbnail = cleanImageUrl(thumbnailRaw);

                if (!isValidUrl(image)) {
                    image = 'https://media.tenor.com/images/99208a68b444b0593457a82b3d39575e/tenor.gif';
                }

                if (thumbnailRaw.trim().toLowerCase() === 'avatar') {
                    thumbnail = 'avatar';
                } else if (!isValidUrl(thumbnail)) {
                    thumbnail = 'avatar';
                }

                await GoodbyeSettings.findOneAndUpdate({ guildId }, { image, thumbnail }, { upsert: true });
            }

            if (interaction.customId === 'goodbye_modal_style') {
                let color = interaction.fields.getTextInputValue('in_goodbye_color');
                const footer = interaction.fields.getTextInputValue('in_goodbye_footer');
                if (!isValidHex(color)) color = '#7289DA';
                await GoodbyeSettings.findOneAndUpdate({ guildId }, { color, footer }, { upsert: true });
            }

            if (interaction.customId === 'goodbye_modal_ping') {
                const pingContent = interaction.fields.getTextInputValue('in_goodbye_ping');
                await GoodbyeSettings.findOneAndUpdate({ guildId }, { pingContent }, { upsert: true });
            }

            await interaction.reply({ content: '✅ **Goodbye Embed Visuality Updated!**', ephemeral: true });

            const panelData = await getGoodbyeControlPanel(guildId, client);
            if (interaction.message && panelData) {
                await interaction.message.edit(panelData).catch(() => {});
            }
        }
    });

    // ==========================================
    // 🚪 GUILD MEMBER REMOVE EVENT LISTENER
    // ==========================================
    client.on('guildMemberRemove', async (member) => {
        try {
            const config = await GoodbyeSettings.findOne({ guildId: member.guild.id });
            if (!config || !config.channelId || config.enabled === false) return;

            const channel = member.guild.channels.cache.get(config.channelId);
            if (!channel) return;

            const lang = getGuildLanguageSync(member.guild.id);
            const defs = getGoodbyeDefaults(lang, member.guild.name);

            const isDefaultPing = !config.pingContent || config.pingContent === 'undefined';
            const isDefaultTitle = !config.title || config.title === 'undefined';
            const isDefaultDesc = !config.description || config.description === 'undefined';
            const isDefaultFooter = !config.footer || config.footer === 'undefined';

            const pingRaw = isDefaultPing ? defs.pingContent : config.pingContent;
            const titleRaw = isDefaultTitle ? defs.title : config.title;
            const descRaw = isDefaultDesc ? defs.description : config.description;
            const footerRaw = isDefaultFooter ? defs.footer : config.footer;

            const pingMsg = replacePlaceholders(pingRaw, member);
            const titleMsg = replacePlaceholders(titleRaw, member);
            const descMsg = replacePlaceholders(descRaw, member);
            const footerMsg = replacePlaceholders(footerRaw, member);

            const aestheticEmbed = new EmbedBuilder()
                .setColor(isValidHex(config.color) ? config.color : '#7289DA')
                .setTitle(titleMsg.slice(0, 256))
                .setDescription(descMsg.slice(0, 4000))
                .addFields(
                    { name: '👥 Member Census', value: `\`${member.guild.memberCount}\` members remaining`, inline: false }
                )
                .setTimestamp();

            const imageUrl = cleanImageUrl(config.image);
            if (isValidUrl(imageUrl)) {
                aestheticEmbed.setImage(imageUrl);
            }

            const thumbUrl = cleanImageUrl(config.thumbnail);
            if (config.thumbnail === 'avatar' && member.user?.displayAvatarURL) {
                aestheticEmbed.setThumbnail(member.user.displayAvatarURL({ size: 256 }));
            } else if (isValidUrl(thumbUrl)) {
                aestheticEmbed.setThumbnail(thumbUrl);
            }

            if (footerMsg) {
                aestheticEmbed.setFooter({ text: footerMsg.slice(0, 2048) });
            }

            await channel.send({ content: pingMsg, embeds: [aestheticEmbed] }).catch(() => {});
        } catch (error) {
            console.error('[Goodbye Engine Error]:', error);
        }
    });
};

goodbyeModule.GoodbyeSettings = GoodbyeSettings;
goodbyeModule.setupGoodbyeData = setupGoodbyeCommand;
goodbyeModule.customizeGoodbyeData = customizeGoodbyeCommand;
goodbyeModule.getGoodbyeControlPanel = getGoodbyeControlPanel;
goodbyeModule.replacePlaceholders = replacePlaceholders;
module.exports = goodbyeModule;
