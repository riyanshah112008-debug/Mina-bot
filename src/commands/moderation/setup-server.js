const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-server')
        .setDescription('Builds the FULL massive server layout safely over 5 minutes. (Unbreakable Version)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('🏗️ Full Server Auto-Builder')
            .setDescription(
                '**WARNING: This will generate over 75 channels, 15 categories, and a full Role Hierarchy!**\n\n' +
                'To protect the bot from Discord API rate limits, Starry will build this slowly in the background.\n\n' +
                '⏳ **Estimated Time:** ~5 minutes.\n' +
                'Do you want to proceed?'
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('build_confirm').setLabel('Yes, Build It!').setStyle(ButtonStyle.Success).setEmoji('🔨'),
            new ButtonBuilder().setCustomId('build_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );

        const response = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

        const filter = i => i.user.id === interaction.user.id;
        try {
            const confirmation = await response.awaitMessageComponent({ filter, time: 60000 });

            if (confirmation.customId === 'build_cancel') {
                return confirmation.update({ content: '🚫 Server build canceled.', embeds: [], components: [] });
            }

            await confirmation.update({ 
                content: '⏳ **Building your server in the background!**\n\nStarry is creating your Roles and Channels now. Do not run this command again while it is working!', 
                embeds: [], 
                components: [] 
            });
            
            const guild = interaction.guild;

            // ==========================================
            // 1. CREATE ROLES (With error protection)
            // ==========================================
            let adminRole, modRole, vipRole;
            try {
                adminRole = await guild.roles.create({ name: '👑 Admin', color: '#ff0000', permissions: [PermissionFlagsBits.Administrator], hoist: true });
                await delay(2000);
                modRole = await guild.roles.create({ name: '🛡️ Moderator', color: '#3498db', permissions: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers, PermissionFlagsBits.ModerateMembers], hoist: true });
                await delay(2000);
                vipRole = await guild.roles.create({ name: '💎 VIP', color: '#f1c40f', hoist: true });
                await delay(2000);
                await guild.roles.create({ name: '⭐ Member', color: '#2ecc71', hoist: true });
                await delay(2000);
                await guild.roles.create({ name: '🤖 Bots', color: '#95a5a6', hoist: true });
                await delay(2000);
            } catch (err) {
                console.log("Error creating a role, moving on:", err.message);
            }

            // Fallbacks in case role creation failed so the channels still build
            if (!adminRole) adminRole = guild.roles.highest;
            if (!modRole) modRole = guild.roles.highest;
            if (!vipRole) vipRole = guild.roles.highest;

            // ==========================================
            // 2. DEFINE THE MASSIVE LAYOUT
            // ==========================================
            const layout = [
                { name: '🛠️ STAFF', type: 'private', channels: ['📄-staff-rules', '💬-staff-chat', '💭-staff-plus', '🤔-hire', '💡-ideas', '🗃️-proofs', '🏛️-appeals', '🚨-emergency', '🧪-testing', '🧪-froozze-testing', '📓-docs'] },
                { name: '📝 APPLICATIONS', type: 'private', channels: [] },
                { name: '🗂️ LOGS', type: 'private', channels: ['📄-logs-server', '📄-logs-access', '📄-logs-moderate', '📄-logs-messages', '📄-logs-channels', '📄-logs-voice', '📄-logs-members', '📄-logs-roles', '📄-logs-misc'] },
                { name: '❓ OPENED TICKETS', type: 'private', channels: [] },
                { name: '❓ CLOSED TICKETS', type: 'private', channels: [] },
                { name: '📢 INFOR', type: 'read-only', channels: ['📢-announcements', '📝-applications', '📱-social-networks', '❓-about-us', '📜-rules', '🚀-boosters', '🤝-invites'] },
                { name: '🏁 START HERE', type: 'read-only', channels: ['❄️-welcome', '🛡️-verification', '👋-intros'] },
                { name: '💬 COMMUNITY', type: 'public', channels: ['💬-general', '☕-cafe-chat', '🌎-international', '🛡️-secure-chat', '🗣️-ask-to-dev', '🖼️-quotes', '❓-support', '💡-suggestions', '👀-confessions', '🎂-birthday', '⭐-starboard', '🎲-spam'] },
                { name: '💎 VIP', type: 'vip-only', channels: ['💎-vip-lounge', '📸-vip-media'] },
                { name: '🎉 EVENTS & REWARDS', type: 'public', channels: [] },
                { name: '🎨 HOBBIES', type: 'public', channels: ['📄-ads', '🌸-blossom', '🏠-home-bound-crew', '🎨-art', '🖼️-gfx', '🍕-food', '🐾-pets', '🚗-peto-auto', '📕-mangas', '🤖-mangas-auto', '💻-computers', '🎮-gaming', '🎵-music', '🎬-medias', '📝-the-inkwell', '🎬-movies', '📸-photos', '🤳-selfies'] },
                { name: '🌍 GLOBAL YUID', type: 'public', channels: [] },
                { name: '🤖 FUN BOTS', type: 'public', channels: [] },
                { name: '🧠 AI BOTS', type: 'public', channels: [] },
                { name: '⭐ STARS', type: 'public', channels: [] }
            ];

            let staffChatId = null;

            // ==========================================
            // 3. UNBREAKABLE BACKGROUND BUILDER
            // ==========================================
            for (const categoryData of layout) {
                let category;
                try {
                    let overwrites = [];
                    if (categoryData.type === 'private') {
                        overwrites = [
                            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, 
                            { id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                            { id: modRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                        ];
                    } else if (categoryData.type === 'read-only') {
                        overwrites = [
                            { id: guild.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] },
                            { id: adminRole.id, allow: [PermissionFlagsBits.SendMessages] },
                            { id: modRole.id, allow: [PermissionFlagsBits.SendMessages] }
                        ];
                    } else if (categoryData.type === 'vip-only') {
                        overwrites = [
                            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                            { id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                            { id: vipRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                        ];
                    } else if (categoryData.type === 'public') {
                        overwrites = [{ id: guild.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }];
                    }

                    category = await guild.channels.create({
                        name: categoryData.name,
                        type: ChannelType.GuildCategory,
                        permissionOverwrites: overwrites
                    });
                    await delay(3500); // 3.5 seconds
                } catch (err) {
                    console.log(`[Builder] Skipping category ${categoryData.name} due to error:`, err.message);
                    continue; // Skip to the next category if this one fails!
                }

                for (const channelName of categoryData.channels) {
                    try {
                        const newChannel = await guild.channels.create({
                            name: channelName,
                            type: ChannelType.GuildText,
                            parent: category.id
                        });

                        if (channelName === '💬-staff-chat') staffChatId = newChannel.id;
                        await delay(3500); // 3.5 seconds
                    } catch (err) {
                        console.log(`[Builder] Skipping channel ${channelName} due to error:`, err.message);
                        // Doesn't break the loop, just moves to the next channel!
                    }
                }
            }

            // ==========================================
            // 4. CREATE VOICE CATEGORY
            // ==========================================
            try {
                const voiceCategory = await guild.channels.create({ name: '🎙️ VOICE', type: ChannelType.GuildCategory });
                await delay(3500);

                const voiceChannels = [
                    { name: '🎤-no-mic', type: ChannelType.GuildText },
                    { name: '📱-vc-control', type: ChannelType.GuildText },
                    { name: '🗣️ General', type: ChannelType.GuildVoice },
                    { name: '➕ Duo (2)', type: ChannelType.GuildVoice, limit: 2 },
                    { name: '➕ Trio (3)', type: ChannelType.GuildVoice, limit: 3 }
                ];

                for (const vChannel of voiceChannels) {
                    try {
                        await guild.channels.create({
                            name: vChannel.name,
                            type: vChannel.type,
                            parent: voiceCategory.id,
                            userLimit: vChannel.limit || 0
                        });
                        await delay(3500);
                    } catch (err) { console.log(`[Builder] Skipping VC ${vChannel.name}`); }
                }
            } catch (err) { console.log("[Builder] Failed to create Voice category."); }

            // ==========================================
            // 5. SUCCESS PING
            // ==========================================
            if (staffChatId) {
                const staffChannel = guild.channels.cache.get(staffChatId);
                if (staffChannel) {
                    const successEmbed = new EmbedBuilder()
                        .setColor('#2ecc71')
                        .setTitle('✅ Massive Server Build Complete!')
                        .setDescription(`Starry has successfully finished generating the entire server layout!\n\n**Action Required:** Go to your Server Settings -> Roles, and give yourself the new **👑 Admin** role so you can see all the private categories!`)
                        .setFooter({ text: 'Starry Auto-Builder', iconURL: client.user.displayAvatarURL() });
                    
                    await staffChannel.send({ content: `<@${interaction.user.id}>`, embeds: [successEmbed] });
                }
            }

        } catch (e) {
            console.error('Builder Major Error:', e);
            try {
                await interaction.followUp({ content: '⚠️ The setup button timed out or a major error occurred.', ephemeral: true });
            } catch (err) {}
        }
    }
};
