const { 
    EmbedBuilder, 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    PermissionFlagsBits 
} = require('discord.js');

const afkCollection = new Map();
const config = require('../config');
const PREFIX = config.DEFAULT_PREFIX || ','; 

// ==========================================
// 0. SLASH COMMAND BUILDER PAYLOAD (/afk)
// ==========================================
const afkSlashCommand = new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Manage your AFK status for this server.')
    .setContexts([0])
    .addSubcommand(sub =>
        sub.setName('set')
            .setDescription('Set your AFK status')
            .addStringOption(option =>
                option.setName('reason')
                    .setDescription('Reason for going AFK')
                    .setRequired(false)
            )
    )
    .addSubcommand(sub =>
        sub.setName('clear')
            .setDescription('Clear AFK status for yourself or another user')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('User to clear AFK for (Mods/Admins only)')
                    .setRequired(false)
            )
            .addBooleanOption(option =>
                option.setName('all')
                    .setDescription('Clear AFK status for all server members (Admins only)')
                    .setRequired(false)
            )
    )
    .addSubcommand(sub =>
        sub.setName('list')
            .setDescription('List all members currently AFK in this server')
    )
    .addSubcommand(sub =>
        sub.setName('status')
            .setDescription('Check the AFK status and duration of a member')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('Member to check status for (defaults to self)')
                    .setRequired(false)
            )
    );

