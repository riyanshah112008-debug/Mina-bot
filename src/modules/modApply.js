const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'applyConfig.json');

module.exports = (client) => {
    // Helper Functions for Config Database
    function getApplyConfig() {
        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}));
        return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    }

    function saveApplyConfig(data) {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    }

    client.on('interactionCreate', async (interaction) => {
        // ==========================================
        // 1. SETUP COMMAND (/applysetup)
        // ==========================================
        if (interaction.isChatInputCommand() && interaction.commandName === 'applysetup') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: '❌ You need Administrator permissions to set this up!', ephemeral: true }).catch(() => {});
            }

            const logChannel = interaction.options.getChannel('log_channel');
            const resultChannel = interaction.options.getChannel('result_channel'); // NEW: The showcase channel

            // Save both channels to the database
            let config = getApplyConfig();
            config[interaction.guildId] = { 
                logChannelId: logChannel.id,
                resultChannelId: resultChannel ? resultChannel.id : null 
            };
            saveApplyConfig(config);

            const panelEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle('📋 Staff Applications')
                .setDescription('We are looking for dedicated members to join our moderation team!\n\n**Requirements:**\n• Must be active\n• Must know the rules\n• Must be professional\n\nClick the button below to start your application.')
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }));

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('start_application')
                    .setLabel('Apply for Staff')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝')
            );

            await interaction.channel.send({ embeds: [panelEmbed], components: [row] }).catch(() => {});
            
            let replyMsg = `✅ Application panel spawned! Responses will go to <#${logChannel.id}>.`;
            if (resultChannel) replyMsg += ` Decisions will be showcased in <#${resultChannel.id}>.`;
            
            return interaction.reply({ content: replyMsg, ephemeral: true }).catch(() => {});
        }

        // ==========================================
        // 2. SPAWN THE MODAL (When button is clicked)
        // ==========================================
        if (interaction.isButton() && interaction.customId === 'start_application') {
            const modal = new ModalBuilder()
                .setCustomId('mod_application_submit')
                .setTitle('Moderator Application');

            const ageInput = new TextInputBuilder()
                .setCustomId('age')
                .setLabel('How old are you?')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const experienceInput = new TextInputBuilder()
                .setCustomId('experience')
                .setLabel('Do you have previous experience?')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            const reasonInput = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel('Why should we choose you?')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(ageInput),
                new ActionRowBuilder().addComponents(experienceInput),
                new ActionRowBuilder().addComponents(reasonInput)
            );

            await interaction.showModal(modal).catch(() => {});
        }

        // ==========================================
        // 3. PROCESS SUBMITTED APPLICATION
        // ==========================================
        if (interaction.isModalSubmit() && interaction.customId === 'mod_application_submit') {
            const age = interaction.fields.getTextInputValue('age');
            const experience = interaction.fields.getTextInputValue('experience');
            const reason = interaction.fields.getTextInputValue('reason');

            const config = getApplyConfig();
            const guildConfig = config[interaction.guildId];

            if (!guildConfig || !guildConfig.logChannelId) {
                return interaction.reply({ content: '❌ The server administrators have not configured an application log channel yet!', ephemeral: true }).catch(() => {});
            }

            const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
            if (!logChannel) {
                return interaction.reply({ content: '❌ Error: The application channel no longer exists.', ephemeral: true }).catch(() => {});
            }

            const appEmbed = new EmbedBuilder()
                .setColor('Yellow')
                .setTitle('📝 New Staff Application')
                .setAuthor({ name: `${interaction.user.tag} (${interaction.user.id})`, iconURL: interaction.user.displayAvatarURL() })
                .addFields(
                    { name: 'Age', value: age, inline: false },
                    { name: 'Experience', value: experience, inline: false },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            const reviewRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`app_accept_${interaction.user.id}`).setLabel('Accept').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`app_deny_${interaction.user.id}`).setLabel('Deny').setStyle(ButtonStyle.Danger)
            );

            await logChannel.send({ embeds: [appEmbed], components: [reviewRow] }).catch(() => {});
            return interaction.reply({ content: '✅ Your application has been securely submitted to the staff team. Good luck!', ephemeral: true }).catch(() => {});
        }

        // ==========================================
        // 4. HANDLE ACCEPT / DENY DECISIONS
        // ==========================================
        if (interaction.isButton() && (interaction.customId.startsWith('app_accept_') || interaction.customId.startsWith('app_deny_'))) {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: '❌ Only Administrators can review applications!', ephemeral: true }).catch(() => {});
            }

            const parts = interaction.customId.split('_');
            const action = parts[1]; // 'accept' or 'deny'
            const applicantId = parts[2];
            
            const isAccepted = action === 'accept';
            const color = isAccepted ? 'Green' : 'Red';
            const statusText = isAccepted ? 'ACCEPTED' : 'DENIED';

            // 1. DM the Applicant
            try {
                const applicant = await client.users.fetch(applicantId);
                const dmMessage = isAccepted 
                    ? `🎉 Congratulations! Your staff application for **${interaction.guild.name}** has been **ACCEPTED**! A server administrator will reach out to you shortly.` 
                    : `👋 Hello. Thank you for applying to **${interaction.guild.name}**. Unfortunately, your application has been **DENIED** at this time.`;
                
                await applicant.send(dmMessage).catch(() => {});
            } catch (err) {}

            // 2. Update the original Staff Panel Embed
            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor(color)
                .setTitle(`📝 Staff Application [${statusText}]`)
                .setFooter({ text: `Reviewed by ${interaction.user.tag}` });

            await interaction.update({ embeds: [updatedEmbed], components: [] }).catch(() => {});

            // 3. Post to the Result/Showcase Channel (If configured)
            const config = getApplyConfig();
            const guildConfig = config[interaction.guildId];

            if (guildConfig && guildConfig.resultChannelId) {
                const resultChannel = interaction.guild.channels.cache.get(guildConfig.resultChannelId);
                if (resultChannel) {
                    const showcaseEmbed = new EmbedBuilder()
                        .setColor(color)
                        .setTitle(`📝 Application ${statusText}`)
                        .setDescription(`<@${applicantId}>'s staff application has been **${statusText}**!`)
                        .setFooter({ text: `Reviewed by Staff` })
                        .setTimestamp();
                        
                    await resultChannel.send({ embeds: [showcaseEmbed] }).catch(() => {});
                }
            }
        }
    });
};
                
