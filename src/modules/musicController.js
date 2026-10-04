// ==========================================
// 🎵 STARRY DEDICATED MUSIC CONTROLLER SYSTEM
// File Path: src/modules/musicController.js
// Interactive Request Channel • Real-time Status Synchronization • Direct Song Requests
// ==========================================
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    AttachmentBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags
} = require('discord.js');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const db = require('../utils/database');
const MusicController = require('../models/MusicController');
const { StarryAudioEngine, formatTime } = require('../utils/nativeAudioEngine');
const { getGuildLanguageSync, t } = require('../utils/i18n');

const isDbConnected = () => Boolean(mongoose.connection && mongoose.connection.readyState === 1);
const EPHEMERAL_FLAG = (MessageFlags && MessageFlags.Ephemeral) ? MessageFlags.Ephemeral : 64;
const BANNER_PATH = path.join(__dirname, '../assets/mascot/starry_music_banner.jpg');

class MusicControllerEngine {
    constructor() {
        this.cache = new Map(); // guildId -> { channelId, messageId, bannerUrl }
        this.updateTimeouts = new Map();
        this.initialized = false;
    }

    async init(client) {
        if (this.initialized) return;

        // 1. Immediately populate from local persistent store (zero network wait)
        try {
            const localConfigs = db.getAllMusicRequestChannels ? db.getAllMusicRequestChannels() : {};
            for (const [gid, cfg] of Object.entries(localConfigs)) {
                if (cfg && cfg.channelId) {
                    this.cache.set(gid, {
                        channelId: cfg.channelId,
                        messageId: cfg.messageId,
                        bannerUrl: cfg.bannerUrl || ''
                    });
                }
            }
        } catch (_) {}

        // 2. Synchronize from MongoDB if connected, or when connection opens
        const syncFromMongo = async () => {
            if (!isDbConnected()) return;
            try {
                const configs = await MusicController.find({}).lean();
                for (const cfg of configs) {
                    const entry = {
                        channelId: cfg.channelId,
                        messageId: cfg.messageId,
                        bannerUrl: cfg.bannerUrl || ''
                    };
                    this.cache.set(cfg.guildId, entry);
                    if (db.setMusicRequestChannel) db.setMusicRequestChannel(cfg.guildId, entry);
                }
                console.log(`🎵 [Music Controller] Synchronized ${this.cache.size} dedicated request channels.`);
            } catch (_) {}
        };

        if (isDbConnected()) {
            await syncFromMongo();
        } else {
            mongoose.connection.once('open', syncFromMongo);
            mongoose.connection.on('reconnected', syncFromMongo);
        }

        this.initialized = true;
    }

    isRequestChannel(guildId, channelId) {
        if (!guildId || !channelId) return false;
        const config = this.cache.get(guildId);
        return config && config.channelId === channelId;
    }

    getConfig(guildId) {
        return this.cache.get(guildId) || null;
    }

    buildComponents(player, guildId = null) {
        const isPlaying = !!(player && player.currentTrack);
        const isPaused = !!(player && player.paused);
        const isAutoplay = !!(player && player.autoplay);
        const targetGuildId = guildId || player?.guildId;
        const lang = targetGuildId ? getGuildLanguageSync(targetGuildId) : 'en';

        // Row 1: Playback Navigation
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ctrl_vol_down')
                .setEmoji('🔉')
                .setLabel(t(lang, 'music.btn_down'))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('ctrl_previous')
                .setEmoji('⏮️')
                .setLabel(t(lang, 'music.btn_prev'))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('ctrl_pause_resume')
                .setEmoji(isPaused ? '▶️' : '⏸️')
                .setLabel(isPaused ? t(lang, 'music.btn_resume') : t(lang, 'music.btn_pause'))
                .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('ctrl_skip')
                .setEmoji('⏭️')
                .setLabel(t(lang, 'music.btn_skip'))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('ctrl_vol_up')
                .setEmoji('🔊')
                .setLabel(t(lang, 'music.btn_up'))
                .setStyle(ButtonStyle.Secondary)
        );

        // Row 2: Queue & Session Options
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ctrl_shuffle')
                .setEmoji('🔀')
                .setLabel(t(lang, 'music.btn_shuffle'))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('ctrl_autoplay')
                .setEmoji('🔄')
                .setLabel(t(lang, 'music.btn_autoplay'))
                .setStyle(isAutoplay ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('ctrl_stop')
                .setEmoji('⏹️')
                .setLabel(t(lang, 'music.btn_stop'))
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('ctrl_dashboard')
                .setEmoji('🎛️')
                .setLabel(t(lang, 'music.btn_dashboard'))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('ctrl_queue')
                .setEmoji('📜')
                .setLabel(t(lang, 'music.btn_queue'))
                .setStyle(ButtonStyle.Secondary)
        );

