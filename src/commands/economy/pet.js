const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
// const User = require('../../models/User'); // Uncomment when you connect your DB!

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pets')
        .setDescription('Open your Pet Menagerie and manage your companions.'),

    async execute(interaction, client) {
        await interaction.deferReply();

        // ==========================================
        // 🛠️ UTILITY: VISUAL PROGRESS BARS
        // ==========================================
        const generateProgressBar = (current, max, length = 10) => {
            const progress = Math.round((current / max) * length);
            const emptyProgress = length - progress;
            const progressText = '▰'.repeat(progress);
            const emptyProgressText = '▱'.repeat(emptyProgress);
            const percentage = Math.round((current / max) * 100);
            return `\`${progressText}${emptyProgressText}\` **${percentage}%**`;
        };

        // ==========================================
        // 🎲 MOCK DB DATA (Replace with your database)
        // ==========================================
        // Imagine fetching this from: await User.findOne({ userId: interaction.user.id })
        const activePet = {
            name: 'Glacier Bear',
            species: 'Polar Bear',
            rarity: 'Uncommon',
            color: '#2ecc71', // Uncommon Green
            image: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f43b.png', // Reliable high-res pet icon
            lore: 'Fur as dense and blue as ancient glacial ice. A fiercely loyal companion in the frozen wastes.',
            level: 0,
            xp: 0,
            maxXp: 5,
            hunger: 100,
            maxHunger: 100,
            happiness: 100,
            maxHappiness: 100,
            stats: { hp: 50, atk: 10, def: 8, spd: 6 },
            skills: 'None unlocked yet.',
            nextSkill: 'Snarling Lunge (Lv. 10)'
        };

        const totalPets = 1;

        if (!activePet) {
            return interaction.editReply('🐾 You do not have any pets yet! Visit the `/shop` to adopt one.');
        }

        // ==========================================
        // ✨ THE PREMIUM UI EMBED
        // ==========================================
        const petEmbed = new EmbedBuilder()
            .setColor(activePet.color)
            .setAuthor({ 
                name: `${interaction.user.username}'s Pet Menagerie (1/${totalPets} Pets)`, 
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
            })
            .setTitle(`🐾 ${activePet.name} — *${activePet.species}*`)
            .setDescription(`> *${activePet.lore}*`)
            .setThumbnail(activePet.image)
            .addFields(
                { 
                    name: '📊 **Vitals & Progression**', 
                    value: 
                    `**🌟 Level:** \`${activePet.level}\`\n` +
                    `**✨ Exper:** ${generateProgressBar(activePet.xp, activePet.maxXp)} *(${activePet.xp}/${activePet.maxXp} XP)*\n` +
                    `**🍖 Food:** ${generateProgressBar(activePet.hunger, activePet.maxHunger)}\n` +
                    `**💖 Mood:** ${generateProgressBar(activePet.happiness, activePet.maxHappiness)}`,
                    inline: false 
                },
                { 
                    name: '⚔️ **Combat Matrix**', 
                    // Using a YAML codeblock creates a beautiful, clean alignment grid
                    value: `\`\`\`yaml\n❤️ HP  : ${activePet.stats.hp.toString().padEnd(4)} |  🛡️ DEF : ${activePet.stats.def}\n⚔️ ATK : ${activePet.stats.atk.toString().padEnd(4)} |  💨 SPD : ${activePet.stats.spd}\n\`\`\``, 
                    inline: false 
                },
                { 
                    name: '🎯 **Abilities**', 
                    value: 
                    `**Active:** *${activePet.skills}*\n` +
                    `**Unlocks:** \`${activePet.nextSkill}\``, 
                    inline: false 
                }
            )
            .setFooter({ text: `Rarity: ${activePet.rarity} • Starry Pet Engine`, iconURL: client.user.displayAvatarURL() });

        // ==========================================
        // 🎛️ ACTION BUTTONS
        // ==========================================
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('pet_feed')
                .setLabel('Feed (46¢)')
                .setEmoji('🍖')
                .setStyle(ButtonStyle.Success), // Green
            new ButtonBuilder()
                .setCustomId('pet_play')
                .setLabel('Play')
                .setEmoji('🎾')
                .setStyle(ButtonStyle.Primary), // Blue
            new ButtonBuilder()
                .setCustomId('pet_rename')
                .setLabel('Rename')
                .setEmoji('🏷️')
                .setStyle(ButtonStyle.Secondary), // Gray
            new ButtonBuilder()
                .setCustomId('pet_unequip')
                .setLabel('Unequip')
                .setEmoji('⭐')
                .setStyle(ButtonStyle.Danger) // Red
        );

        return interaction.editReply({ embeds: [petEmbed], components: [row] });
    }
};
