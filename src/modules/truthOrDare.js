const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = (client) => {
    // Content Pools
    const premiumTruths = ["What's your darkest secret?", "What's the most shameful thing you've done in public?"];
    const premiumDares = ["Post a screenshot of your search history.", "Change nickname to 'Simp' for 24h."];
    const standardTruths = ["What is your biggest fear?", "Who is your secret crush?"];
    const standardDares = ["Bark in VC.", "Ping a random person."];

    client.on('interactionCreate', async (interaction) => {
        // Handle Button Clicks (Next Player)
        if (interaction.isButton() && interaction.customId.startsWith('tod_')) {
            const choice = interaction.customId.split('_')[1]; // truth or dare
            handleTod(interaction, choice);
        }

        // Handle Slash Command
        if (interaction.isChatInputCommand() && interaction.commandName === 'tod') {
            handleTod(interaction, interaction.options.getString('choice'));
        }
    });

    async function handleTod(interaction, choice) {
        const isPremium = client.isPremium(interaction.guild.id);
        const isTruth = choice === 'truth';

        // Select Question
        let pool = isTruth 
            ? (isPremium ? [...standardTruths, ...premiumTruths] : standardTruths)
            : (isPremium ? [...standardDares, ...premiumDares] : standardDares);
        const selected = pool[Math.floor(Math.random() * pool.length)];

        // Select Next Victim (Random member from guild)
        const nextMember = interaction.guild.members.cache.random();

        const embed = new EmbedBuilder()
            .setColor(isTruth ? '#3498DB' : '#E74C3C')
            .setTitle(isTruth ? '🔵 Truth' : '🔴 Dare')
            .setDescription(`**${interaction.user.username}** chose ${choice}:\n\n> **${selected}**\n\n---`)
            .addFields({ name: 'Next Player', value: `Your turn, ${nextMember.user.username}! Choose:` })
            .setFooter({ text: isPremium ? '🌟 Premium Content Unlocked' : 'Use .premium to unlock more' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tod_truth').setLabel('Truth').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('tod_dare').setLabel('Dare').setStyle(ButtonStyle.Danger)
        );

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: `${nextMember}`, embeds: [embed], components: [row] });
        } else {
            await interaction.reply({ content: `${nextMember}`, embeds: [embed], components: [row] });
        }
    }
};
