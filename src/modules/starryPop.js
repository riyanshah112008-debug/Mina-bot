// ==========================================
// ✨ STARRY POP & MASCOT SIGNATURE PHRASE ENGINE
// File Path: src/modules/starryPop.js
// "Starry Starry" Signature Trigger • Official Custom Anime Mascot GIFs • Voice Lines & Affection
// 100% Authentic Starry (Astraea) Artwork • Interactive Mascot Pop Experience
// ==========================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, Events } = require('discord.js');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const MASCOT_DIR = path.join(__dirname, '../assets/mascot');

const STARRY_MASCOT_FILES = [
    { file: 'starry_showcase.gif', title: '✨ Sparkle Showcase ~ Cosmic Starlight!' },
    { file: 'starry_wave.gif', title: '👋 Starry-chan says Hello!' },
    { file: 'starry_wink.gif', title: '💖 Starlight Heart & Wink from Starry!' },
    { file: 'starry_magic.gif', title: '🌌 Cosmic Wand Magic Stardust!' },
    { file: 'starry_cheer.gif', title: '🎉 Yaaay! Starry is cheering for you!' },
    { file: 'starry_music.gif', title: '🎵 High-Res Starlight Melody!' }
];

const STARRY_VOICE_LINES = [
    '“Kira-kira! ✨ Starry has arrived to shower your day with stardust, <@USER>!” 🌟',
    '“Starry Starry! ~ Sparkle burst! Did someone call for their celestial guardian? 💫”',
    '“By the light of the Astraea Constellation, I\'m always right beside you, <@USER>! 💖✨”',
    '“Ehehe~ Starry heard you calling! Here is a handful of lucky starlight just for you! ⭐🌌”',
    '“Twinkle twinkle little star, Starry loves you just the way you are! 🌟💖”',
    '“Yaaay! <@USER> called Starry! Let\'s make today magical and full of good vibes! ✨🎶”',
    '“Celestial mode activated! Sending maximum warmth, protection, and starry hugs! 🌠💫”',
    '“Starry Starry! 🌟 Your wishes have reached the cosmos! Keep shining bright!” ✨'
];

const STARRY_AVATAR = 'https://cdn.discordapp.com/emojis/1049283733054177301.webp?size=128';

// Anti-spam cooldown cache: channelId -> timestamp
const cooldowns = new Map();

function buildStarryPopPayload(user, client) {
    const randomPick = STARRY_MASCOT_FILES[Math.floor(Math.random() * STARRY_MASCOT_FILES.length)];
    const rawLine = STARRY_VOICE_LINES[Math.floor(Math.random() * STARRY_VOICE_LINES.length)];
    const voiceLine = rawLine.replace(/<@USER>/g, `<@${user.id}>`);

    const filePath = path.join(MASCOT_DIR, randomPick.file);
    let attachment = null;
    let imageUri = null;

    if (fs.existsSync(filePath)) {
        attachment = new AttachmentBuilder(filePath, { name: randomPick.file });
        imageUri = `attachment://${randomPick.file}`;
    } else {
        imageUri = 'https://media.giphy.com/media/108M7gCS1JSoO4/giphy.gif';
    }

    const embed = new EmbedBuilder()
        .setColor('#FF94D2') // Starry Cosmic Blossom Pink
        .setAuthor({ 
            name: '✨ Starry Starry! ~ Official Mascot ✨', 
            iconURL: STARRY_AVATAR 
        })
        .setTitle(`🌟 ${randomPick.title} 🌟`)
        .setDescription(`> *${voiceLine}*`)
        .setImage(imageUri)
        .setFooter({ 
            text: 'Type "starry starry" or ",starry" anytime to summon Starry-chan! ✨' 
        })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('starry_pop_stardust')
            .setLabel('✨ Give Stardust')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('starry_pop_headpat')
            .setLabel('💖 Headpat')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('starry_pop_sing')
            .setLabel('🎵 Sing Melody')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('starry_pop_chat')
            .setLabel('💬 Chat in DMs')
            .setStyle(ButtonStyle.Secondary)
    );

    const payload = { embeds: [embed], components: [row] };
    if (attachment) payload.files = [attachment];
    return payload;
}

