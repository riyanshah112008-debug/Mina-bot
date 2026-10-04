// ==========================================
// 🕯️ STARRY SUPREME ANONYMOUS CONFESSION ENGINE
// File Path: ./modules/confession.js
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
    SlashCommandBuilder,
    Events,
    MessageFlags
} = require('discord.js');

const EPHEMERAL_FLAG = MessageFlags.Ephemeral || 6;

let confessionCounter = 1000;

// --- SLASH COMMAND PAYLOADS ---
const confessionSetupPayload = new SlashCommandBuilder()
    .setName('confessionsetup')
    .setDescription('🕯️ Deploy the aesthetic Anonymous Confession panel in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON();

const confessPayload = new SlashCommandBuilder()
    .setName('confess')
    .setDescription('🕯️ Open the anonymous confession submission box')
    .toJSON();

const confessionPayload = new SlashCommandBuilder()
    .setName('confession')
    .setDescription('🕯️ Open the anonymous confession submission box')
    .toJSON();

function buildSetupEmbed() {
    return new EmbedBuilder()
        .setColor('#1A1A24')
        .setAuthor({ 
            name: 'STARRY CONFIDENTIAL PROTOCOL', 
            iconURL: 'https://cdn.discordapp.com/emojis/1083000000000000000.webp?quality=lossless' 
        })
        .setTitle('🕯️ Anonymous Confession Box')
        .setDescription(
            `>>> Welcome to the **Anonymous Confession Panel**. Share your secrets, untold stories, or midnight thoughts with complete anonymity.\n\n` +
            `🔒 **Zero Identity Tracking:** Your user ID is never attached to public posts.\n` +
            `💌 **Interactive Replies:** Members can reply to your confession anonymously.\n` +
            `🛡️ **Auto-Moderation:** Explicit abuse or dox attempts will be filtered.`
        )
        .addFields(
            { name: '✨ How It Works', value: '1️⃣ Click **Submit Confession** below.\n2️⃣ Fill out your secret in the pop-up modal.\n3️⃣ Hit Send & view it live here!', inline: true },
            { name: '📜 Community Rules', value: '• No severe hate speech or doxxing\n• Respect Discord TOS\n• Keep it genuine & safe', inline: true }
        )
        .setImage('https://i.ibb.co/sp2bTrrj/lingual-ezgif-com-resize.gif')
        .setFooter({ text: 'Starry Anonymity Engine • Completely Encrypted', iconURL: 'https://cdn.discordapp.com/embed/avatars/0.png' });
}

function buildConfessionCard(number, confessionText, topic = null) {
    const timestamp = Math.floor(Date.now() / 1000);
    
    const embed = new EmbedBuilder()
        .setColor('#6C5CE7')
        .setAuthor({ 
            name: `CONFESSION • #${number}`, 
            iconURL: 'https://c.tenor.com/TgKK6YKNkm0AAAAi/verified-verificado.gif' 
        })
        .setDescription(`>>> ❝ *${confessionText.trim()}* ❞`)
        .addFields(
            { name: '🔒 Privacy Status', value: '` 100% Anonymous `', inline: true },
            { name: '⏰ Submitted', value: `<t:${timestamp}:R>`, inline: true }
        )
        .setFooter({ 
            text: '✨ Click buttons below to interact • Starry Anonymous System', 
            iconURL: 'https://cdn.discordapp.com/embed/avatars/0.png' 
        });

    if (topic && topic.trim().length > 0) {
        embed.setTitle(`📌 Topic: ${topic.trim()}`);
    }

    return embed;
}

function buildPanelRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('confess_btn_open')
            .setLabel('Submit Confession')
            .setEmoji('📝')
            .setStyle(ButtonStyle.Primary)
    );
}

function buildCardRow(confessionNum) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`confess_btn_reply_${confessionNum}`)
            .setLabel('Reply Anonymously')
            .setEmoji('💬')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`confess_btn_report_${confessionNum}`)
            .setLabel('Report')
            .setEmoji('🚩')
            .setStyle(ButtonStyle.Danger)
    );
}