module.exports = (client) => {

    // ==========================================
    // 1. DYNAMIC SLASH COMMAND EXECUTION
    // ==========================================
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand() || interaction.commandName !== 'afk') return;

        const guildId = interaction.guildId;
        const user = interaction.user;
        const member = interaction.member;

        const subcommand = interaction.options.getSubcommand();

        // --- SUBCOMMAND: SET ---
        if (subcommand === 'set') {
            const reason = interaction.options.getString('reason') || 'AFK';
            const afkKey = `${guildId}-${user.id}`;

            afkCollection.set(afkKey, { reason: reason, time: Date.now(), messages: [], notifyOnReturn: [] });

            const embed = new EmbedBuilder()
                .setColor('#EC407A') 
                .setAuthor({ name: member?.displayName || user.username })
                .setDescription(`**AFK status set.**\n\n**Reason:** ${reason}`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
                .setFooter({ text: 'I will notify those who mention you. >w<' });

            return interaction.reply({ content: `<@${user.id}>`, embeds: [embed] }).catch(() => {});
        }

        // --- SUBCOMMAND: CLEAR ---
        if (subcommand === 'clear') {
            const clearAll = interaction.options.getBoolean('all');
            const targetUser = interaction.options.getUser('user');

            if (clearAll) {
                if (!member.permissions.has(PermissionFlagsBits.Administrator) && !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                    return interaction.reply({ content: '❌ You need **Manage Server** permissions to clear all AFK statuses.', ephemeral: true });
                }

                let clearedCount = 0;
                for (const [key] of afkCollection.entries()) {
                    if (key.startsWith(`${guildId}-`)) {
                        afkCollection.delete(key);
                        clearedCount++;
                    }
                }
                return interaction.reply({ content: `✅ Cleared **${clearedCount}** AFK status(es) across the server.` });
            }

            if (targetUser && targetUser.id !== user.id) {
                if (!member.permissions.has(PermissionFlagsBits.ManageMessages) && !member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    return interaction.reply({ content: '❌ You need **Manage Messages** permissions to clear someone else\'s AFK status.', ephemeral: true });
                }

                const targetKey = `${guildId}-${targetUser.id}`;
                if (!afkCollection.has(targetKey)) {
                    return interaction.reply({ content: `❌ **${targetUser.username}** is not currently AFK.`, ephemeral: true });
                }

                afkCollection.delete(targetKey);
                return interaction.reply({ content: `✅ Cleared AFK status for **${targetUser.username}**.` });
            }

            const afkKey = `${guildId}-${user.id}`;
            if (!afkCollection.has(afkKey)) {
                return interaction.reply({ content: '❌ You are not currently AFK.', ephemeral: true });
            }

            afkCollection.delete(afkKey);
            return interaction.reply({ content: '✅ Your AFK status has been cleared.' });
        }

        // --- SUBCOMMAND: LIST ---
        if (subcommand === 'list') {
            const afkEntries = [];
            for (const [key, data] of afkCollection.entries()) {
                if (key.startsWith(`${guildId}-`)) {
                    const userId = key.split('-')[1];
                    afkEntries.push(`• <@${userId}>: ${data.reason} - <t:${Math.floor(data.time / 1000)}:R>`);
                }
            }

            if (afkEntries.length === 0) {
                return interaction.reply({ content: 'ℹ️ There are no members currently AFK in this server.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor('#EC407A')
                .setTitle(`📋 AFK Members in ${interaction.guild.name} (${afkEntries.length})`)
                .setDescription(afkEntries.join('\n'))
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // --- SUBCOMMAND: STATUS ---
        if (subcommand === 'status') {
            const targetUser = interaction.options.getUser('user') || user;
            const targetKey = `${guildId}-${targetUser.id}`;

            if (!afkCollection.has(targetKey)) {
                return interaction.reply({ content: `ℹ️ **${targetUser.username}** is not currently AFK.`, ephemeral: true });
            }

            const data = afkCollection.get(targetKey);
            const timeAgo = Math.floor(data.time / 1000);

            const embed = new EmbedBuilder()
                .setColor('#EC407A')
                .setAuthor({ name: targetUser.username, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
                .setTitle('💤 AFK Status Details')
                .addFields(
                    { name: 'Reason', value: data.reason, inline: true },
                    { name: 'Since', value: `<t:${timeAgo}:R>`, inline: true },
                    { name: 'Saved Messages', value: `\`${data.messages.length}\``, inline: true },
                    { name: 'Users To Notify', value: `\`${data.notifyOnReturn.length}\``, inline: true }
                );

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    });

    // ==========================================
    // 2. HANDLE PREFIX (.afk) AND MESSAGE TRACKING
    // ==========================================
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.guild) return;

        const authorKey = `${message.guild.id}-${message.author.id}`;

        // --- A. THE PREFIX COMMAND (.afk) ---
        const { getGuildPrefix } = require('./commandHandler');
        const activePrefix = await getGuildPrefix(message.guild.id);
        const isAfkCmd = Boolean(activePrefix && message.content.toLowerCase().startsWith(activePrefix.toLowerCase() + 'afk'));

        if (isAfkCmd) {
            if (!config.isBotOwner(message.author.id, client)) return;
            const prefixUsed = activePrefix;
            const rawArgs = message.content.slice(prefixUsed.length + 3).trim();
            const argsArr = rawArgs.split(/\s+/);
            const subArg = argsArr[0]?.toLowerCase();

            if (subArg === 'clear' || subArg === 'remove') {
                const isAll = argsArr[1]?.toLowerCase() === 'all';
                const targetUser = message.mentions.users.first();

                if (isAll) {
                    if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                        return message.reply('❌ You need **Manage Server** permissions to clear all AFK statuses.');
                    }
                    let count = 0;
                    for (const [key] of afkCollection.entries()) {
                        if (key.startsWith(`${message.guild.id}-`)) {
                            afkCollection.delete(key);
                            count++;
                        }
                    }
                    return message.reply(`✅ Cleared **${count}** AFK status(es) across the server.`);
                }

                if (targetUser && targetUser.id !== message.author.id) {
                    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages) && !message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                        return message.reply('❌ You need **Manage Messages** permissions to clear someone else\'s AFK status.');
                    }
                    const targetKey = `${message.guild.id}-${targetUser.id}`;
                    if (!afkCollection.has(targetKey)) return message.reply(`❌ **${targetUser.username}** is not currently AFK.`);
                    afkCollection.delete(targetKey);
                    return message.reply(`✅ Cleared AFK status for **${targetUser.username}**.`);
                }

                if (!afkCollection.has(authorKey)) return message.reply('❌ You are not currently AFK.');
                afkCollection.delete(authorKey);
                return message.reply('✅ Your AFK status has been cleared.');
            }

            if (subArg === 'list') {
                const afkEntries = [];
                for (const [key, data] of afkCollection.entries()) {
                    if (key.startsWith(`${message.guild.id}-`)) {
                        const userId = key.split('-')[1];
                        afkEntries.push(`• <@${userId}>: ${data.reason} - <t:${Math.floor(data.time / 1000)}:R>`);
                    }
                }

                if (afkEntries.length === 0) return message.reply('ℹ️ There are no members currently AFK in this server.');

                const embed = new EmbedBuilder()
                    .setColor('#EC407A')
                    .setTitle(`📋 AFK Members in ${message.guild.name} (${afkEntries.length})`)
                    .setDescription(afkEntries.join('\n'))
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            if (subArg === 'status' || subArg === 'info') {
                const targetUser = message.mentions.users.first() || message.author;
                const targetKey = `${message.guild.id}-${targetUser.id}`;

                if (!afkCollection.has(targetKey)) return message.reply(`ℹ️ **${targetUser.username}** is not currently AFK.`);

                const data = afkCollection.get(targetKey);
                const timeAgo = Math.floor(data.time / 1000);

                const embed = new EmbedBuilder()
                    .setColor('#EC407A')
                    .setAuthor({ name: targetUser.username, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
                    .setTitle('💤 AFK Status Details')
                    .addFields(
                        { name: 'Reason', value: data.reason, inline: true },
                        { name: 'Since', value: `<t:${timeAgo}:R>`, inline: true },
                        { name: 'Saved Messages', value: `\`${data.messages.length}\``, inline: true },
                        { name: 'Users To Notify', value: `\`${data.notifyOnReturn.length}\``, inline: true }
                    );

                return message.reply({ embeds: [embed] });
            }

            let reason = rawArgs;
            if (subArg === 'set') {
                reason = argsArr.slice(1).join(' ');
            }
            if (!reason) reason = 'AFK';

            afkCollection.set(authorKey, { reason: reason, time: Date.now(), messages: [], notifyOnReturn: [] });

            const embed = new EmbedBuilder()
                .setColor('#EC407A')
                .setAuthor({ name: message.member?.displayName || message.author.username })
                .setDescription(`**AFK status set.**\n\n**Reason:** ${reason}`)
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
                .setFooter({ text: 'I will notify those who mention you. >w<' });

            const reply = await message.reply({ content: `<@${message.author.id}>`, embeds: [embed] }).catch(() => {});

            if (reply) setTimeout(() => reply.delete().catch(() => {}), 5000);
            return;
        }

        // --- B. REMOVE AFK WHEN THEY TALK ---
        if (afkCollection.has(authorKey)) {
            const afkData = afkCollection.get(authorKey);
            
            if (Date.now() - afkData.time > 3000) {
                afkCollection.delete(authorKey);
                
                let welcomeText = `**Welcome back!**\n\nI have removed your AFK status.`;
                
                if (afkData.messages.length > 0) {
                    welcomeText += `\n\n📥 **You received ${afkData.messages.length} message(s) while away:**\n`;
                    afkData.messages.forEach(msg => {
                        welcomeText += `> **<@${msg.author}>:** ${msg.text}\n`;
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor('#2ECC71') 
                    .setAuthor({ name: message.member?.displayName || message.author.username })
                    .setDescription(welcomeText)
                    .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }));
                
                const welcomeBack = await message.channel.send({ content: `<@${message.author.id}>`, embeds: [embed] }).catch(() => {});
                
                if (afkData.notifyOnReturn.length > 0) {
                    const pings = afkData.notifyOnReturn.map(id => `<@${id}>`).join(' ');
                    await message.channel.send(`🔔 ${pings} — **${message.author.username}** is back!`).catch(() => {});
                }

                if (welcomeBack) setTimeout(() => welcomeBack.delete().catch(() => {}), 15000);
            }
        }

        // --- C. WARN USERS WHO PING THEM ---
        const targets = new Set(message.mentions.users.values());
        if (message.mentions.repliedUser) targets.add(message.mentions.repliedUser);

        if (targets.size > 0) {
            targets.forEach(user => {
                const mentionedKey = `${message.guild.id}-${user.id}`;

                if (afkCollection.has(mentionedKey)) {
                    const data = afkCollection.get(mentionedKey);
                    const timeAgo = Math.floor(data.time / 1000);

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`afk_msg_${user.id}`)
                            .setLabel('Leave a message')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`afk_ntf_${user.id}`)
                            .setLabel('Tell me when they are back')
                            .setStyle(ButtonStyle.Secondary)
                    );

                    message.reply({ 
                        content: `\`${user.username}\` is AFK: ${data.reason} - <t:${timeAgo}:R>`, 
                        components: [row] 
                    }).catch(() => {});
                }
            });
        }
    });

    // ==========================================
    // 3. HANDLE AFK BUTTONS & MODALS
    // ==========================================
    client.on('interactionCreate', async (interaction) => {
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('afk_msg_')) {
                const targetId = interaction.customId.split('_')[2];
                const afkKey = `${interaction.guildId}-${targetId}`;
                
                if (!afkCollection.has(afkKey)) return interaction.reply({ content: '❌ This user is no longer AFK.', ephemeral: true });

                const modal = new ModalBuilder()
                    .setCustomId(`afk_modal_${targetId}`)
                    .setTitle('Leave a Message');

                const messageInput = new TextInputBuilder()
                    .setCustomId('afk_input')
                    .setLabel("What do you want to tell them?")
                    .setStyle(TextInputStyle.Paragraph)
                    .setMaxLength(500)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(messageInput));
                await interaction.showModal(modal);
            }

            if (interaction.customId.startsWith('afk_ntf_')) {
                const targetId = interaction.customId.split('_')[2];
                const afkKey = `${interaction.guildId}-${targetId}`;
                const data = afkCollection.get(afkKey);
                
                if (!data) return interaction.reply({ content: '❌ This user is no longer AFK.', ephemeral: true });

                if (!data.notifyOnReturn.includes(interaction.user.id)) {
                    data.notifyOnReturn.push(interaction.user.id);
                }

                await interaction.reply({ content: `✅ I will ping you the moment they type a message!`, ephemeral: true });
            }
        }

        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('afk_modal_')) {
                const targetId = interaction.customId.split('_')[2];
                const afkKey = `${interaction.guildId}-${targetId}`;
                const data = afkCollection.get(afkKey);
                
                if (!data) return interaction.reply({ content: '❌ This user is no longer AFK. They might have just returned!', ephemeral: true });

                const messageText = interaction.fields.getTextInputValue('afk_input');
                data.messages.push({ author: interaction.user.id, text: messageText });

                await interaction.reply({ content: `✅ I saved your message. I'll deliver it to them when they get back!`, ephemeral: true });
            }
        }
    });
};

module.exports.afkPayload = afkSlashCommand.toJSON();