        // Row 3: Curation & Connection Controls
        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ctrl_like')
                .setEmoji('❤️')
                .setLabel(t(lang, 'music.btn_like'))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('ctrl_dislike')
                .setEmoji('👎')
                .setLabel(t(lang, 'music.btn_dislike'))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('ctrl_block')
                .setEmoji('🚫')
                .setLabel(t(lang, 'music.btn_block'))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('ctrl_next_up')
                .setEmoji('🔮')
                .setLabel(t(lang, 'music.btn_next_up'))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('ctrl_connect')
                .setEmoji('▶️')
                .setLabel(t(lang, 'music.btn_connect'))
                .setStyle(ButtonStyle.Success)
        );

        // Row 4: Audio DSP Filter Dropdown
        const filterMenu = new StringSelectMenuBuilder()
            .setCustomId('ctrl_filter')
            .setPlaceholder(t(lang, 'music.filter_placeholder'))
            .addOptions([
                { label: '⭐ Studio Hi-Fi Master (Empowering)', description: 'Audiophile punch, deep sub-bass, silky vocals & wide stage', value: 'empowering', emoji: '✨' },
                { label: 'Clear / Flat Studio', description: 'Raw, pristine uncolored studio sound', value: 'clear', emoji: '🚫' },
                { label: 'Bass', description: 'Deep physical vibration & subwoofer rumble (Vocals clear)', value: 'bass', emoji: '🔊' },
                { label: '8D Spatial Audio', description: '360° rotating spatial surround sound', value: '8d', emoji: '🌀' },
                { label: 'Nightcore', description: 'Sped up tempo + higher pitch aesthetic', value: 'nightcore', emoji: '✨' },
                { label: 'Daycore / Slowed', description: 'Slowed down tempo + deeper tone', value: 'daycore', emoji: '🌅' },
                { label: 'Vaporwave', description: 'Slowed reverb + retro cassette feel', value: 'vaporwave', emoji: '🪩' },
                { label: 'Lo-Fi Chill', description: 'Warm vinyl tape flutter & mellow acoustic tone', value: 'lofi', emoji: '☕' },
                { label: 'Slowed & Reverb', description: 'Immersive stadium & cathedral concert reverb', value: 'reverb', emoji: '🌌' },
                { label: 'Karaoke', description: 'Attenuates center vocals for sing-along', value: 'karaoke', emoji: '🎤' },
                { label: '3D Surround', description: 'Wide immersive cinematic surround soundstage', value: 'surround', emoji: '🎧' },
                { label: 'EDM & Club', description: 'High-energy dance punch & crisp sizzling hats', value: 'electronic', emoji: '⚡' },
                { label: 'Soft & Mellow', description: 'Non-fatiguing smooth sound for late night chill', value: 'soft', emoji: '🍃' },
                { label: 'Retro Radio', description: 'Vintage 1950s AM telephone receiver sound', value: 'radio', emoji: '📻' },
                { label: 'Treble Boost', description: 'Crisp, crystal clear high frequencies', value: 'treble', emoji: '💎' },
                { label: 'Pop & Vocal Clarity', description: 'Enhanced vocal presence and acoustic sheen', value: 'pop', emoji: '🎙️' }
            ]);

        const row4 = new ActionRowBuilder().addComponents(filterMenu);

        // Row 5: Spotify, Premium & Links
        const row5 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ctrl_spotify')
                .setEmoji('🟢')
                .setLabel('My Spotify')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('ctrl_premium')
                .setEmoji('⭐')
                .setLabel(t(lang, 'music.btn_premium'))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('ctrl_vote')
                .setEmoji('👍')
                .setLabel(t(lang, 'music.btn_vote'))
                .setStyle(ButtonStyle.Secondary)
        );

        return [row1, row2, row3, row4, row5];
    }

    buildEmbed(player, client, guildId = null) {
        let track = player?.currentTrack;
        if (!track && player?.queue?.current) {
            const cur = player.queue.current;
            track = {
                title: cur.title,
                author: cur.author,
                url: cur.uri,
                duration: cur.length,
                thumbnail: cur.thumbnail,
                requester: cur.requester,
                source: cur.sourceName ? (cur.sourceName.charAt(0).toUpperCase() + cur.sourceName.slice(1)) : 'Spotify'
            };
        }

        const targetGuildId = guildId || player?.guildId;
        const lang = targetGuildId ? getGuildLanguageSync(targetGuildId) : 'en';

        if (track) {
            const rawFilter = (player.filter || player.data?.get('activeFilter') || 'clear').toLowerCase();
            let filterName = 'Empowering Master (Hi-Fi)';
            if (rawFilter === 'bass' || rawFilter === 'vibrate' || rawFilter === 'vibration' || rawFilter === 'bassboost' || rawFilter === 'deepbass' || rawFilter === 'subwoofer') filterName = '🔊 Bass (Physical Vibration)';
            else if (rawFilter === '8d') filterName = '🌀 8D Spatial Audio';
            else if (rawFilter === 'nightcore') filterName = '✨ Nightcore';
            else if (rawFilter === 'daycore' || rawFilter === 'slowed') filterName = '🌅 Daycore (Slowed)';
            else if (rawFilter === 'vaporwave') filterName = '🪩 Vaporwave';
            else if (rawFilter === 'lofi' || rawFilter === 'lo-fi' || rawFilter === 'chill') filterName = '☕ Lo-Fi Chill & Warmth';
            else if (rawFilter === 'reverb' || rawFilter === 'slowreverb' || rawFilter === 'hall' || rawFilter === 'echo') filterName = '🌌 Slowed & Reverb';
            else if (rawFilter === 'karaoke' || rawFilter === 'vocalremover' || rawFilter === 'instrumental' || rawFilter === 'vocalcut') filterName = '🎤 Karaoke Vocal Remover';
            else if (rawFilter === 'surround' || rawFilter === '3d' || rawFilter === 'spatial') filterName = '🎧 3D Surround Sound';
            else if (rawFilter === 'electronic' || rawFilter === 'edm' || rawFilter === 'club') filterName = '⚡ EDM & Club Master';
            else if (rawFilter === 'soft' || rawFilter === 'mellow' || rawFilter === 'relax') filterName = '🍃 Soft & Mellow Chill';
            else if (rawFilter === 'radio' || rawFilter === 'vintage') filterName = '📻 Retro Radio';
            else if (rawFilter === 'treble') filterName = '💎 Treble Boost';
            else if (rawFilter === 'pop') filterName = '🎙️ Pop & Vocal Clarity';
            else if (rawFilter === 'clear' || rawFilter === 'flat') filterName = '🚫 Clear / Studio Flat';
            else if (rawFilter) filterName = rawFilter.toUpperCase();

            const fallbackThumb = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
            const trackThumb = (track.thumbnail && !track.thumbnail.includes('imgur.com')) 
                ? track.thumbnail 
                : (client?.user?.displayAvatarURL({ dynamic: true }) || fallbackThumb);

            const queueLen = player.queue ? (player.queue.totalSize !== undefined ? player.queue.size : player.queue.length) : 0;
            const volumeVal = player.volume || 100;

            return new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`🎵 ${t(lang, 'music.controller_title')} • ${(track.title || 'Audio Track').substring(0, 50)}`)
                .setDescription(
                    `▶️ **Now Playing:** **[${(track.title || 'Audio Track').substring(0, 75)}](${track.url || 'https://discord.gg'})**\n\n` +
                    `👤 **Artist:** \`${track.author || 'Featured Artist'}\`\n` +
                    `🕒 **Duration:** \`${formatTime(track.duration)}\` | 🔊 **Volume:** \`${volumeVal}%\`\n` +
                    `👤 **Requester:** ${track.requester ? `<@${track.requester.id}>` : 'Unknown'}\n` +
                    `🌐 **Source:** \`${track.source || 'Spotify'}\` | 🎛️ **Audio Master:** \`${filterName}\`\n` +
                    `🔠 **Queue:** \`${queueLen}\` songs in queue\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `💬 *Send any song name or Spotify/YouTube link in this channel to add to queue!*`
                )
                .setThumbnail(trackThumb)
                .setImage('attachment://starry_music_banner.jpg')
                .setFooter({ 
                    text: `Starry Controller System • Bot: ${client?.user?.tag || 'Starry'}`,
                    iconURL: client?.user?.displayAvatarURL() || undefined
                });
        }

        // Idle / Waiting for music State
        return new EmbedBuilder()
            .setColor('#2B2D31')
            .setTitle(`🎵 ${t(lang, 'music.controller_title')}`)
            .setDescription(`🎶 **${t(lang, 'music.waiting_music')}**\n\n*Join a voice channel and send any song title or link here to start playing!*`)
            .setImage('attachment://starry_music_banner.jpg')
            .setFooter({ 
                text: 'Starry Controller System',
                iconURL: client?.user?.displayAvatarURL() || undefined
            });
    }

    async update(guildId, client) {
        if (!guildId || !client) return;

        // Throttle updates to avoid hitting Discord rate limits
        if (this.updateTimeouts.has(guildId)) {
            clearTimeout(this.updateTimeouts.get(guildId));
        }

        const timeout = setTimeout(async () => {
            this.updateTimeouts.delete(guildId);
            await this._performUpdate(guildId, client).catch(() => {});
        }, 300);

        this.updateTimeouts.set(guildId, timeout);
    }

    async _performUpdate(guildId, client) {
        const config = this.cache.get(guildId);
        if (!config || !config.channelId || !config.messageId) return;

        try {
            const channel = client.channels.cache.get(config.channelId) || 
                await client.channels.fetch(config.channelId).catch(() => null);
            if (!channel) return;

            let player = client.manager?.getPlayer(guildId);
            if (!player && client.multiBot?.instances) {
                for (const inst of client.multiBot.instances.values()) {
                    if (inst.client?.manager) {
                        const p = inst.client.manager.getPlayer(guildId);
                        if (p) { player = p; break; }
                    }
                }
            }
            if (!player) {
                player = StarryAudioEngine.getPlayer(guildId);
            }

            const embed = this.buildEmbed(player, client, guildId);
            const components = this.buildComponents(player, guildId);
            const files = fs.existsSync(BANNER_PATH) 
                ? [new AttachmentBuilder(BANNER_PATH, { name: 'starry_music_banner.jpg' })] 
                : [];

            const message = await channel.messages.fetch(config.messageId).catch(() => null);
            if (message) {
                const editPayload = { embeds: [embed], components };
                if (files.length > 0 && (!message.attachments || message.attachments.size === 0)) {
                    editPayload.files = files;
                }
                await message.edit(editPayload).catch(async () => {
                    // Clean up and redeploy if edit fails
                    try {
                        const oldMsgs = await channel.messages.fetch({ limit: 50 }).catch(() => null);
                        if (oldMsgs && oldMsgs.size > 0) {
                            for (const m of oldMsgs.filter(m => m.author.id === client.user.id).values()) {
                                await m.delete().catch(() => {});
                            }
                        }
                    } catch (e) {}

                    const newMsg = await channel.send({ embeds: [embed], components, files }).catch(() => null);
                    if (newMsg) {
                        config.messageId = newMsg.id;
                        this.cache.set(guildId, config);
                        if (db.setMusicRequestChannel) db.setMusicRequestChannel(guildId, config);
                        if (isDbConnected()) await MusicController.updateOne({ guildId }, { messageId: newMsg.id }).catch(() => {});
                    }
                });
            } else {
                // Message was deleted, purge any duplicate or stray bot messages before posting
                try {
                    const oldMsgs = await channel.messages.fetch({ limit: 50 }).catch(() => null);
                    if (oldMsgs && oldMsgs.size > 0) {
                        for (const m of oldMsgs.filter(m => m.author.id === client.user.id).values()) {
                            await m.delete().catch(() => {});
                        }
                    }
                } catch (e) {}

                const newMsg = await channel.send({
                    embeds: [embed],
                    components,
                    files
                }).catch(() => null);

                if (newMsg) {
                    config.messageId = newMsg.id;
                    this.cache.set(guildId, config);
                    if (db.setMusicRequestChannel) db.setMusicRequestChannel(guildId, config);
                    if (isDbConnected()) await MusicController.updateOne({ guildId }, { messageId: newMsg.id }).catch(() => {});
                }
            }
        } catch (err) {
            // Ignore transient network errors
        }
    }

    async setupChannel(guild, user, client) {
        // 1. Check if controller already exists
        let config = this.cache.get(guild.id);
        let channel = null;

        if (config && config.channelId) {
            channel = guild.channels.cache.get(config.channelId) || 
                await guild.channels.fetch(config.channelId).catch(() => null);
        }

        if (!channel) {
            channel = guild.channels.cache.find(c => c.name === '🎵・starry-music' || c.name === 'starry-music');
        }

        // 2. If channel doesn't exist, create it
        if (!channel) {
            channel = await guild.channels.create({
                name: '🎵・starry-music',
                type: ChannelType.GuildText,
                topic: '🎵 Starry Dedicated Music Controller — Send any song name or link to play instantly!',
                permissionOverwrites: [
                    {
                        id: guild.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory
                        ]
                    },
                    {
                        id: client.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ManageMessages,
                            PermissionFlagsBits.EmbedLinks,
                            PermissionFlagsBits.AttachFiles,
                            PermissionFlagsBits.ReadMessageHistory
                        ]
                    }
                ]
            });
        }

        // 3. Purge ALL existing messages in channel to guarantee STRICTLY ONE EMBED!
        try {
            const fetched = await channel.messages.fetch({ limit: 100 }).catch(() => null);
            if (fetched && fetched.size > 0) {
                // Delete recent messages via bulk delete
                const recent = fetched.filter(m => (Date.now() - m.createdTimestamp) < 13 * 24 * 60 * 60 * 1000);
                if (recent.size > 0) {
                    await channel.bulkDelete(recent, true).catch(() => {});
                }
                // Individually delete any remaining messages (including >14 days old messages)
                const remaining = await channel.messages.fetch({ limit: 100 }).catch(() => null);
                if (remaining && remaining.size > 0) {
                    for (const m of remaining.values()) {
                        await m.delete().catch(() => {});
                    }
                }
            }
        } catch (e) {}

        // 4. Build embed and controller components
        const player = StarryAudioEngine.getPlayer(guild.id);
        const embed = this.buildEmbed(player, client, guild.id);
        const components = this.buildComponents(player, guild.id);
        const files = fs.existsSync(BANNER_PATH) 
            ? [new AttachmentBuilder(BANNER_PATH, { name: 'starry_music_banner.jpg' })] 
            : [];

        const controllerMessage = await channel.send({
            embeds: [embed],
            components,
            files
        });

        // 5. Persist configuration in database and memory
        const newConfig = {
            guildId: guild.id,
            channelId: channel.id,
            messageId: controllerMessage.id,
            bannerUrl: ''
        };

        this.cache.set(guild.id, newConfig);
        if (db.setMusicRequestChannel) db.setMusicRequestChannel(guild.id, newConfig);

        if (isDbConnected()) {
            await MusicController.findOneAndUpdate(
                { guildId: guild.id },
                newConfig,
                { upsert: true, new: true }
            ).catch(() => {});
        }

        return { channel, message: controllerMessage };
    }

    async handleSongRequest(message, client) {
        if (!message.guild || message.author.bot) return;

        const content = message.content.trim();
        if (!content) return;

        // Allow prefix command bypasses (e.g. ,setup, ,deletecontroller)
        if (content.startsWith(',') || content.startsWith('.')) return;

        // Instantly delete user message to keep the channel clean
        message.delete().catch(() => {});

        const voiceChannel = message.member?.voice?.channel;
        if (!voiceChannel) {
            const temp = await message.channel.send({
                content: `❌ **${message.author}**, you must be connected to a voice channel first to request songs!`
            }).catch(() => null);
            if (temp) setTimeout(() => temp.delete().catch(() => {}), 4000);
            return;
        }

        // Check if track/artist is blocked in this server
        const dbConfig = isDbConnected() ? await MusicController.findOne({ guildId: message.guild.id }).lean().catch(() => null) : null;
        if (dbConfig && dbConfig.blockedTracks && dbConfig.blockedTracks.length > 0) {
            const lower = content.toLowerCase();
            const isBlocked = dbConfig.blockedTracks.some(b => lower.includes(b.query.toLowerCase()));
            if (isBlocked) {
                const temp = await message.channel.send({
                    content: `🚫 **This track or query is blocked in this server!**`
                }).catch(() => null);
                if (temp) setTimeout(() => temp.delete().catch(() => {}), 4000);
                return;
            }
        }

        const manager = client.manager;
        const hasLavalink = Boolean(
            manager &&
            manager.shoukaku &&
            Array.from(manager.shoukaku.nodes.values()).some(n => n.state === 1)
        );

        // Route 1: High-Performance Lavalink Cluster (Primary for Cloud Hosting / Render where UDP is restricted)
        if (hasLavalink) {
            try {
                const res = await manager.search(content, { requester: message.author });
                if (!res || !res.tracks || res.tracks.length === 0 || res.loadType === 'empty' || res.loadType === 'error') {
                    const temp = await message.channel.send({
                        content: `❌ No audio results found for: \`${content.substring(0, 50)}\``
                    }).catch(() => null);
                    if (temp) setTimeout(() => temp.delete().catch(() => {}), 4000);
                    return;
                }

                let player = manager.getPlayer(message.guild.id);
                if (!player) {
                    player = await manager.createPlayer({
                        guildId: message.guild.id,
                        voiceId: voiceChannel.id,
                        textId: message.channel.id,
                        deaf: true
                    });
                }

                if (player.voiceId !== voiceChannel.id) {
                    player.setVoiceChannel(voiceChannel.id);
                }

                if (res.loadType === 'playlist') {
                    for (const t of res.tracks) player.queue.add(t);
                    if (!player.playing && !player.paused) player.play();
                    const temp = await message.channel.send({
                        content: `📚 **Enqueued Playlist:** \`${(res.playlist?.name || 'Playlist').substring(0, 45)}\` (**${res.tracks.length}** tracks) • ${message.author}`
                    }).catch(() => null);
                    if (temp) setTimeout(() => temp.delete().catch(() => {}), 4000);
                } else {
                    const track = res.tracks[0];
                    player.queue.add(track);
                    if (!player.playing && !player.paused) player.play();
                    const temp = await message.channel.send({
                        content: `🎵 **Added to Queue:** \`${track.title.substring(0, 55)}\` • ${message.author}`
                    }).catch(() => null);
                    if (temp) setTimeout(() => temp.delete().catch(() => {}), 3500);
                }

                await this.update(message.guild.id, client);
                return;
            } catch (kErr) {
                console.warn('⚠️ [MusicController Lavalink Fallback]:', kErr.message || kErr);
            }
        }

        // Route 2 (Fallback): Starry Native Audio Engine (Local playback / Termux)
        const player = StarryAudioEngine.getOrCreatePlayer(client, message.guild.id, voiceChannel, message.channel);
        player.connect().catch(() => {});

        try {
            const result = await StarryAudioEngine.search(content, message.author);
            if (!result || !result.tracks || result.tracks.length === 0) {
                const temp = await message.channel.send({
                    content: `❌ No audio results found for: \`${content.substring(0, 50)}\``
                }).catch(() => null);
                if (temp) setTimeout(() => temp.delete().catch(() => {}), 4000);
                return;
            }

            if (result.type === 'PLAYLIST') {
                for (const t of result.tracks) player.queue.push(t);
                if (!player.currentTrack) await player.playNext();
                const temp = await message.channel.send({
                    content: `📚 **Enqueued Playlist:** \`${(result.playlistName || 'Playlist').substring(0, 45)}\` (**${result.tracks.length}** tracks) • ${message.author}`
                }).catch(() => null);
                if (temp) setTimeout(() => temp.delete().catch(() => {}), 4000);
            } else {
                const track = result.tracks[0];
                player.queue.push(track);
                if (!player.currentTrack) await player.playNext();
                const temp = await message.channel.send({
                    content: `🎵 **Added to Queue:** \`${track.title.substring(0, 55)}\` • ${message.author}`
                }).catch(() => null);
                if (temp) setTimeout(() => temp.delete().catch(() => {}), 3500);
            }

            await this.update(message.guild.id, client);
        } catch (err) {
            console.error('❌ [Music Controller Request Error]:', err);
            const temp = await message.channel.send({
                content: `⚠️ Failed to resolve song: \`${err.message || 'Stream error'}\``
            }).catch(() => null);
            if (temp) setTimeout(() => temp.delete().catch(() => {}), 4000);
        }
    }

    async handleButtonInteraction(interaction, client) {
        const customId = interaction.customId;
        const guildId = interaction.guild?.id;
        if (!guildId) return false;

        let player = (interaction.client.manager ? interaction.client.manager.getPlayer(guildId) : null) || (client.manager ? client.manager.getPlayer(guildId) : null);
        if (!player && client.multiBot?.instances) {
            for (const inst of client.multiBot.instances.values()) {
                if (inst.client?.manager) {
                    const p = inst.client.manager.getPlayer(guildId);
                    if (p) { player = p; break; }
                }
            }
        }
        const isKazagumo = !!player;
        if (!player) {
            player = StarryAudioEngine.getPlayer(guildId);
        }
        const voiceChannel = interaction.member?.voice?.channel;

        // 1. Connect Bot
        if (customId === 'ctrl_connect') {
            if (!voiceChannel) {
                return interaction.reply({ 
                    content: '❌ You must be connected to a voice channel first!', 
                    flags: [EPHEMERAL_FLAG] 
                }).catch(() => {});
            }
            if (isKazagumo) {
                player.setVoiceChannel(voiceChannel.id);
            } else {
                const p = StarryAudioEngine.getOrCreatePlayer(client, guildId, voiceChannel, interaction.channel);
                await p.connect().catch(() => {});
            }
            await this.update(guildId, client);
            return interaction.reply({ 
                content: `👋 **Connected to voice channel:** <#${voiceChannel.id}>`, 
                flags: [EPHEMERAL_FLAG] 
            }).catch(() => {});
        }

        // 2. Queue Viewer
        if (customId === 'ctrl_queue') {
            if (isKazagumo) {
                const current = player.queue?.current;
                const tracks = player.queue ? player.queue.slice(0, 10) : [];
                if (!current && tracks.length === 0) {
                    return interaction.reply({ content: '❌ Queue is currently empty.', flags: [EPHEMERAL_FLAG] }).catch(() => {});
                }
                let qList = tracks.map((t, idx) => `\`${idx + 1}.\` **${(t.title || 'Track').substring(0, 55)}** (\`${formatTime(t.length)})\``).join('\n');
                if (!qList) qList = '*No upcoming songs.*';

                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle(`🎵 Current Music Queue • ${player.queue.length} Tracks`)
                    .setDescription(`▶️ **Now Playing:**\n**${current ? current.title : 'None'}**\n\n📜 **Upcoming Tracks:**\n${qList}`)
                    .setFooter({ text: 'Starry Controller System' });

                return interaction.reply({ embeds: [embed], flags: [EPHEMERAL_FLAG] }).catch(() => {});
            } else {
                if (!player || (!player.currentTrack && player.queue.length === 0)) {
                    return interaction.reply({ content: '❌ Queue is currently empty.', flags: [EPHEMERAL_FLAG] }).catch(() => {});
                }
                const current = player.currentTrack;
                const tracks = player.queue.slice(0, 10);
                let qList = tracks.map((t, idx) => `\`${idx + 1}.\` **${(t.title || 'Track').substring(0, 55)}** (\`${formatTime(t.duration)}\`)`).join('\n');
                if (!qList) qList = '*No upcoming songs.*';

                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle(`🎵 Current Music Queue • ${player.queue.length} Tracks`)
                    .setDescription(`▶️ **Now Playing:**\n**${current ? current.title : 'None'}**\n\n📜 **Upcoming Tracks:**\n${qList}`)
                    .setFooter({ text: 'Starry Controller System' });

                return interaction.reply({ embeds: [embed], flags: [EPHEMERAL_FLAG] }).catch(() => {});
            }
        }

        // 3. What's Next
        if (customId === 'ctrl_next_up') {
            const nextTrack = isKazagumo ? player.queue[0] : player?.queue[0];
            if (!nextTrack) {
                return interaction.reply({ 
                    content: '🔮 **What\'s Next:** *No upcoming tracks in queue.* Send a song name in this channel to add more!', 
                    flags: [EPHEMERAL_FLAG] 
                }).catch(() => {});
            }
            const durStr = formatTime(isKazagumo ? nextTrack.length : nextTrack.duration);
            return interaction.reply({ 
                content: `🔮 **What's Next:** \`${nextTrack.title}\` by \`${nextTrack.author || 'Artist'}\` (\`${durStr}\`)`, 
                flags: [EPHEMERAL_FLAG] 
            }).catch(() => {});
        }

        // Spotify Library Explorer
        if (customId === 'ctrl_spotify') {
            const spotifyManager = require('./spotifyManager');
            const data = await spotifyManager.getUserPlaylists(interaction.user.id);
            const total = data.savedPlaylists.length + data.oauthPlaylists.length;

            if (total === 0) {
                const emptyEmbed = new EmbedBuilder()
                    .setColor('#1DB954')
                    .setAuthor({ name: '🟢 Starry Spotify Library', iconURL: 'https://cdn-icons-png.flaticon.com/512/174/174872.png' })
                    .setTitle('No Spotify Playlists Linked Yet')
                    .setDescription(
                        `You haven't saved or linked any Spotify playlists yet!\n\n` +
                        `✨ **How to Add Playlists:**\n` +
                        `• Use \`,spotify save <playlist_url> [name]\` to bookmark any playlist\n` +
                        `• Use \`,spotify connect\` to link your personal Spotify account with OAuth\n\n` +
                        `Once added, you can 1-click play any of your playlists right from this controller!`
                    );

                const port = process.env.PORT || 10000;
                const { getPublicUrl } = require('../utils/tunnelManager');
                const publicUrl = getPublicUrl() || process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
                const redirectUri = `${publicUrl}/api/spotify/callback`;
                const authUrl = spotifyManager.getOAuthUrl(interaction.user.id, redirectUri);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel('Connect Spotify Account')
                        .setStyle(ButtonStyle.Link)
                        .setURL(authUrl)
                        .setEmoji('🟢')
                );

                return interaction.reply({ embeds: [emptyEmbed], components: [row], flags: [EPHEMERAL_FLAG] }).catch(() => {});
            }

            const embed = new EmbedBuilder()
                .setColor('#1DB954')
                .setAuthor({ name: `${interaction.user.username}'s Spotify Library`, iconURL: data.avatarUrl || interaction.user.displayAvatarURL() })
                .setTitle(`🟢 Choose a Spotify Playlist to Stream (${total} available)`)
                .setDescription('Select any of your saved or personal Spotify playlists below to stream immediately into your voice channel:');

            const options = [];
            data.savedPlaylists.slice(0, 15).forEach(p => {
                options.push({
                    label: p.name.substring(0, 45),
                    description: `${p.trackCount} tracks • Saved playlist`,
                    value: `play_sp_${p.url}`,
                    emoji: '🎵'
                });
            });
            data.oauthPlaylists.slice(0, 10).forEach(p => {
                if (options.length < 25) {
                    options.push({
                        label: p.name.substring(0, 45),
                        description: `${p.trackCount} tracks • ${p.isPublic ? 'Public' : 'Private'}`,
                        value: `play_sp_${p.url}`,
                        emoji: '🟢'
                    });
                }
            });

            const menu = new StringSelectMenuBuilder()
                .setCustomId('spotify_play_select')
                .setPlaceholder('▶️ Pick a playlist to play in voice...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(menu);
            return interaction.reply({ embeds: [embed], components: [row], flags: [EPHEMERAL_FLAG] }).catch(() => {});
        }

        // Spotify Direct Stream from Menu
        if (customId === 'spotify_play_select') {
            const selectedVal = interaction.values[0];
            if (!selectedVal || !selectedVal.startsWith('play_sp_')) return false;
            const playlistUrl = selectedVal.replace('play_sp_', '');

            if (!voiceChannel) {
                return interaction.reply({ 
                    content: '❌ You must join a voice channel first to start streaming!', 
                    flags: [EPHEMERAL_FLAG] 
                }).catch(() => {});
            }

            await interaction.deferReply({ flags: [EPHEMERAL_FLAG] }).catch(() => {});
            try {
                const spotifyManager = require('./spotifyManager');
                const res = await spotifyManager.playPlaylist(client, interaction.guild, voiceChannel, interaction.channel, playlistUrl, interaction.user);
                await this.update(guildId, client);

                return interaction.editReply({ 
                    content: `🟢 **Now Streaming:** \`${res.title}\` (**${res.trackCount}** tracks loaded into <#${voiceChannel.id}>)!` 
                }).catch(() => {});
            } catch (err) {
                return interaction.editReply({ 
                    content: `❌ Could not stream Spotify playlist: \`${err.message}\`` 
                }).catch(() => {});
            }
        }

        // 4. Premium & Vote & Dashboard
        if (customId === 'ctrl_premium') {
            const embed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setTitle('⭐ Starry Music Premium')
                .setDescription(
                    `Unlock the ultimate high-fidelity audio experience across all your servers!\n\n` +
                    `✨ **Features:**\n` +
                    `• **Physical Vibration Sub-Bass DSP** & 24/7 Mode\n` +
                    `• **Dedicated Worker Tokens** for 0s lag\n` +
                    `• **Spotify, SoundCloud & Web Resolution** with zero delay\n` +
                    `• **Global Autoplay Engine** with studio mastering\n\n` +
                    `Use \`,premium\` to view your tier or redeem an activation license.`
                )
                .setFooter({ text: 'Starry Premium System' });
            return interaction.reply({ embeds: [embed], flags: [EPHEMERAL_FLAG] }).catch(() => {});
        }

        if (customId === 'ctrl_vote') {
            return interaction.reply({ 
                content: '🌟 **Thank you for supporting Starry!**\nVote for us on top bot listings to earn free rewards, stardust, and bonus playtime!', 
                flags: [EPHEMERAL_FLAG] 
            }).catch(() => {});
        }

        if (customId === 'ctrl_dashboard') {
            const host = process.env.PUBLIC_DOMAIN || 'http://localhost:10000';
            return interaction.reply({ 
                content: `🎛️ **Web Audio Dashboard:**\nAccess your live audio control panel at: ${host}`, 
                flags: [EPHEMERAL_FLAG] 
            }).catch(() => {});
        }

        // Active Player Guards
        const hasTrack = isKazagumo ? (player.playing || !!player.queue?.current) : (player && !!player.currentTrack);
        if (!player || !hasTrack) {
            return interaction.reply({ content: '❌ No active music session playing right now.', flags: [EPHEMERAL_FLAG] }).catch(() => {});
        }

        if (!voiceChannel) {
            return interaction.reply({ content: '❌ You must be connected to a voice channel to use controller buttons!', flags: [EPHEMERAL_FLAG] }).catch(() => {});
        }

        // 5. Volume Down
        if (customId === 'ctrl_vol_down') {
            const curVol = player.volume || 100;
            const newVol = Math.max(10, curVol - 10);
            if (isKazagumo) await player.setVolume(newVol);
            else player.setVolume(newVol);
            await this.update(guildId, client);
            return interaction.reply({ content: `🔉 **Volume decreased to:** \`${newVol}%\``, flags: [EPHEMERAL_FLAG] }).catch(() => {});
        }

        // 6. Volume Up
        if (customId === 'ctrl_vol_up') {
            const curVol = player.volume || 100;
            const newVol = Math.min(150, curVol + 10);
            if (isKazagumo) await player.setVolume(newVol);
            else player.setVolume(newVol);
            await this.update(guildId, client);
            return interaction.reply({ content: `🔊 **Volume increased to:** \`${newVol}%\``, flags: [EPHEMERAL_FLAG] }).catch(() => {});
        }

        // 7. Pause / Resume
        if (customId === 'ctrl_pause_resume') {
            if (player.paused) {
                if (isKazagumo) await player.pause(false);
                else player.pause(false);
                await this.update(guildId, client);
                return interaction.reply({ content: '▶️ **Resumed audio playback!**', flags: [EPHEMERAL_FLAG] }).catch(() => {});
            } else {
                if (isKazagumo) await player.pause(true);
                else player.pause(true);
                await this.update(guildId, client);
                return interaction.reply({ content: '⏸️ **Paused audio playback!**', flags: [EPHEMERAL_FLAG] }).catch(() => {});
            }
        }

        // 8. Skip
        if (customId === 'ctrl_skip') {
            const skippedTitle = (isKazagumo ? player.queue?.current?.title : player.currentTrack?.title) || 'Current Track';
            player.skip();
            await this.update(guildId, client);
            return interaction.reply({ content: `⏭️ **Skipped:** \`${skippedTitle.substring(0, 50)}\``, flags: [EPHEMERAL_FLAG] }).catch(() => {});
        }

        // 9. Previous
        if (customId === 'ctrl_previous') {
            if (!isKazagumo && player.previous && player.previous()) {
                await this.update(guildId, client);
                return interaction.reply({ content: '⏮️ **Playing previous song from history!**', flags: [EPHEMERAL_FLAG] }).catch(() => {});
            }
            return interaction.reply({ content: '❌ No previous song found in history.', flags: [EPHEMERAL_FLAG] }).catch(() => {});
        }

        // 10. Shuffle
        if (customId === 'ctrl_shuffle') {
            if (isKazagumo) player.queue.shuffle();
            else player.shuffle();
            const qCount = isKazagumo ? player.queue.length : player.queue.length;
            await this.update(guildId, client);
            return interaction.reply({ content: `🔀 **Shuffled ${qCount} songs in queue!**`, flags: [EPHEMERAL_FLAG] }).catch(() => {});
        }

        // 11. Autoplay
        if (customId === 'ctrl_autoplay') {
            let isAp = false;
            if (isKazagumo) {
                const cur = player.data.get('autoplay') || false;
                player.data.set('autoplay', !cur);
                player.autoplay = !cur;
                isAp = !cur;
                if (isAp) {
                    const { triggerAutoplayBuffer } = require('../utils/musicManager');
                    triggerAutoplayBuffer(player, player.queue.length === 0 && !player.playing).catch(() => {});
                }
            } else {
                player.autoplay = !player.autoplay;
                isAp = player.autoplay;
            }
            await this.update(guildId, client);
            return interaction.reply({ 
                content: `📻 **Autoplay Smart Stream is now: ${isAp ? '🟢 ON' : '🔴 OFF'}**`, 
                flags: [EPHEMERAL_FLAG] 
            }).catch(() => {});
        }

        // 12. Stop
        if (customId === 'ctrl_stop') {
            if (isKazagumo) await player.destroy();
            else player.stop();
            await this.update(guildId, client);
            return interaction.reply({ content: '⏹️ **Stopped music playback and cleared the queue.**', flags: [EPHEMERAL_FLAG] }).catch(() => {});
        }

        // 13. Like Track
        if (customId === 'ctrl_like') {
            const track = isKazagumo ? {
                title: player.queue.current?.title,
                author: player.queue.current?.author,
                url: player.queue.current?.uri,
                thumbnail: player.queue.current?.thumbnail,
                duration: player.queue.current?.length
            } : player.currentTrack;

            if (!track || !track.title) return interaction.reply({ content: '❌ No active track to like.', flags: [EPHEMERAL_FLAG] }).catch(() => {});

            try {
                const embed = new EmbedBuilder()
                    .setColor('#E91E63')
                    .setTitle(`❤️ Liked Track: ${track.title}`)
                    .setURL(track.url || 'https://discord.gg')
                    .setDescription(`👤 **Artist:** \`${track.author || 'Artist'}\`\n🕒 **Duration:** \`${formatTime(track.duration)}\`\n🌐 **Server:** \`${interaction.guild.name}\``)
                    .setThumbnail(track.thumbnail || null);
                await interaction.user.send({ embeds: [embed] }).catch(() => {});
                if (isDbConnected()) {
                    await MusicController.updateOne(
                        { guildId },
                        { $push: { likedTracks: { title: track.title, author: track.author, url: track.url, addedBy: interaction.user.id } } }
                    ).catch(() => {});
                }
                return interaction.reply({ content: `❤️ **Saved "${track.title}" to your Liked Songs and DMs!**`, flags: [EPHEMERAL_FLAG] }).catch(() => {});
            } catch (e) {
                return interaction.reply({ content: `❤️ Liked **${track.title}**!`, flags: [EPHEMERAL_FLAG] }).catch(() => {});
            }
        }

        // 14. Dislike / Not for me
        if (customId === 'ctrl_dislike') {
            const trackTitle = (isKazagumo ? player.queue.current?.title : player.currentTrack?.title) || 'Current Song';
            player.skip();
            await this.update(guildId, client);
            return interaction.reply({ content: `👎 **Skipped "${trackTitle}" (Marked: Not for me)**`, flags: [EPHEMERAL_FLAG] }).catch(() => {});
        }

        // 15. Block Track
        if (customId === 'ctrl_block') {
            const trackTitle = (isKazagumo ? player.queue.current?.title : player.currentTrack?.title) || 'Current Song';
            if (isDbConnected()) {
                await MusicController.updateOne(
                    { guildId },
                    { $push: { blockedTracks: { query: trackTitle, blockedBy: interaction.user.id } } }
                ).catch(() => {});
            }
            player.skip();
            await this.update(guildId, client);
            return interaction.reply({ content: `🚫 **Blocked "${trackTitle}" from playing on this server.**`, flags: [EPHEMERAL_FLAG] }).catch(() => {});
        }

        // 16. DSP Filter Dropdown
        if (customId === 'ctrl_filter') {
            const selected = interaction.values[0] || 'empowering';
            if (isKazagumo) {
                const { applyKazagumoFilter } = require('../utils/musicManager');
                await applyKazagumoFilter(player, selected);
            } else {
                await player.setFilter(selected);
            }
            await this.update(guildId, client);
            return interaction.reply({ 
                content: `🎧 **Updated Audio DSP Filter:** \`${selected.toUpperCase()}\``, 
                flags: [EPHEMERAL_FLAG] 
            }).catch(() => {});
        }

        return false;
    }
}

const instance = new MusicControllerEngine();
module.exports = instance;