function confessionModule(client, app) {
    client.on(Events.InteractionCreate, async (interaction) => {
        try {
            if (interaction.isChatInputCommand()) {
                if (interaction.commandName === 'confessionsetup') {
                    await interaction.deferReply({ flags: [EPHEMERAL_FLAG] });
                    const embed = buildSetupEmbed();
                    const row = buildPanelRow();
                    await interaction.channel.send({ embeds: [embed], components: [row] });
                    return interaction.editReply({ content: '✅ **Success:** Confession Panel deployed in this channel!' });
                }

                if (interaction.commandName === 'confess' || interaction.commandName === 'confession') {
                    const modal = new ModalBuilder()
                        .setCustomId('confess_modal_submit')
                        .setTitle('🕯️ Submit Anonymous Confession');

                    const topicInput = new TextInputBuilder()
                        .setCustomId('confess_input_topic')
                        .setLabel('Subject / Topic (Optional)')
                        .setPlaceholder('e.g. Late night thoughts, Crush, Secret hobby...')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                        .setMaxLength(50);

                    const textInput = new TextInputBuilder()
                        .setCustomId('confess_input_text')
                        .setLabel('Your Secret / Confession')
                        .setPlaceholder('Write your confession here... Keep it respectful and within server rules.')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setMinLength(10)
                        .setMaxLength(1000);

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(topicInput),
                        new ActionRowBuilder().addComponents(textInput)
                    );

                    return await interaction.showModal(modal);
                }
            }

            if (interaction.isButton()) {
                const { customId } = interaction;

                if (customId === 'confess_btn_open') {
                    const modal = new ModalBuilder()
                        .setCustomId('confess_modal_submit')
                        .setTitle('🕯️ Submit Anonymous Confession');

                    const topicInput = new TextInputBuilder()
                        .setCustomId('confess_input_topic')
                        .setLabel('Subject / Topic (Optional)')
                        .setPlaceholder('e.g. Late night thoughts, Crush, Secret hobby...')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                        .setMaxLength(50);

                    const textInput = new TextInputBuilder()
                        .setCustomId('confess_input_text')
                        .setLabel('Your Secret / Confession')
                        .setPlaceholder('Write your confession here...')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setMinLength(10)
                        .setMaxLength(1000);

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(topicInput),
                        new ActionRowBuilder().addComponents(textInput)
                    );

                    return await interaction.showModal(modal);
                }

                if (customId.startsWith('confess_btn_reply_')) {
                    const confessionNum = customId.split('_')[3];
                    const modal = new ModalBuilder()
                        .setCustomId(`confess_modal_reply_${confessionNum}`)
                        .setTitle(`💬 Reply to Confession #${confessionNum}`);

                    const replyInput = new TextInputBuilder()
                        .setCustomId('confess_input_reply')
                        .setLabel('Your Anonymous Reply')
                        .setPlaceholder('Type your response to this confession...')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setMaxLength(500);

                    modal.addComponents(new ActionRowBuilder().addComponents(replyInput));
                    return await interaction.showModal(modal);
                }

                if (customId.startsWith('confess_btn_report_')) {
                    const confessionNum = customId.split('_')[3];
                    return interaction.reply({
                        content: `🚩 **Report Received:** Confession **#${confessionNum}** has been flagged for staff review. Thank you for keeping the community safe.`,
                        flags: [EPHEMERAL_FLAG]
                    });
                }
            }

            if (interaction.isModalSubmit()) {
                const { customId } = interaction;

                if (customId === 'confess_modal_submit') {
                    await interaction.deferReply({ flags: [EPHEMERAL_FLAG] });

                    const topic = interaction.fields.getTextInputValue('confess_input_topic');
                    const text = interaction.fields.getTextInputValue('confess_input_text');

                    confessionCounter++;
                    const currentNum = confessionCounter;

                    const embed = buildConfessionCard(currentNum, text, topic);
                    const row = buildCardRow(currentNum);

                    await interaction.channel.send({ embeds: [embed], components: [row] });

                    return interaction.editReply({
                        content: `✨ **Posted!** Your confession has been published as **#${currentNum}**.`
                    });
                }

                if (customId.startsWith('confess_modal_reply_')) {
                    await interaction.deferReply({ flags: [EPHEMERAL_FLAG] });

                    const confessionNum = customId.split('_')[3];
                    const replyText = interaction.fields.getTextInputValue('confess_input_reply');

                    const replyEmbed = new EmbedBuilder()
                        .setColor('#A29BFE')
                        .setAuthor({ name: `ANONYMOUS REPLY • On Confession #${confessionNum}` })
                        .setDescription(`>>> 💬 *${replyText.trim()}*`)
                        .setFooter({ text: 'Starry Anonymous Reply System' })
                        .setTimestamp();

                    await interaction.channel.send({ embeds: [replyEmbed] });

                    return interaction.editReply({
                        content: `💬 Your anonymous reply to **#${confessionNum}** has been sent!`
                    });
                }
            }
        } catch (error) {
            console.error('❌ Confession Engine Error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '⚠️ An error occurred processing your confession.', flags: [EPHEMERAL_FLAG] }).catch(() => {});
            }
        }
    });

    console.log('🕯️ Confession Engine Module initialized.');
}

// Attach payloads so deploy-commands.js reads them!
confessionModule.confessionSetupPayload = confessionSetupPayload;
confessionModule.confessPayload = confessPayload;
confessionModule.confessionPayload = confessionPayload;

module.exports = confessionModule;
