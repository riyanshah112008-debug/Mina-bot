const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const User = require('../../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chest')
        .setDescription('Economy Chest System')
        .addSubcommand(sub =>
            sub.setName('claim')
            .setDescription('Claim your timed loot chest for free XP and Credits! (2 Hour Cooldown)')
        )
        .addSubcommand(sub =>
            sub.setName('drop')
            .setDescription('Manually drops a wild loot chest in the current channel (Admins Only)')
        ),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        // ==========================================
        // 🎲 HELPER: RARITY & LOOT GENERATOR
        // ==========================================
        // We put this in a function so BOTH subcommands can use it!
        const generateLoot = (prestigeLevel) => {
            const rarities = [
                { name: 'Common', color: '#95a5a6', minXp: 100, maxXp: 300, minCred: 20, maxCred: 50, img: 'https://cdn-icons-png.flaticon.com/512/2852/2852825.png', chance: 50 },
                { name: 'Uncommon', color: '#2ecc71', minXp: 300, maxXp: 800, minCred: 50, maxCred: 120, img: 'https://cdn-icons-png.flaticon.com/512/2852/2852825.png', chance: 30 },
                { name: 'Rare', color: '#3498db', minXp: 800, maxXp: 1800, minCred: 120, maxCred: 250, img: 'https://cdn-icons-png.flaticon.com/512/2852/2852825.png', chance: 13 },
                { name: 'Epic', color: '#9b59b6', minXp: 1800, maxXp: 3500, minCred: 250, maxCred: 500, img: 'https://cdn-icons-png.flaticon.com/512/2852/2852825.png', chance: 5 },
                { name: 'Legendary', color: '#f1c40f', minXp: 3500, maxXp: 7000, minCred: 500, maxCred: 1200, img: 'https://cdn-icons-png.flaticon.com/512/2852/2852825.png', chance: 2 }
            ];

            const roll = Math.random() * 100;
            let cumulative = 0;
            let selectedRarity = rarities[0];

            for (const r of rarities) {
                cumulative += r.chance;
                if (roll <= cumulative) {
                    selectedRarity = r;
                    break;
                }
            }

            const prestige = prestigeLevel || 0;
            const prestigeBonus = 1 + (prestige * 0.15); // +15% per Prestige
            const rawXp = Math.floor(Math.random() * (selectedRarity.maxXp - selectedRarity.minXp + 1)) + selectedRarity.minXp;
            const rawCred = Math.floor(Math.random() * (selectedRarity.maxCred - selectedRarity.minCred + 1)) + selectedRarity.minCred;

            return {
                rarity: selectedRarity,
                finalXp: Math.floor(rawXp * prestigeBonus),
                finalCred: Math.floor(rawCred * prestigeBonus),
                prestige: prestige
            };
        };

        // ==========================================
        // 🎁 SUBCOMMAND: /CHEST CLAIM (Personal)
        // ==========================================
        if (subcommand === 'claim') {
            await interaction.deferReply();

            const userId = interaction.user.id;
            const guildId = interaction.guild.id;

            let userData = await User.findOne({ userId, guildId });
            if (!userData) userData = new User({ userId, guildId });

            // Cooldown check (2 Hours)
            const cooldown = 2 * 60 * 60 * 1000;
            if (userData.lastChestClaim && (Date.now() - userData.lastChestClaim < cooldown)) {
                const remaining = cooldown - (Date.now() - userData.lastChestClaim);
                const minutes = Math.floor(remaining / 60000);
                return interaction.editReply(`⏳ You must wait **${minutes} minutes** before claiming another chest!`);
            }

            // Generate Loot & Save
            const loot = generateLoot(userData.prestige);
            userData.xp += loot.finalXp;
            userData.credits += loot.finalCred;
            userData.lastChestClaim = new Date();
            await userData.save();

            const embed = new EmbedBuilder()
                .setColor(loot.rarity.color)
                .setThumbnail(loot.rarity.img)
                .setTitle(`💰 ${loot.rarity.name} Chest Claimed!`)
                .setDescription(
                    `<@${userId}> claimed the ${loot.rarity.name.toLowerCase()} chest!\n` +
                    `✨ **${loot.finalXp.toLocaleString()} XP!**\n` +
                    `💳 **+${loot.finalCred.toLocaleString()} Credits** ${loot.prestige > 0 ? `*(👑 +${loot.prestige * 15}% Prestige Bonus)*` : ''}\n\n` +
                    `🛍️ *Spend your credits in the **/shop** for exclusive roles and pets!* 🛍️`
                )
                .setFooter({ text: 'Starry Loot Engine', iconURL: client.user.displayAvatarURL() });

            return interaction.editReply({ embeds: [embed] });
        }

        // ==========================================
        // 🧨 SUBCOMMAND: /CHEST DROP (Admin Wild Chest)
        // ==========================================
        if (subcommand === 'drop') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ You need Admin permissions to drop wild chests!', ephemeral: true });
            }

            // 1. Calculate exactly 5 minutes from right now
            const expiryTimestamp = Math.floor(Date.now() / 1000) + 300; 

            const spawnEmbed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setTitle('🎁 A wild Loot Chest appeared!')
                .setDescription(
                    'Be the first to click the key below to claim its contents!\n\n' +
                    `⏳ **Expires:** <t:${expiryTimestamp}:R>` // Native Discord countdown
                )
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/2852/2852825.png');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_wild_chest').setEmoji('🗝️').setStyle(ButtonStyle.Success)
            );

            // Hide the command reply, send the chest into the channel normally
            await interaction.reply({ content: '✅ Wild chest deployed successfully!', ephemeral: true });
            const chestMessage = await interaction.channel.send({ embeds: [spawnEmbed], components: [row] });

            // Listen for clicks with high 1-year interaction timing
            const collector = chestMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 2147483647 });

            collector.on('collect', async (i) => {
                // 🛑 DEFER IMMEDIATELY to prevent "Interaction Failed"
                await i.deferUpdate().catch(() => {});

                const clickerId = i.user.id;
                const guildId = interaction.guild.id;

                // Fetch or create DB for the person who clicked it
                let clickerData = await User.findOne({ userId: clickerId, guildId: guildId });
                if (!clickerData) clickerData = new User({ userId: clickerId, guildId: guildId });

                // Generate Loot & Save
                const loot = generateLoot(clickerData.prestige);
                clickerData.xp += loot.finalXp;
                clickerData.credits += loot.finalCred;
                await clickerData.save();

                // Build the Big Claimed Embed
                const claimedEmbed = new EmbedBuilder()
                    .setColor(loot.rarity.color)
                    .setTitle(`💰 ${loot.rarity.name} Wild Chest Claimed!`)
                    .setDescription(
                        `<@${clickerId}> claimed the wild chest!\n` +
                        `✨ **${loot.finalXp.toLocaleString()} XP!**\n` +
                        `💳 **+${loot.finalCred.toLocaleString()} Credits** ${loot.prestige > 0 ? `*(👑 +${loot.prestige * 15}% Prestige Bonus)*` : ''}\n\n` +
                        `🛍️ *Spend your credits in the **/shop** for exclusive roles and pets!* 🛍️`
                    )
                    .setThumbnail(loot.rarity.img)
                    .setFooter({ text: 'Starry Loot Engine', iconURL: client.user.displayAvatarURL() });

                // Overwrite the message, remove the key button
                await chestMessage.edit({ embeds: [claimedEmbed], components: [] }).catch(() => {});

                // Stop the timer
                collector.stop('claimed');
            });

            // Handle timeout
            collector.on('end', async (collected, reason) => {
                if (reason === 'time') {
                    const expiredEmbed = new EmbedBuilder()
                        .setColor('#808080')
                        .setTitle('💨 The Loot Chest vanished!')
                        .setDescription('Time ran out! Nobody claimed the chest fast enough.')
                        .setThumbnail('https://cdn-icons-png.flaticon.com/512/2852/2852825.png');
                    
                    await chestMessage.edit({ embeds: [expiredEmbed], components: [] }).catch(() => {});
                }
            });
        }
    }
};
