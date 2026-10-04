// ==========================================
// 📥 GLOBAL EMOJI & STICKER STEALER MODULE (PART 1 OF 2)
// File Path: modules/steal.js
// ==========================================
const { 
    PermissionsBitField, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType,
    MessageFlags
} = require('discord.js');

const EPHEMERAL_FLAG = MessageFlags ? MessageFlags.Ephemeral : 6;

const config = require('../config');
const { ONE_YEAR_MS } = require('../utils/contextHelper');

module.exports = (client) => {
    const PREFIX = config.DEFAULT_PREFIX || ',';

    const runStealUI = async (textToScan, stickers, member, guild, replyFunction, user) => {
        // 1. External / DM Context Check
        if (!guild) {
            return replyFunction({ 
                content: '❌ **Cannot upload emoji here:** You must run this command inside a server where Starry is present to upload stolen emojis/stickers!', 
                flags: [EPHEMERAL_FLAG] 
            });
        }

        // 2. Premium Lock
        if (typeof client.isPremium === 'function' && !client.isPremium(guild.id)) {
            return replyFunction({ 
                content: '❌ **Steal Emojis** is a Premium feature! Use `.premium` to learn how to upgrade your server.', 
                flags: [EPHEMERAL_FLAG] 
            });
        }

        // 3. Permissions Validation
        const managePerms = PermissionsBitField.Flags.ManageGuildExpressions || PermissionsBitField.Flags.ManageEmojisAndStickers;
        
        if (member && !member.permissions.has(managePerms)) {
            return replyFunction({ content: '❌ You need `Manage Emojis and Stickers` permission in this server.', flags: [EPHEMERAL_FLAG] });
        }

        const botMember = guild.members.me || await guild.members.fetch(client.user.id).catch(() => null);
        if (!botMember || !botMember.permissions.has(managePerms)) {
            return replyFunction({ content: '❌ I need `Manage Emojis and Stickers` permission in this server to upload emojis.', flags: [EPHEMERAL_FLAG] });
        }

        // 4. Extract Emojis and Stickers
        const itemsToSteal = [];
        if (stickers && stickers.size > 0) {
            stickers.forEach(sticker => itemsToSteal.push({ id: sticker.id, name: sticker.name, url: sticker.url, type: 'sticker' }));
        }

        if (textToScan) {
            const emojiRegex = /<(a?):([a-zA-Z0-9_]+):(\d+)>/g;
            let match;
            while ((match = emojiRegex.exec(textToScan)) !== null) {
                if (!itemsToSteal.find(item => item.id === match[3])) {
                    itemsToSteal.push({
                        id: match[3],
                        name: match[2],
                        url: `https://cdn.discordapp.com/emojis/${match[3]}.${match[1] === 'a' ? 'gif' : 'png'}`,
                        type: 'emoji'
                    });
                }
            }
        }

        if (itemsToSteal.length === 0) {
            return replyFunction({ content: '❌ No custom emojis or stickers were found in that message/text!', flags: [EPHEMERAL_FLAG] });
        }

        // 5. Build Interactive UI
        let currentIndex = 0;
        const generateEmbed = (index) => new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(`📥 Emoji/Sticker Stealer (${index + 1}/${itemsToSteal.length})`)
            .setDescription(`**Name:** \`${itemsToSteal[index].name}\`\n**Type:** \`${itemsToSteal[index].type.toUpperCase()}\``)
            .setImage(itemsToSteal[index].url)
            .setFooter({ text: `Target Server: ${guild.name}` });

        const generateButtons = (index) => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('steal_prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(index === 0),
            new ButtonBuilder().setCustomId('steal_add').setLabel('📥 Upload to Server').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('steal_next').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(index === itemsToSteal.length - 1)
        );

        const activeUser = member?.user || user;
        const replyMsg = await replyFunction({ embeds: [generateEmbed(0)], components: [generateButtons(0)], fetchReply: true });
        const collector = replyMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: ONE_YEAR_MS });

        collector.on('collect', async (i) => {
            if (i.user.id !== activeUser.id) {
                return i.reply({ content: '❌ You cannot control this session.', flags: [EPHEMERAL_FLAG] });
            }

            if (i.customId === 'steal_prev') { 
                currentIndex--; 
                await i.update({ embeds: [generateEmbed(currentIndex)], components: [generateButtons(currentIndex)] }); 
            } else if (i.customId === 'steal_next') { 
                currentIndex++; 
                await i.update({ embeds: [generateEmbed(currentIndex)], components: [generateButtons(currentIndex)] }); 
            } else if (i.customId === 'steal_add') {
                const item = itemsToSteal[currentIndex];
                try {
                    if (item.type === 'emoji') {
                        const createdEmoji = await guild.emojis.create({ attachment: item.url, name: item.name });
                        await i.reply({ content: `✅ Successfully uploaded emoji ${createdEmoji} (\`:${item.name}:\`) to **${guild.name}**!`, flags: [EPHEMERAL_FLAG] });
                    } else {
                        const createdSticker = await guild.stickers.create({ file: item.url, name: item.name, tags: 'stolen' });
                        await i.reply({ content: `✅ Successfully uploaded sticker **${createdSticker.name}** to **${guild.name}**!`, flags: [EPHEMERAL_FLAG] });
                    }
                } catch (e) { 
                    console.error('Steal Upload Error:', e);
                    await i.reply({ content: '❌ Upload failed: Server emoji/sticker slots are full or file size exceeds Discord limit.', flags: [EPHEMERAL_FLAG] }); 
                }
            }
        });
    };
    // Prefix Trigger (.steal) - Works in servers where bot is present
    client.on('messageCreate', async message => {
        if (message.author.bot || (!message.content.startsWith(PREFIX + 'steal') && !message.content.startsWith(',steal'))) return;
        if (!config.isBotOwner(message.author.id, client)) return;
        const target = message.reference ? await message.channel.messages.fetch(message.reference.messageId).catch(() => message) : message;
        await runStealUI(target.content + message.content, target.stickers, message.member, message.guild, (p) => message.reply(p), message.author);
    });

    // Interaction Listener (Slash Command & Context Menu) - Works EVERYWHERE via User App!
    client.on('interactionCreate', async interaction => {
        // Message Context Menu: Long press message -> Apps -> "Steal Emojis"
        if (interaction.isMessageContextMenuCommand() && interaction.commandName === 'Steal Emojis') {
            await runStealUI(
                interaction.targetMessage.content, 
                interaction.targetMessage.stickers, 
                interaction.member, 
                interaction.guild, 
                (p) => interaction.reply(p), 
                interaction.user
            );
        }

        // Slash Command: "/steal"
        if (interaction.isChatInputCommand() && interaction.commandName === 'steal') {
            await runStealUI(
                interaction.options.getString('emojis'), 
                null, 
                interaction.member, 
                interaction.guild, 
                (p) => interaction.reply(p), 
                interaction.user
            );
        }
    });
};