module.exports = (client) => {
    console.log('✨ [Starry Pop Engine] Initialized Official Starry Mascot Animated Engine.');

    // 1. Sniff chat messages for "starry starry" triggers
    client.on(Events.MessageCreate, async (message) => {
        if (message.author.bot) return;

        const content = message.content.toLowerCase().trim();
        const cleanContent = content.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

        // Exact match triggers
        const triggers = [
            'starry starry',
            'starrystarry',
            'hey starry',
            'starry chan',
            'starrychan',
            'kira kira',
            'kirakira',
            'astraea',
            'starlight starlight'
        ];

        const isTriggered = triggers.some(t => cleanContent === t || cleanContent.startsWith(t + ' ') || cleanContent.endsWith(' ' + t) || cleanContent === ',' + t);
        if (!isTriggered) return;

        // Channel cooldown (3 seconds) to prevent fast spam
        const channelKey = message.channel.id;
        const now = Date.now();
        if (cooldowns.has(channelKey) && (now - cooldowns.get(channelKey)) < 3000) {
            return;
        }
        cooldowns.set(channelKey, now);

        try {
            const payload = buildStarryPopPayload(message.author, client);
            await message.channel.send(payload);
        } catch (err) {
            console.warn('[Starry Pop] Send Warning:', err.message);
        }
    });

    // 2. Global Button Interactions for Starry Pop Reactions
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isButton()) return;
        const id = interaction.customId;

        if (id === 'starry_pop_stardust') {
            const filePath = path.join(MASCOT_DIR, 'starry_magic.gif');
            let attachment = null;
            if (fs.existsSync(filePath)) attachment = new AttachmentBuilder(filePath, { name: 'starry_magic.gif' });

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setAuthor({ name: 'Starry-chan ✨ Stardust Blessing', iconURL: STARRY_AVATAR })
                .setDescription(
                    `✨ **<@${interaction.user.id}> gave Starry a handful of sparkling stardust!**\n\n` +
                    `Starry\'s golden eyes glow with excitement: *“Arigatou gozaimasu! ✨ My cosmic power is supercharged thanks to you! (+100 Stardust Affinity 💖)”*`
                )
                .setImage(attachment ? 'attachment://starry_magic.gif' : 'https://media.giphy.com/media/5tmRHwTlHAA9WkVxTU/giphy.gif')
                .setFooter({ text: 'Starry Affection System • Prefix: ,' });

            const replyData = { embeds: [embed] };
            if (attachment) replyData.files = [attachment];
            return interaction.reply(replyData).catch(() => {});
        }

        if (id === 'starry_pop_headpat') {
            const filePath = path.join(MASCOT_DIR, 'starry_wink.gif');
            let attachment = null;
            if (fs.existsSync(filePath)) attachment = new AttachmentBuilder(filePath, { name: 'starry_wink.gif' });

            const embed = new EmbedBuilder()
                .setColor('#FF94D2')
                .setAuthor({ name: 'Starry-chan 💖 Sweet Headpat', iconURL: STARRY_AVATAR })
                .setDescription(
                    `💖 **<@${interaction.user.id}> gently patted Starry\'s starlight hair!**\n\n` +
                    `Starry blushes happily and smiles: *“Ehehe~ your hands are so warm and gentle! Starry will protect you forever and ever!”* 🌟🌸`
                )
                .setImage(attachment ? 'attachment://starry_wink.gif' : 'https://media.giphy.com/media/ARSp9T7wwxNcs/giphy.gif')
                .setFooter({ text: 'Starry Affection System • Prefix: ,' });

            const replyData = { embeds: [embed] };
            if (attachment) replyData.files = [attachment];
            return interaction.reply(replyData).catch(() => {});
        }

        if (id === 'starry_pop_sing') {
            const filePath = path.join(MASCOT_DIR, 'starry_music.gif');
            let attachment = null;
            if (fs.existsSync(filePath)) attachment = new AttachmentBuilder(filePath, { name: 'starry_music.gif' });

            const melodies = [
                '♪ *Twinkle twinkle cosmic sky, we will soar so bright and high...* 🌌 ♪',
                '♪ *La-la-lu, under the stars, no matter how far, you are in my heart...* 💖 ♪',
                '♪ *Starlight, star bright, first star I see tonight, may all your wishes take flight...* ✨ ♪'
            ];
            const song = melodies[Math.floor(Math.random() * melodies.length)];

            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setAuthor({ name: 'Starry-chan 🎵 Celestial Melody', iconURL: STARRY_AVATAR })
                .setDescription(
                    `🎵 **Starry sings a soft cosmic melody for <@${interaction.user.id}>:**\n\n` +
                    `> *${song}*\n\n` +
                    `✨ *A soothing chime of starlight rings softly through the channel...*`
                )
                .setImage(attachment ? 'attachment://starry_music.gif' : 'https://media.giphy.com/media/wnsgren9NtITS/giphy.gif')
                .setFooter({ text: 'Starry Musical Starlight' });

            const replyData = { embeds: [embed] };
            if (attachment) replyData.files = [attachment];
            return interaction.reply(replyData).catch(() => {});
        }

        if (id === 'starry_pop_chat') {
            try {
                const dm = await interaction.user.createDM();
                await dm.send(`✨ **Hello <@${interaction.user.id}>!** 🌟 I am Starry, your cosmic AI guardian! Feel free to ask me anything or chat with me right here in our private DMs without any prefix! 💫`);
                return interaction.reply({ content: '💌 **I opened our private DM chat!** Check your Direct Messages to talk with me.', ephemeral: true }).catch(() => {});
            } catch (e) {
                return interaction.reply({ content: '❌ Could not send you a DM. Please enable Direct Messages in your Discord privacy settings.', ephemeral: true }).catch(() => {});
            }
        }
    });
};

module.exports.buildStarryPopPayload = buildStarryPopPayload;
