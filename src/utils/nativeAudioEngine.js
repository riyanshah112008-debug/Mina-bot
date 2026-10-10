// ==========================================
// 🎵 MASTER HIGH-FIDELITY AUDIO ENGINE
// File Path: src/utils/nativeAudioEngine.js
// Multi-Platform Search Resolver • Direct Stream Encoder • DSP Filters • 100% Host-Anywhere
// ==========================================
require('dotenv').config();
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    StreamType,
    NoSubscriberBehavior
} = require('@discordjs/voice');
const play = require('play-dl');
const fetch = require('node-fetch');
const spotify = require('spotify-url-info')(fetch);
const fs = require('fs');
const { execFile } = require('child_process');
const prism = require('prism-media');
const streamResolver = require('./streamResolverClient');
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder,
    MessageFlags
} = require('discord.js');
const { getGuildLanguageSync, localizePayload, t } = require('./i18n');
const config = require('../config');

const EPHEMERAL_FLAG = (MessageFlags && MessageFlags.Ephemeral) ? MessageFlags.Ephemeral : 64;

// Audio DSP Filter FFmpeg argument definitions (Studio Mastering with Dynamic Limiter - ZERO Crackling & 100% Intact Vocals)
const FILTER_ARGS = {
    clear: ['-af', 'volume=1.0,alimiter=limit=0.98:attack=5:release=50:asc=true:level=false'],
    flat: ['-af', 'volume=1.0,alimiter=limit=0.98:attack=5:release=50:asc=true:level=false'],
    empowering: [
        '-af',
        'volume=0.78,' +
        'bass=g=6.2:f=50:w=0.6,' +
        'equalizer=f=40:width_type=q:w=1.2:g=2.8,' +
        'equalizer=f=250:width_type=q:w=1.2:g=-2.5,' +
        'equalizer=f=1000:width_type=q:w=1.0:g=1.2,' +
        'equalizer=f=3200:width_type=q:w=1.0:g=3.0,' +
        'equalizer=f=12000:width_type=q:w=1.0:g=2.2,' +
        'alimiter=limit=0.96:attack=7:release=100:asc=true:level=false'
    ],
    // 🔊 TRUE CLEAN SUB-BASS VIBRATION (Zero Clipping • Crystal-Clear Vocals):
    // Pre-attenuation volume=0.70 gives clean +3.5dB headroom.
    // Heavy 50Hz boost (+7.2dB) gives driver vibration rumble you can clearly feel.
    // Deep 38Hz resonance (+3.2dB) adds low-end punch.
    // Mud scoop at 250Hz (-3.0dB) isolates sub-bass so human vocals are never masked.
    // Vocal clarity boost at 3200Hz (+2.5dB) guarantees lyrics remain razor-sharp.
    // Limiter with release=100ms eliminates wave cycle modulation and vocal crackling!
    bass: [
        '-af',
        'volume=0.70,' +
        'bass=g=7.2:f=50:w=0.6,' +
        'equalizer=f=38:width_type=q:w=1.2:g=3.2,' +
        'equalizer=f=250:width_type=q:w=1.2:g=-3.0,' +
        'equalizer=f=3200:width_type=q:w=1.0:g=2.5,' +
        'alimiter=limit=0.95:attack=7:release=100:asc=true:level=false'
    ],
    '8d': ['-af', 'volume=0.92,apulsator=mode=sine:hz=0.125:amount=0.85:offset_l=0:offset_r=0.5,alimiter=limit=0.98:attack=7:release=100:asc=true:level=false'],
    nightcore: ['-af', 'volume=0.90,asetrate=48000*1.25,aresample=48000,atempo=1.0,equalizer=f=6000:width_type=q:w=1.0:g=-1.5,alimiter=limit=0.98:attack=7:release=100:asc=true:level=false'],
    daycore: ['-af', 'volume=0.86,asetrate=48000*0.85,aresample=48000,atempo=1.0,bass=g=3:f=60:w=0.6,alimiter=limit=0.98:attack=7:release=100:asc=true:level=false'],
    vaporwave: ['-af', 'volume=0.85,asetrate=48000*0.80,aresample=48000,atempo=1.0,aecho=0.8:0.85:50:0.25,bass=g=2.5:f=70:w=0.7,alimiter=limit=0.98:attack=7:release=100:asc=true:level=false'],
    lofi: ['-af', 'volume=0.88,lowpass=f=4000,bass=g=2.5:f=95:w=0.6,alimiter=limit=0.98:attack=7:release=100:asc=true:level=false'],
    reverb: ['-af', 'volume=0.85,asetrate=48000*0.88,aresample=48000,atempo=1.0,aecho=0.8:0.85:60|120:0.3|0.2,bass=g=2:f=60:w=0.6,alimiter=limit=0.98:attack=7:release=100:asc=true:level=false'],
    karaoke: ['-af', 'volume=0.92,stereotools=mlev=0.0:slev=1.1,equalizer=f=1000:width_type=q:w=1.5:g=-3.0,alimiter=limit=0.98:attack=7:release=100:asc=true:level=false'],
    surround: ['-af', 'volume=0.90,extrastereo=m=1.5,equalizer=f=3500:width_type=q:w=1.0:g=1.2,alimiter=limit=0.98:attack=7:release=100:asc=true:level=false'],
    electronic: ['-af', 'volume=0.75,bass=g=5:f=60:w=0.6,treble=g=3:f=9000:w=0.6,equalizer=f=280:width_type=q:w=1.2:g=-2.0,alimiter=limit=0.95:attack=7:release=100:asc=true:level=false'],
    soft: ['-af', 'volume=0.92,equalizer=f=7500:width_type=q:w=1.0:g=-3.0,equalizer=f=12000:width_type=q:w=1.0:g=-4.0,alimiter=limit=0.98:attack=7:release=100:asc=true:level=false'],
    radio: ['-af', 'volume=0.88,highpass=f=450,lowpass=f=3200,equalizer=f=1400:width_type=q:w=1.0:g=3.5,alimiter=limit=0.98:attack=7:release=100:asc=true:level=false'],
    treble: ['-af', 'volume=0.86,treble=g=4:f=8000:w=0.6,equalizer=f=12000:width_type=q:w=1.0:g=2.5,alimiter=limit=0.98:attack=7:release=100:asc=true:level=false'],
    pop: ['-af', 'volume=0.88,equalizer=f=220:width_type=q:w=1.2:g=-1.5,equalizer=f=1200:width_type=q:w=1.0:g=1.2,equalizer=f=3200:width_type=q:w=1.0:g=1.8,alimiter=limit=0.98:attack=7:release=100:asc=true:level=false']
};

// Aliases for seamless backwards compatibility
FILTER_ARGS.bassboost = FILTER_ARGS.bass;
FILTER_ARGS.vibrate = FILTER_ARGS.bass;
FILTER_ARGS.vibration = FILTER_ARGS.bass;
FILTER_ARGS.deepbass = FILTER_ARGS.bass;
FILTER_ARGS.subwoofer = FILTER_ARGS.bass;
FILTER_ARGS.slowed = FILTER_ARGS.daycore;
FILTER_ARGS['lo-fi'] = FILTER_ARGS.lofi;
FILTER_ARGS.chill = FILTER_ARGS.lofi;
FILTER_ARGS.slowreverb = FILTER_ARGS.reverb;
FILTER_ARGS.hall = FILTER_ARGS.reverb;
FILTER_ARGS.echo = FILTER_ARGS.reverb;
FILTER_ARGS.vocalremover = FILTER_ARGS.karaoke;
FILTER_ARGS.instrumental = FILTER_ARGS.karaoke;
FILTER_ARGS.vocalcut = FILTER_ARGS.karaoke;
FILTER_ARGS['3d'] = FILTER_ARGS.surround;
FILTER_ARGS.spatial = FILTER_ARGS.surround;
FILTER_ARGS.edm = FILTER_ARGS.electronic;
FILTER_ARGS.club = FILTER_ARGS.electronic;
FILTER_ARGS.mellow = FILTER_ARGS.soft;
FILTER_ARGS.relax = FILTER_ARGS.soft;
FILTER_ARGS.vintage = FILTER_ARGS.radio;

function getFilterArgs(filterName, volumePercent = 100) {
    const rawFilter = (filterName && FILTER_ARGS[filterName]) ? FILTER_ARGS[filterName] : FILTER_ARGS.empowering;
    const volScale = Math.max(0.05, Math.min(2.0, (volumePercent || 100) / 100));
    const filterStr = rawFilter[1];
    const adjustedFilterStr = filterStr.replace(/volume=([0-9.]+)/, (match, baseVol) => {
        const adjustedVol = (parseFloat(baseVol) * volScale).toFixed(2);
        return `volume=${adjustedVol}`;
    });
    return ['-af', adjustedFilterStr];
}

let scClientId = null;
let lastTokenRefresh = 0;

async function refreshSoundCloudToken() {
    const now = Date.now();
    if (scClientId && (now - lastTokenRefresh < 3600000)) return;
    try {
        const id = await play.getFreeClientID();
        if (id) {
            scClientId = id;
            await play.setToken({ soundcloud: { client_id: id } });
            lastTokenRefresh = now;
        }
    } catch (e) {}
}
refreshSoundCloudToken();

// ==========================================
// 🟢 OFFICIAL SPOTIFY API ENGINE
// Powered by SPOTIFY_CLIENT_ID & SPOTIFY_CLIENT_SECRET
// ==========================================
class SpotifyEngine {
    constructor() {
        this.clientId = process.env.SPOTIFY_CLIENT_ID || '';
        this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
        this.token = null;
        this.tokenExpiresAt = 0;
    }

    async getToken() {
        if (this.token && Date.now() < this.tokenExpiresAt) return this.token;
        if (!this.clientId || !this.clientSecret) return null;
        try {
            const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
            const res = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'grant_type=client_credentials'
            });
            const data = await res.json();
            if (data.access_token) {
                this.token = data.access_token;
                this.tokenExpiresAt = Date.now() + ((data.expires_in || 3600) - 120) * 1000;
                return this.token;
            }
        } catch (e) {
            console.warn('⚠️ [Spotify Engine] Auth token error:', e.message || e);
        }
        return null;
    }

    async searchTracks(query, limit = 10) {
        const token = await this.getToken();
        if (!token) return [];
        try {
            const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            return data.tracks?.items || [];
        } catch (e) {
            console.warn('⚠️ [Spotify Engine] Search error:', e.message || e);
            return [];
        }
    }

    async getTrack(trackId) {
        const token = await this.getToken();
        if (!token) return null;
        try {
            const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) return await res.json();
        } catch (e) {}
        return null;
    }

    async getAlbum(albumId) {
        const token = await this.getToken();
        if (!token) return null;
        try {
            const res = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return null;
            const album = await res.json();
            if (album && album.tracks && album.tracks.items) {
                let nextUrl = album.tracks.next;
                while (nextUrl && album.tracks.items.length < 300) {
                    try {
                        const nextRes = await fetch(nextUrl, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (!nextRes.ok) break;
                        const nextData = await nextRes.json();
                        if (nextData.items && nextData.items.length > 0) {
                            album.tracks.items.push(...nextData.items);
                            nextUrl = nextData.next;
                        } else break;
                    } catch (e) { break; }
                }
            }
            return album;
        } catch (e) {}
        return null;
    }

    async getPlaylist(playlistId) {
        const token = await this.getToken();
        if (!token) return null;
        try {
            const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return null;
            const pl = await res.json();
            if (pl && pl.tracks && pl.tracks.items) {
                let nextUrl = pl.tracks.next;
                while (nextUrl && pl.tracks.items.length < 300) {
                    try {
                        const nextRes = await fetch(nextUrl, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (!nextRes.ok) break;
                        const nextData = await nextRes.json();
                        if (nextData.items && nextData.items.length > 0) {
                            pl.tracks.items.push(...nextData.items);
                            nextUrl = nextData.next;
                        } else break;
                    } catch (e) { break; }
                }
            }
            return pl;
        } catch (e) {}
        return null;
    }

    async getArtistTopTracks(artistId) {
        const token = await this.getToken();
        if (!token) return [];
        try {
            const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                return data.tracks || [];
            }
        } catch (e) {}
        return [];
    }
}

const spotifyEngine = new SpotifyEngine();

function scoreTrackMatch(candidate, targetDurationMs, queryTitle, targetArtist) {
    let score = 100;
    const name = candidate.name || candidate.title || '';
    const lower = name.toLowerCase();
    const qLower = (queryTitle || '').toLowerCase();
    const artistLower = (targetArtist || '').toLowerCase();

    // 1. Hard filters: preview snippets (SoundCloud Go+ <= 45s)
    if ((candidate.durationInSec || 0) <= 45) return -1000;

    // 2. Strict rejection of non-original markers unless explicitly in query
    const nonOriginalBadWords = [
        'cover', 'acapella', 'a capella', 'remix', 'slowed', 'reverb', 
        'nightcore', 'daycore', 'mashup', 'lofi', 'lo-fi', 'instrumental', 
        'karaoke', '8d', '16d', 'bass boosted', 'tribute', 'parody',
        'audien', 'flip', 'bootleg', 'drill'
    ];

    for (const bad of nonOriginalBadWords) {
        if (lower.includes(bad) && !qLower.includes(bad)) {
            score -= 150;
        }
    }

    // Penalize mashups like ' x ' or ' vs '
    if ((lower.includes(' x ') || lower.includes(' vs ')) && !qLower.includes(' x ') && !qLower.includes(' vs ')) {
        score -= 80;
    }

    // 2.5 Exact Title Match & Anti-Relative Bonus
    const cleanLower = lower.replace(/\s*[\(\[\{][^\)\]\}]*[\)\]\}]/g, '').trim();
    if (lower === qLower || cleanLower === qLower) {
        score += 350;
    } else if (qLower && new RegExp('\\b' + qLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(lower)) {
        score += 200;
    }

    // 3. Rewards for official / original
    if (lower.includes('official') || lower.includes('original') || lower.includes('audio')) {
        score += 20;
    }

    // 4. Artist affinity bonus
    if (artistLower) {
        const primary = artistLower.split(',')[0].trim().toLowerCase();
        if (lower.includes(primary) || (candidate.user?.name && candidate.user.name.toLowerCase().includes(primary))) {
            score += 40;
        }
    }

    // 5. Duration Proximity matching against official Spotify duration
    if (targetDurationMs && candidate.durationInSec) {
        const diffSec = Math.abs(candidate.durationInSec * 1000 - targetDurationMs) / 1000;
        if (diffSec <= 5) score += 60;
        else if (diffSec <= 15) score += 35;
        else if (diffSec <= 30) score += 10;
        else if (diffSec > 60) score -= 50;
        else if (diffSec > 120) score -= 100;
    }

    return score;
}

function getDirectAudioStream(videoUrl) {
    return new Promise((resolve) => {
        execFile('yt-dlp', [
            '--js-runtimes', 'node',
            '--no-playlist',
            '-f', 'bestaudio/best',
            '-g',
            videoUrl
        ], { timeout: 12000 }, (err, stdout) => {
            if (err) return resolve(null);
            const url = stdout.trim().split('\n')[0];
            resolve(url || null);
        });
    });
}

function formatTime(ms) {
    if (!ms || isNaN(ms)) return '0:00';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function createProgressBar(currentMs, totalMs, length = 12) {
    if (!totalMs || totalMs <= 0) return '🔘' + '▬'.repeat(length - 1);
    const progress = Math.min(Math.max(currentMs / totalMs, 0), 1);
    const index = Math.round(progress * (length - 1));
    let bar = '';
    for (let i = 0; i < length; i++) {
        bar += (i === index) ? '🔘' : '▬';
    }
    return bar;
}

class StarryGuildPlayer {
    constructor(client, guildId, voiceChannel, textChannel) {
        this.client = client;
        this.guildId = guildId;
        this.voiceChannel = voiceChannel;
        this.textChannel = textChannel;
        this.queue = [];
        this.history = [];
        this.currentTrack = null;
        this.previousTrack = null;
        this.loop = 'none'; // 'none' | 'track' | 'queue'
        this.volume = 100;
        this.filter = 'empowering';
        this.is247 = false;
        this.autoplay = false;
        this.nowPlayingMessage = null;
        this.audioResource = null;
        this.paused = false;
        this.destroyed = false;
        this.isPlaying = false;
        this.playbackStartTime = 0;
        this.disconnectTimeout = null;
        this._isSeeking = false;

        // Initialize Discord.js AudioPlayer with Play on no-subscriber behavior and high jitter tolerance
        this.player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
                maxMissedFrames: 250
            }
        });
        this.connection = null;

        this.setupPlayerEvents();
    }

    get position() {
        if (!this.currentTrack || this.playbackStartTime === 0) return 0;
        if (this.paused) return this._pausedPosition || 0;
        return Date.now() - this.playbackStartTime;
    }

    setupPlayerEvents() {
        this.player.on(AudioPlayerStatus.Playing, () => {
            this.isPlaying = true;
        });

        this.player.on(AudioPlayerStatus.Idle, () => {
            if (this.destroyed || this._isSeeking) return;
            if (this.isPlaying) {
                this.isPlaying = false;
                this.handleTrackEnd();
            } else if (this.currentTrack) {
                // If stream died immediately without playing (e.g. 0-byte stream / 403 / network drop)
                console.warn(`⚠️ [Audio Stream Failover] Track "${this.currentTrack.title}" ended before playing. Advancing...`);
                this.handleTrackEnd();
            }
        });

        this.player.on('error', (error) => {
            console.warn(`⚠️ [Audio Stream Engine Status in ${this.guildId}]:`, error.message || error);
            if (this.destroyed) return;
            this.isPlaying = false;
            this.handleTrackEnd();
        });
    }

    async connect() {
        if (this.disconnectTimeout) {
            clearTimeout(this.disconnectTimeout);
            this.disconnectTimeout = null;
        }

        const botId = this.client?.user?.id;
        const botGroup = botId || 'default';
        const clientGuild = (this.client?.guilds?.cache?.get(this.guildId)) || this.voiceChannel?.guild;
        const adapterCreator = clientGuild?.voiceAdapterCreator || this.voiceChannel?.guild?.voiceAdapterCreator;

        const isDead = !this.connection || 
            this.connection.state.status === VoiceConnectionStatus.Destroyed || 
            this.connection.state.status === VoiceConnectionStatus.Disconnected;

        if (isDead) {
            try {
                const kPlayer = this.client?.manager?.getPlayer(this.guildId);
                if (kPlayer) kPlayer.destroy();
            } catch (_) {}

            this.connection = joinVoiceChannel({
                channelId: this.voiceChannel.id,
                guildId: this.guildId,
                adapterCreator: adapterCreator,
                selfDeaf: true,
                selfMute: false,
                group: botGroup
            });

            this.connection.on('stateChange', (oldState, newState) => {
                console.log(`🎙️ [VoiceConnection ${this.guildId}:${this.client?.user?.username || botGroup}] ${oldState.status} -> ${newState.status}`);
            });

            this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
                try {
                    await Promise.race([
                        entersState(this.connection, VoiceConnectionStatus.Signalling, 5000),
                        entersState(this.connection, VoiceConnectionStatus.Connecting, 5000)
                    ]);
                } catch (e) {
                    if (!this.is247) {
                        this.destroy();
                    }
                }
            });
        }

        if (this.connection.state.status !== VoiceConnectionStatus.Ready) {
            try {
                await entersState(this.connection, VoiceConnectionStatus.Ready, 15000);
            } catch (e) {
                console.warn(`⚠️ [VoiceConnection ${this.guildId}:${this.client?.user?.username || botGroup}] Handshake notice:`, e.message || e);
            }
        }

        this.connection.subscribe(this.player);
        return this.connection;
    }

    async playNext() {
        if (this.destroyed) return;

        if (this.queue.length === 0) {
            const hadTrack = !!this.currentTrack;
            if (this.currentTrack) {
                this.history.push(this.currentTrack);
                this.previousTrack = this.currentTrack;
            }
            this.currentTrack = null;
            this.isPlaying = false;

            if (this.nowPlayingMessage) {
                await this.nowPlayingMessage.delete().catch(() => {});
                this.nowPlayingMessage = null;
            }

            // High-Intelligence Autoplay Recommendation
            if (this.autoplay && this.previousTrack) {
                try {
                    const nextSong = await StarryAudioEngine.getAutoplayRecommendation(this.previousTrack, this.history);
                    if (nextSong) {
                        if (this.textChannel) {
                            const autoEmbed = new EmbedBuilder()
                                .setColor('#5865F2')
                                .setAuthor({ 
                                    name: '📻 Autoplay Recommendation • Smart Stream', 
                                    iconURL: 'https://cdn.discordapp.com/emojis/1049283733054177301.webp?size=96' 
                                })
                                .setTitle(nextSong.title ? nextSong.title.substring(0, 90) : 'Recommended Song')
                                .setDescription(`🎵 Playing next recommended song by **${nextSong.author}**!\n*Mastering: Empowering Hi-Fi Active*`)
                                .setFooter({ text: 'Continuous playback active • Click 📻 in player or use ,autoplay to toggle' });
                            this.textChannel.send({ embeds: [autoEmbed] }).catch(() => {});
                        }
                        this.queue.push(nextSong);
                        return this.playNext();
                    }
                } catch (e) {
                    console.warn('⚠️ [Autoplay Error]:', e.message || e);
                }
            }

            if (hadTrack && !this.destroyed) {
                if (this.textChannel) {
                    const lang = this.guildId ? getGuildLanguageSync(this.guildId) : 'en';
                    this.textChannel.send(t(lang, 'music.queue_ended', { play_cmd: '`,play <song>`' })).catch(() => {});
                }
                try { require('../modules/musicController').update(this.guildId, this.client); } catch (e) {}
            }

            if (!this.is247) {
                this.disconnectTimeout = setTimeout(() => {
                    if (this.queue.length === 0 && !this.currentTrack) {
                        this.destroy();
                    }
                }, 60000);
            }
            return;
        }

        return this.playTrack();
    }

    createFilteredResource(streamOrPath, isFile = false, customHeaders = null) {
        const activeFilter = getFilterArgs(this.filter, this.volume);

        try {
            if (isFile) {
                const isUrl = typeof streamOrPath === 'string' && (streamOrPath.startsWith('http://') || streamOrPath.startsWith('https://'));
                let inputArgs = [];
                if (isUrl) {
                    inputArgs.push(
                        '-reconnect', '1',
                        '-reconnect_streamed', '1',
                        '-reconnect_at_eof', '1',
                        '-reconnect_delay_max', '3',
                        '-rw_timeout', '15000000',
                        '-buffer_size', '2048k',
                        '-analyzeduration', '0',
                        '-probesize', '65536'
                    );
                    if (customHeaders && typeof customHeaders === 'object' && Object.keys(customHeaders).length > 0) {
                        const headerStr = Object.entries(customHeaders).map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n';
                        inputArgs.push('-headers', headerStr);
                    } else {
                        inputArgs.push('-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                    }
                    inputArgs.push('-i', streamOrPath);
                } else {
                    inputArgs.push('-i', streamOrPath);
                }

                const ffmpeg = new prism.FFmpeg({
                    args: [
                        ...inputArgs,
                        ...activeFilter,
                        '-c:a', 'libopus',
                        '-b:a', '128k',
                        '-vbr', 'on',
                        '-f', 'opus'
                    ]
                });
                ffmpeg.on('error', err => console.warn('⚠️ [FFmpeg File Filter Notice]:', err.message || err));
                return createAudioResource(ffmpeg, {
                    inputType: StreamType.OggOpus
                });
            } else {
                const ffmpeg = new prism.FFmpeg({
                    args: [
                        '-analyzeduration', '0',
                        '-probesize', '65536',
                        '-loglevel', '0',
                        '-i', 'pipe:0',
                        ...activeFilter,
                        '-c:a', 'libopus',
                        '-b:a', '128k',
                        '-vbr', 'on',
                        '-f', 'opus'
                    ]
                });
                ffmpeg.on('error', err => console.warn('⚠️ [FFmpeg Stream Filter Notice]:', err.message || err));
                if (typeof streamOrPath.on === 'function') {
                    streamOrPath.on('error', err => console.warn('⚠️ [Input Audio Stream Notice]:', err.message || err));
                }
                streamOrPath.pipe(ffmpeg);
                return createAudioResource(ffmpeg, {
                    inputType: StreamType.OggOpus
                });
            }
        } catch (e) {
            console.warn('⚠️ [Audio Filter Fallback]:', e.message || e);
            return createAudioResource(streamOrPath, {
                inputType: isFile ? StreamType.Arbitrary : StreamType.Arbitrary
            });
        }
    }

    async playTrack() {
        if (this.queue.length === 0) {
            this.currentTrack = null;
            this.isPlaying = false;
            if (!this.is247) {
                if (this.disconnectTimeout) clearTimeout(this.disconnectTimeout);
                this.disconnectTimeout = setTimeout(() => {
                    if (this.queue.length === 0 && !this.currentTrack) {
                        this.destroy();
                    }
                }, 60000);
            }
            return;
        }

        const track = this.queue.shift();
        if (this.currentTrack) {
            this.history.push(this.currentTrack);
            this.previousTrack = this.currentTrack;
        }
        this.currentTrack = track;

        try {
            await this.connect();
            let targetUrl = track.url;
            let audioResource = null;

            // 1. Direct SoundCloud link
            if (targetUrl && targetUrl.includes('soundcloud.com/')) {
                try {
                    await refreshSoundCloudToken();
                    const stream = await play.stream(targetUrl, { quality: 2 });
                    if (stream && stream.stream) {
                        audioResource = this.createFilteredResource(stream.stream, false);
                    }
                } catch (scErr) {}
            }

            // 2. Local Studio Audio Stream via StreamResolver Engine (if available)
            if (!audioResource && streamResolver && !streamResolver.disabled) {
                try {
                    const primaryArtist = (track.author || '').split(',')[0].trim();
                    let query = `${primaryArtist} ${track.title}`.trim();
                    if (targetUrl && (targetUrl.includes('youtube.com/') || targetUrl.includes('youtu.be/') || targetUrl.includes('soundcloud.com/'))) {
                        query = targetUrl;
                    }

                    const resolved = await streamResolver.resolve(query);
                    if (resolved) {
                        if (resolved.file && fs.existsSync(resolved.file)) {
                            track._resolvedFile = resolved.file;
                            audioResource = this.createFilteredResource(resolved.file, true);
                        } else if (resolved.url) {
                            audioResource = this.createFilteredResource(resolved.url, true, resolved.headers);
                        }
                    }
                } catch (srErr) {}
            }

            // 3. Primary Cloud Streamer: Pure JS SoundCloud Streaming via play-dl (320kbps Hi-Fi)
            if (!audioResource) {
                try {
                    await refreshSoundCloudToken();
                    const primaryArtist = (track.author || '').split(',')[0].trim();
                    const scSearchQuery = `${primaryArtist} ${track.title}`.trim() || track.title;
                    let scResults = await play.search(scSearchQuery, { source: { soundcloud: 'tracks' }, limit: 1 }).catch(() => []);
                    if (!scResults || scResults.length === 0) {
                        scResults = await play.search(track.title, { source: { soundcloud: 'tracks' }, limit: 1 }).catch(() => []);
                    }
                    const targetSc = scResults?.[0];
                    const scUrl = targetSc?.permalink || targetSc?.url;
                    if (scUrl) {
                        const stream = await play.stream(scUrl, { quality: 2 }).catch(() => null);
                        if (stream && stream.stream) {
                            audioResource = this.createFilteredResource(stream.stream, false);
                        }
                    }
                } catch (scErr) {
                    console.warn('⚠️ [SoundCloud Streamer Fallback]:', scErr.message || scErr);
                }
            }

            // 4. Secondary Cloud Streamer: YouTube Audio via streamResolver, play-dl or @distube/ytdl-core
            if (!audioResource) {
                try {
                    let ytUrl = targetUrl;
                    if (!ytUrl || (!ytUrl.includes('youtube.com/') && !ytUrl.includes('youtu.be/'))) {
                        let ytSearch = await play.search(`${track.author || ''} ${track.title}`.trim(), { limit: 1 }).catch(() => []);
                        if (!ytSearch || ytSearch.length === 0) {
                            ytSearch = await play.search(track.title, { limit: 1 }).catch(() => []);
                        }
                        if (ytSearch && ytSearch[0]) ytUrl = ytSearch[0].url;
                    }
                    if (ytUrl) {
                        if (streamResolver && !streamResolver.disabled) {
                            const res = await streamResolver.resolve(ytUrl);
                            if (res && res.url) {
                                audioResource = this.createFilteredResource(res.url, true, res.headers);
                            }
                        }
                        if (!audioResource) {
                            try {
                                const stream = await play.stream(ytUrl, { quality: 2 });
                                if (stream && stream.stream) {
                                    audioResource = this.createFilteredResource(stream.stream, false);
                                }
                            } catch (pErr) {
                                const ytdl = require('@distube/ytdl-core');
                                const ytdlStream = ytdl(ytUrl, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
                                audioResource = this.createFilteredResource(ytdlStream, false);
                            }
                        }
                    }
                } catch (ytErr) {
                    console.warn('⚠️ [YouTube Streamer Fallback]:', ytErr.message || ytErr);
                }
            }

            // 5. Direct Media URL Fallback (mp3, wav, ogg, m4a)
            if (!audioResource && targetUrl && (targetUrl.endsWith('.mp3') || targetUrl.endsWith('.wav') || targetUrl.endsWith('.ogg') || targetUrl.endsWith('.m4a'))) {
                try {
                    audioResource = this.createFilteredResource(targetUrl, true);
                } catch (urlErr) {}
            }

            if (!audioResource) {
                throw new Error('Could not resolve audio stream for track: ' + track.title);
            }

            this.audioResource = audioResource;
            if (this.audioResource.volume) {
                this.audioResource.volume.setVolume(this.volume / 100);
            }

            if (this.connection) {
                this.connection.subscribe(this.player);
            }

            this.player.play(this.audioResource);
            this.paused = false;
            this.playbackStartTime = Date.now();
            this._pausedPosition = 0;

            if (this.loadingMessage) {
                this.loadingMessage.delete().catch(() => {});
                this.loadingMessage = null;
            }

            await this.sendNowPlayingPanel(track, true);
            try { require('../modules/musicController').update(this.guildId, this.client); } catch (e) {}

        } catch (err) {
            console.error(`⚠️ [Playback Exception for "${track.title}"]:`, err.message || err);
            if (this.loadingMessage) {
                this.loadingMessage.delete().catch(() => {});
                this.loadingMessage = null;
            }
            if (this.textChannel) {
                this.textChannel.send(`⚠️ Could not stream **${track.title}**: ${err.message || 'Source stream unreachable'}`).catch(() => {});
            }
            this.handleTrackEnd();
        }
    }

    handleTrackEnd() {
        if (this.loop === 'track' && this.currentTrack) {
            this.queue.unshift(this.currentTrack);
        } else if (this.loop === 'queue' && this.currentTrack) {
            this.queue.push(this.currentTrack);
        }
        this.playNext();
    }

    buildNowPlayingPayload(track) {
        if (!track) return null;
        const fallbackThumb = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
        const trackThumb = (track.thumbnail && !track.thumbnail.includes('imgur.com')) 
            ? track.thumbnail 
            : (this.client.user?.displayAvatarURL({ dynamic: true }) || fallbackThumb);

        const filterName = (this.filter === 'clear' || !this.filter || this.filter === 'empowering')
            ? 'Empowering Master (Hi-Fi)'
            : this.filter.toUpperCase();

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({ 
                name: `Now Playing • ${this.client.user?.username || 'Starry Audio'}`, 
                iconURL: 'https://cdn.discordapp.com/emojis/1049283733054177301.webp?size=96' 
            })
            .setTitle(track.title ? track.title.substring(0, 95) : 'Audio Track')
            .setURL(track.url || 'https://discord.gg')
            .setThumbnail(trackThumb)
            .setDescription(
                `ℹ️ **Song Details**\n` +
                `▶️ **Status:** ${this.paused ? '⏸️ Paused' : 'Playing'} | ⚙️ **Loop:** ${this.loop === 'none' ? 'Off' : this.loop === 'track' ? '🔂 Track' : '🔁 Queue'}\n` +
                `🕒 **Duration:** ${formatTime(track.duration)} | 🔊 **Volume:** ${this.volume}%\n` +
                `👤 **Requester:** ${track.requester ? `<@${track.requester.id}>` : 'Unknown'}\n` +
                `🌐 **Source:** ${track.source || 'Studio Master'}\n` +
                `🎛️ **Mastering:** \`${filterName}\`\n` +
                `🔠 **Queue:** \`${this.queue.length}\` songs remaining\n\n` +
                `⚙️ **Playback & Empowering DSP (1-Year Response Lifetime)**\n` +
                `Use the interactive controls below to manage your audio session.`
            )
            .setFooter({ text: `Starry Music Engine • Bot: ${this.client.user ? this.client.user.tag : 'Starry'}`, iconURL: this.client.user ? this.client.user.displayAvatarURL() : undefined });

        // Row 1: 4 buttons (No mobile wrapping)
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('music_pause')
                .setEmoji(this.paused ? '▶️' : '⏸️')
                .setLabel(this.paused ? 'Resume' : 'Pause')
                .setStyle(this.paused ? ButtonStyle.Success : ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('music_skip').setEmoji('⏭️').setLabel('Skip').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('music_loop').setEmoji('🔁').setLabel('Loop').setStyle(this.loop !== 'none' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('music_stop').setEmoji('⏹️').setLabel('Stop').setStyle(ButtonStyle.Danger)
        );

        // Row 2: 4 buttons (No mobile wrapping)
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('dj_vol_down').setEmoji('🔉').setLabel('Vol -').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('dj_vol_up').setEmoji('🔊').setLabel('Vol +').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('dj_shuffle').setEmoji('🔀').setLabel('Shuffle').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('music_queue').setEmoji('📜').setLabel('Queue').setStyle(ButtonStyle.Secondary)
        );

        // Row 3: Voice Channel Security + Autoplay Smart Stream Toggle
        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('music_autoplay')
                .setEmoji('📻')
                .setLabel(this.autoplay ? 'Autoplay: ON' : 'Autoplay: OFF')
                .setStyle(this.autoplay ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('dj_lock').setEmoji('🔒').setLabel('Lock VC').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('dj_unlock').setEmoji('🔓').setLabel('Unlock VC').setStyle(ButtonStyle.Success)
        );

        // Row 4: High-Fidelity Audio DSP Filters
        const filterRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('music_filter').setPlaceholder('🎧 Select Audio Filter / Sound FX...').addOptions([
                { label: '⭐ Studio Hi-Fi Master (Empowering)', description: 'Audiophile punch, deep sub-bass, silky vocals & wide stage', value: 'empowering', emoji: '✨' },
                { label: 'Clear / Flat Studio', description: 'Raw, pristine uncolored studio audio', value: 'clear', emoji: '🚫' },
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
                { label: 'Pop & Vocal Clarity', description: 'Enhanced vocal presence with clean highs', value: 'pop', emoji: '🎙️' }
            ])
        );

        const lang = this.guildId ? getGuildLanguageSync(this.guildId) : 'en';
        return localizePayload({
            embeds: [embed],
            components: [row1, row2, row3, filterRow]
        }, lang);
    }

    async sendNowPlayingPanel(track, updateOnly = false) {
        if (!this.textChannel) return;

        try {
            const musicController = require('../modules/musicController');
            if (musicController.isRequestChannel(this.guildId, this.textChannel.id)) {
                await musicController.update(this.guildId, this.client).catch(() => {});
                return;
            }
        } catch (ctrlErr) {}

        const panelPayload = this.buildNowPlayingPayload(track);
        if (!panelPayload) return;

        if (updateOnly && this.nowPlayingMessage) {
            try {
                await this.nowPlayingMessage.edit(panelPayload);
                return;
            } catch (e) {}
        }

        if (this.nowPlayingMessage) {
            await this.nowPlayingMessage.delete().catch(() => {});
            this.nowPlayingMessage = null;
        }

        this.nowPlayingMessage = await this.textChannel.send(panelPayload).catch(() => null);
    }

    pause(shouldPause) {
        if (shouldPause === undefined) {
            shouldPause = (this.player.state.status === AudioPlayerStatus.Playing);
        }
        if (shouldPause) {
            this._pausedPosition = this.position;
            this.player.pause();
            this.paused = true;
            try { require('../modules/musicController').update(this.guildId, this.client); } catch (e) {}
            return true;
        } else {
            this.playbackStartTime = Date.now() - (this._pausedPosition || 0);
            this.player.unpause();
            this.paused = false;
            try { require('../modules/musicController').update(this.guildId, this.client); } catch (e) {}
            return false;
        }
    }

    skip() {
        this.player.stop();
        return true;
    }

    stop() {
        this.queue = [];
        this.currentTrack = null;
        this.player.stop();
        if (this.loadingMessage) {
            this.loadingMessage.delete().catch(() => {});
            this.loadingMessage = null;
        }
        if (this.nowPlayingMessage) {
            this.nowPlayingMessage.delete().catch(() => {});
            this.nowPlayingMessage = null;
        }
        try { require('../modules/musicController').update(this.guildId, this.client); } catch (e) {}
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(200, vol));
        if (this.currentTrack && this.isPlaying) {
            const currentPosSec = Math.max(0, Math.floor(this.position / 1000));
            this.seekTo(currentPosSec).catch(() => {});
        }
        try { require('../modules/musicController').update(this.guildId, this.client); } catch (e) {}
    }

    async setFilter(filterName) {
        this.filter = filterName;
        if (this.currentTrack && this.isPlaying) {
            const currentPosSec = Math.max(0, Math.floor(this.position / 1000));
            await this.seekTo(currentPosSec);
        }
        if (this.currentTrack && this.nowPlayingMessage) {
            await this.sendNowPlayingPanel(this.currentTrack, true);
        }
        try { require('../modules/musicController').update(this.guildId, this.client); } catch (e) {}
    }

    async seekTo(seconds) {
        if (!this.currentTrack) return false;
        try {
            const track = this.currentTrack;
            let file = track._resolvedFile;
            if (!file || !fs.existsSync(file)) {
                const primaryArtist = (track.author || '').split(',')[0].trim();
                let query = `${primaryArtist} ${track.title} Official Audio`.trim();
                if (track.url && (track.url.includes('youtube.com/') || track.url.includes('youtu.be/'))) {
                    query = track.url;
                }
                let resolved = await streamResolver.resolve(query);
                if (!resolved || !resolved.file) {
                    resolved = await streamResolver.resolve(`${primaryArtist} ${track.title}`.trim());
                }
                if (resolved && resolved.file) {
                    file = resolved.file;
                    track._resolvedFile = file;
                }
            }

            if (file && fs.existsSync(file)) {
                const activeFilter = getFilterArgs(this.filter, this.volume);

                const ffmpeg = new prism.FFmpeg({
                    args: [
                        '-ss', seconds.toString(),
                        '-i', file,
                        ...activeFilter,
                        '-c:a', 'libopus',
                        '-b:a', '128k',
                        '-vbr', 'on',
                        '-f', 'opus'
                    ]
                });

                const audioResource = createAudioResource(ffmpeg, {
                    inputType: StreamType.OggOpus
                });

                this.audioResource = audioResource;
                this._isSeeking = true;
                this.player.play(this.audioResource);
                this.paused = false;
                this.playbackStartTime = Date.now() - (seconds * 1000);
                this._pausedPosition = 0;
                setTimeout(() => { this._isSeeking = false; }, 600);
                return true;
            } else {
                let targetUrl = track.url;
                if (!targetUrl || (!targetUrl.includes('soundcloud.com/') && !targetUrl.includes('youtube.com/'))) {
                    const primaryArtist = (track.author || '').split(',')[0].trim();
                    const scResults = await play.search(`${primaryArtist} ${track.title}`.trim(), { source: { soundcloud: 'tracks' }, limit: 1 }).catch(() => []);
                    targetUrl = scResults?.[0]?.permalink || scResults?.[0]?.url;
                }
                if (targetUrl) {
                    const stream = await play.stream(targetUrl, { seek: seconds, quality: 2 }).catch(() => null);
                    if (stream && stream.stream) {
                        const audioResource = this.createFilteredResource(stream.stream, false);
                        this.audioResource = audioResource;
                        this._isSeeking = true;
                        this.player.play(this.audioResource);
                        this.paused = false;
                        this.playbackStartTime = Date.now() - (seconds * 1000);
                        this._pausedPosition = 0;
                        setTimeout(() => { this._isSeeking = false; }, 600);
                        return true;
                    }
                }
            }
        } catch (e) {
            console.warn('⚠️ [Seek / Filter Hot-Swap Notice]:', e.message || e);
        }
        return false;
    }

    shuffle() {
        for (let i = this.queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
        }
    }

    jump(position) {
        const index = position - 1;
        if (index < 0 || index >= this.queue.length) return false;
        this.queue = this.queue.slice(index);
        this.skip();
        return true;
    }

    move(from, to) {
        const fromIdx = from - 1;
        const toIdx = to - 1;
        if (fromIdx < 0 || fromIdx >= this.queue.length || toIdx < 0 || toIdx >= this.queue.length) return false;
        const [moved] = this.queue.splice(fromIdx, 1);
        this.queue.splice(toIdx, 0, moved);
        return true;
    }

    remove(position) {
        const index = position - 1;
        if (index < 0 || index >= this.queue.length) return null;
        return this.queue.splice(index, 1)[0];
    }

    clearQueue() {
        const count = this.queue.length;
        this.queue = [];
        return count;
    }

    replay() {
        if (!this.currentTrack) return false;
        this.queue.unshift(this.currentTrack);
        this.skip();
        return true;
    }

    previous() {
        if (this.history.length === 0) return false;
        const prev = this.history.pop();
        if (this.currentTrack) this.queue.unshift(this.currentTrack);
        this.queue.unshift(prev);
        this.skip();
        return true;
    }

    destroy() {
        this.destroyed = true;
        this.stop();
        if (this.connection) {
            try {
                this.connection.destroy();
            } catch (e) {}
            this.connection = null;
        }
        const botId = this.client?.user?.id;
        if (botId) {
            StarryAudioEngine.players.delete(`${this.guildId}:${botId}`);
        }
        if (StarryAudioEngine.players.get(this.guildId) === this) {
            StarryAudioEngine.players.delete(this.guildId);
        }
    }
}

class StarryAudioEngine {
    static players = new Map();

    static getPlayer(guildId, client = null) {
        if (!guildId) return null;
        if (client?.user?.id) {
            const botKey = `${guildId}:${client.user.id}`;
            const player = this.players.get(botKey);
            if (player && !player.destroyed) return player;
        }
        const standard = this.players.get(guildId);
        if (standard && !standard.destroyed) return standard;

        // Fallback: search for any active player in this guild
        for (const [key, p] of this.players.entries()) {
            if (key.startsWith(`${guildId}:`) && !p.destroyed) {
                return p;
            }
        }
        return null;
    }

    static getOrCreatePlayer(client, guildId, voiceChannel, textChannel) {
        const botId = client?.user?.id;
        const key = botId ? `${guildId}:${botId}` : guildId;
        let player = this.players.get(key);
        if (!player || player.destroyed) {
            player = new StarryGuildPlayer(client, guildId, voiceChannel, textChannel);
            this.players.set(key, player);
            this.players.set(guildId, player);
        } else {
            player.client = client;
            if (voiceChannel) player.voiceChannel = voiceChannel;
            if (textChannel) player.textChannel = textChannel;
        }
        return player;
    }

    static async search(rawQuery, requester) {
        const tracks = [];
        await refreshSoundCloudToken();
        let query = rawQuery.trim();

        // 0. Resolve shortlinks / redirects (youtu.be, on.soundcloud.com, spotify.link, deezer.page.link)
        if (query.startsWith('http://') || query.startsWith('https://')) {
            if (query.includes('youtu.be/') || query.includes('on.soundcloud.com/') || query.includes('spotify.link/') || query.includes('deezer.page.link/')) {
                try {
                    const headRes = await fetch(query, { method: 'HEAD', redirect: 'follow', timeout: 6000 });
                    if (headRes.url) query = headRes.url;
                } catch (e) {}
            }
        }

        // 1. YouTube Playlists (Standard public, unlisted, music.youtube, or watch?v=...&list=...)
        if ((query.includes('youtube.com/') || query.includes('youtu.be/') || query.includes('music.youtube.com/')) && (query.includes('list=') || query.includes('/playlist'))) {
            try {
                const pl = await streamResolver.resolvePlaylist(query);
                if (pl && pl.tracks && pl.tracks.length > 0) {
                    for (const t of pl.tracks) {
                        tracks.push({
                            title: t.title,
                            author: t.author || pl.author || 'YouTube Artist',
                            url: t.url,
                            duration: t.duration || 180000,
                            thumbnail: t.thumbnail || pl.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
                            source: 'YouTube Playlist',
                            requester
                        });
                    }
                    return {
                        type: 'PLAYLIST',
                        tracks,
                        playlistName: pl.title || 'YouTube Playlist',
                        author: pl.author || 'Curator',
                        thumbnail: pl.thumbnail,
                        source: 'YouTube'
                    };
                }
            } catch (e) {
                console.warn('⚠️ [YouTube Playlist Resolution Error]:', e.message || e);
            }
        }

        // 2. YouTube Single Video URL
        if (query.includes('youtube.com/watch') || query.includes('youtu.be/') || query.includes('youtube.com/shorts/') || query.includes('music.youtube.com/watch')) {
            try {
                const vInfo = await play.video_basic_info(query).catch(() => null);
                if (vInfo && vInfo.video_details) {
                    const d = vInfo.video_details;
                    tracks.push({
                        title: d.title || 'YouTube Audio',
                        author: d.channel?.name || 'YouTube Creator',
                        url: d.url,
                        duration: (d.durationInSec || 180) * 1000,
                        thumbnail: d.thumbnails?.[0]?.url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
                        source: 'YouTube',
                        requester
                    });
                    return { type: 'TRACK', tracks };
                }
            } catch (e) {}
        }

        // 3. Spotify URLs (Track, Playlist, Album, Artist)
        if (query.includes('spotify.com')) {
            try {
                // 3a. Single Track
                const trackMatch = query.match(/track\/([a-zA-Z0-9]+)/);
                if (trackMatch && trackMatch[1]) {
                    let spTrack = await spotifyEngine.getTrack(trackMatch[1]);
                    if (spTrack) {
                        tracks.push({
                            title: spTrack.name,
                            author: spTrack.artists?.map(a => a.name).join(', ') || 'Spotify Artist',
                            album: spTrack.album?.name || 'Spotify Album',
                            url: spTrack.external_urls?.spotify || query,
                            duration: spTrack.duration_ms || 180000,
                            thumbnail: spTrack.album?.images?.[0]?.url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
                            source: 'Spotify',
                            requester
                        });
                        return { type: 'TRACK', tracks };
                    } else {
                        const sData = await spotify.getData(query).catch(() => null);
                        if (sData) {
                            tracks.push({
                                title: sData.name || sData.title || query,
                                author: sData.artists?.[0]?.name || sData.subtitle || 'Spotify Artist',
                                album: sData.album?.name || 'Spotify Track',
                                url: query,
                                duration: sData.duration || 180000,
                                thumbnail: sData.coverArt?.sources?.[0]?.url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
                                source: 'Spotify',
                                requester
                            });
                            return { type: 'TRACK', tracks };
                        }
                    }
                }

                // 3b. Playlist (Public, Unlisted, Shared)
                const playlistMatch = query.match(/playlist\/([a-zA-Z0-9]+)/);
                if (playlistMatch && playlistMatch[1]) {
                    const spPlaylist = await spotifyEngine.getPlaylist(playlistMatch[1]);
                    if (spPlaylist && spPlaylist.tracks?.items && spPlaylist.tracks.items.length > 0) {
                        for (const item of spPlaylist.tracks.items) {
                            const t = item.track;
                            if (t) {
                                tracks.push({
                                    title: t.name,
                                    author: t.artists?.map(a => a.name).join(', ') || 'Spotify Artist',
                                    album: t.album?.name || spPlaylist.name,
                                    url: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
                                    duration: t.duration_ms || 180000,
                                    thumbnail: t.album?.images?.[0]?.url || spPlaylist.images?.[0]?.url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
                                    source: 'Spotify Playlist',
                                    requester
                                });
                            }
                        }
                        return {
                            type: 'PLAYLIST',
                            tracks,
                            playlistName: spPlaylist.name || 'Spotify Playlist',
                            author: spPlaylist.owner?.display_name || 'Spotify Curator',
                            thumbnail: spPlaylist.images?.[0]?.url,
                            source: 'Spotify'
                        };
                    } else {
                        // Fallback via spotify-url-info
                        const sInfoTracks = await spotify.getTracks(query).catch(() => []);
                        if (sInfoTracks && sInfoTracks.length > 0) {
                            const sData = await spotify.getData(query).catch(() => null);
                            for (const t of sInfoTracks) {
                                tracks.push({
                                    title: t.name,
                                    author: t.artist || t.artists?.[0]?.name || 'Spotify Artist',
                                    album: sData?.name || 'Spotify Playlist',
                                    url: t.uri ? `https://open.spotify.com/track/${t.uri.split(':').pop()}` : query,
                                    duration: t.duration || 180000,
                                    thumbnail: sData?.coverArt?.sources?.[0]?.url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
                                    source: 'Spotify Playlist',
                                    requester
                                });
                            }
                            return {
                                type: 'PLAYLIST',
                                tracks,
                                playlistName: sData?.name || 'Spotify Playlist',
                                author: sData?.subtitle || 'Spotify Curator',
                                thumbnail: sData?.coverArt?.sources?.[0]?.url,
                                source: 'Spotify'
                            };
                        }
                    }
                }

                // 3c. Album
                const albumMatch = query.match(/album\/([a-zA-Z0-9]+)/);
                if (albumMatch && albumMatch[1]) {
                    const spAlbum = await spotifyEngine.getAlbum(albumMatch[1]);
                    if (spAlbum && spAlbum.tracks?.items && spAlbum.tracks.items.length > 0) {
                        for (const t of spAlbum.tracks.items) {
                            tracks.push({
                                title: t.name,
                                author: t.artists?.map(a => a.name).join(', ') || spAlbum.artists?.map(a => a.name).join(', ') || 'Spotify Artist',
                                album: spAlbum.name,
                                url: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
                                duration: t.duration_ms || 180000,
                                thumbnail: spAlbum.images?.[0]?.url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
                                source: 'Spotify Album',
                                requester
                            });
                        }
                        return {
                            type: 'PLAYLIST',
                            tracks,
                            playlistName: spAlbum.name || 'Spotify Album',
                            author: spAlbum.artists?.map(a => a.name).join(', ') || 'Artist',
                            thumbnail: spAlbum.images?.[0]?.url,
                            source: 'Spotify'
                        };
                    } else {
                        const sInfoTracks = await spotify.getTracks(query).catch(() => []);
                        if (sInfoTracks && sInfoTracks.length > 0) {
                            const sData = await spotify.getData(query).catch(() => null);
                            for (const t of sInfoTracks) {
                                tracks.push({
                                    title: t.name,
                                    author: t.artist || t.artists?.[0]?.name || sData?.subtitle || 'Spotify Artist',
                                    album: sData?.name || 'Spotify Album',
                                    url: t.uri ? `https://open.spotify.com/track/${t.uri.split(':').pop()}` : query,
                                    duration: t.duration || 180000,
                                    thumbnail: sData?.coverArt?.sources?.[0]?.url,
                                    source: 'Spotify Album',
                                    requester
                                });
                            }
                            return {
                                type: 'PLAYLIST',
                                tracks,
                                playlistName: sData?.name || 'Spotify Album',
                                author: sData?.subtitle || 'Artist',
                                thumbnail: sData?.coverArt?.sources?.[0]?.url,
                                source: 'Spotify'
                            };
                        }
                    }
                }

                // 3d. Artist Top Tracks
                const artistMatch = query.match(/artist\/([a-zA-Z0-9]+)/);
                if (artistMatch && artistMatch[1]) {
                    const topTracks = await spotifyEngine.getArtistTopTracks(artistMatch[1]);
                    if (topTracks && topTracks.length > 0) {
                        for (const t of topTracks) {
                            tracks.push({
                                title: t.name,
                                author: t.artists?.map(a => a.name).join(', ') || 'Spotify Artist',
                                album: t.album?.name || 'Top Tracks',
                                url: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
                                duration: t.duration_ms || 180000,
                                thumbnail: t.album?.images?.[0]?.url,
                                source: 'Spotify Artist',
                                requester
                            });
                        }
                        return {
                            type: 'PLAYLIST',
                            tracks,
                            playlistName: `${topTracks[0]?.artists?.[0]?.name || 'Artist'} - Top Tracks`,
                            author: topTracks[0]?.artists?.[0]?.name || 'Artist',
                            thumbnail: topTracks[0]?.album?.images?.[0]?.url,
                            source: 'Spotify'
                        };
                    }
                }
            } catch (e) {
                console.warn('⚠️ [Spotify Link Resolution]:', e.message || e);
            }
        }

        // 4. SoundCloud Links (Sets, Playlists, Secret Tokens, Tracks)
        if (query.includes('soundcloud.com/')) {
            try {
                const scData = await play.soundcloud(query).catch(() => null);
                if (scData) {
                    if (scData.type === 'playlist') {
                        const allTracks = await scData.all_tracks();
                        for (const t of allTracks) {
                            tracks.push({
                                title: t.name || t.title,
                                url: t.permalink || t.url,
                                duration: (t.durationInSec || 180) * 1000,
                                author: t.user?.name || 'SoundCloud Artist',
                                thumbnail: t.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
                                source: 'SoundCloud Playlist',
                                requester
                            });
                        }
                        return {
                            type: 'PLAYLIST',
                            tracks,
                            playlistName: scData.name || 'SoundCloud Playlist',
                            author: scData.user?.name || 'SoundCloud Curator',
                            thumbnail: scData.thumbnail,
                            source: 'SoundCloud'
                        };
                    } else {
                        tracks.push({
                            title: scData.name || scData.title || query,
                            url: scData.permalink || scData.url,
                            duration: (scData.durationInSec || 180) * 1000,
                            author: scData.user?.name || 'SoundCloud Artist',
                            thumbnail: scData.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
                            source: 'SoundCloud',
                            requester
                        });
                        return { type: 'TRACK', tracks };
                    }
                }
            } catch (scErr) {}
        }

        // 5. Deezer Links (Playlist, Album, Track)
        if (query.includes('deezer.com/')) {
            try {
                const dzType = await play.dz_validate(query);
                if (dzType === 'playlist' || dzType === 'album') {
                    const dz = await play.deezer(query);
                    const dzTracks = await (dz.all_tracks ? dz.all_tracks() : Promise.resolve(dz.tracks || []));
                    for (const t of dzTracks) {
                        tracks.push({
                            title: t.title || t.name,
                            author: t.artist?.name || dz.artist?.name || 'Deezer Artist',
                            url: t.link || t.url || query,
                            duration: (t.durationInSec || t.duration || 180) * 1000,
                            thumbnail: dz.picture || dz.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
                            source: 'Deezer',
                            requester
                        });
                    }
                    return {
                        type: 'PLAYLIST',
                        tracks,
                        playlistName: dz.title || 'Deezer Music',
                        author: dz.artist?.name || dz.user?.name || 'Deezer Curator',
                        thumbnail: dz.picture || dz.cover,
                        source: 'Deezer'
                    };
                } else if (dzType === 'track') {
                    const dz = await play.deezer(query);
                    tracks.push({
                        title: dz.title,
                        author: dz.artist?.name || 'Deezer Artist',
                        url: dz.link || query,
                        duration: (dz.durationInSec || dz.duration || 180) * 1000,
                        thumbnail: dz.cover || dz.picture || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
                        source: 'Deezer',
                        requester
                    });
                    return { type: 'TRACK', tracks };
                }
            } catch (dzErr) {
                console.warn('⚠️ [Deezer Resolution]:', dzErr.message || dzErr);
            }
        }

        // 6. Apple Music Links (Album, Track)
        if (query.includes('music.apple.com/')) {
            try {
                let appleId = null;
                const iMatch = query.match(/[?&]i=([0-9]+)/);
                if (iMatch) appleId = iMatch[1];
                else {
                    const idMatch = query.match(/\/([0-9]{6,})/);
                    if (idMatch) appleId = idMatch[1];
                }

                if (appleId) {
                    const itunesRes = await fetch(`https://itunes.apple.com/lookup?id=${appleId}&entity=song`);
                    const itunesData = await itunesRes.json();
                    if (itunesData.results && itunesData.results.length > 0) {
                        const first = itunesData.results[0];
                        if (itunesData.results.length > 1 && first.wrapperType === 'collection') {
                            for (let i = 1; i < itunesData.results.length; i++) {
                                const item = itunesData.results[i];
                                tracks.push({
                                    title: item.trackName,
                                    author: item.artistName,
                                    album: item.collectionName,
                                    url: item.trackViewUrl || query,
                                    duration: item.trackTimeMillis || 180000,
                                    thumbnail: (item.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
                                    source: 'Apple Music',
                                    requester
                                });
                            }
                            return {
                                type: 'PLAYLIST',
                                tracks,
                                playlistName: first.collectionName,
                                author: first.artistName,
                                thumbnail: (first.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
                                source: 'Apple Music'
                            };
                        } else {
                            const item = itunesData.results[0];
                            tracks.push({
                                title: item.trackName || item.collectionName,
                                author: item.artistName,
                                album: item.collectionName,
                                url: item.trackViewUrl || query,
                                duration: item.trackTimeMillis || 180000,
                                thumbnail: (item.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
                                source: 'Apple Music',
                                requester
                            });
                            return { type: 'TRACK', tracks };
                        }
                    }
                }
            } catch (appleErr) {
                console.warn('⚠️ [Apple Music Resolution]:', appleErr.message || appleErr);
            }
        }

        // 7. PRIMARY SEARCH ENGINE: OFFICIAL SPOTIFY WEB API
        try {
            const spResults = await spotifyEngine.searchTracks(query, 10);
            if (spResults && spResults.length > 0) {
                const t = spResults[0];
                tracks.push({
                    title: t.name,
                    author: t.artists?.map(a => a.name).join(', ') || 'Spotify Artist',
                    album: t.album?.name || 'Spotify Album',
                    url: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
                    duration: t.duration_ms || 180000,
                    thumbnail: t.album?.images?.[0]?.url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
                    source: 'Spotify',
                    requester
                });
                return { type: 'TRACK', tracks };
            }
        } catch (spErr) {
            console.warn('⚠️ [Spotify Search Error]:', spErr.message || spErr);
        }

        // 8. Fallback Official YouTube Search
        try {
            const ytSearch = await play.search(query, { limit: 5 }).catch(() => []);
            if (ytSearch && ytSearch.length > 0) {
                let candidateItems = ytSearch.map(item => ({
                    rawItem: item,
                    title: item.title || query,
                    author: item.channel?.name || 'Official Artist',
                    length: (item.durationInSec || 180) * 1000
                }));
                try {
                    const { rankAndFilterCanonicalTracks } = require('./musicManager');
                    candidateItems = rankAndFilterCanonicalTracks(candidateItems, query);
                } catch (_) {}
                const best = candidateItems[0]?.rawItem || ytSearch[0];
                tracks.push({
                    title: best.title || query,
                    url: best.url,
                    duration: (best.durationInSec || 180) * 1000,
                    author: best.channel?.name || 'Official Artist',
                    thumbnail: best.thumbnails?.[0]?.url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
                    source: 'YouTube',
                    requester
                });
                return { type: 'TRACK', tracks };
            }
        } catch (ytErr) {}

        // 9. Fallback SoundCloud Search
        try {
            const scSearch = await play.search(query, { source: { soundcloud: 'tracks' }, limit: 8 }).catch(() => []);
            if (scSearch && scSearch.length > 0) {
                const item = scSearch.find(t => (t.durationInSec || 0) > 45) || scSearch[0];
                tracks.push({
                    title: item.name || item.title || query,
                    url: item.permalink || item.url,
                    duration: (item.durationInSec || 180) * 1000,
                    author: item.user?.name || 'SoundCloud Artist',
                    thumbnail: item.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
                    source: 'SoundCloud',
                    requester
                });
                return { type: 'TRACK', tracks };
            }
        } catch (scErr) {}

        return { type: 'TRACK', tracks: [] };
    }

    static async getAutoplayRecommendation(currentTrack, history = []) {
        if (!currentTrack) return null;
        const primaryArtist = (currentTrack.author || '').split(',')[0].trim();
        const currentTitleClean = (currentTrack.title || '')
            .replace(/[\(\[].*?[\)\]]/g, '')
            .replace(/official|audio|video|lyrics|ft\.|feat\./gi, '')
            .trim()
            .toLowerCase();

        const historyUrls = new Set(history.map(h => (h.url || '').toLowerCase()));
        const historyTitles = new Set(history.map(h => (h.title || '').toLowerCase()));

        const isFresh = (title, url) => {
            if (!title) return false;
            const tLower = title.toLowerCase();
            if (tLower === currentTitleClean || tLower.includes(currentTitleClean) || currentTitleClean.includes(tLower)) return false;
            if (url && historyUrls.has(url.toLowerCase())) return false;
            for (const hTitle of historyTitles) {
                if (tLower.includes(hTitle) || hTitle.includes(tLower)) return false;
            }
            return true;
        };

        // 1. Official Spotify Search: top tracks by artist
        try {
            const spTracks = await spotifyEngine.searchTracks(primaryArtist, 25);
            if (spTracks && spTracks.length > 0) {
                for (const t of spTracks) {
                    const trackUrl = t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`;
                    if (isFresh(t.name, trackUrl)) {
                        return {
                            title: t.name,
                            author: t.artists?.map(a => a.name).join(', ') || primaryArtist,
                            album: t.album?.name || 'Spotify Single',
                            url: trackUrl,
                            duration: t.duration_ms || 180000,
                            thumbnail: t.album?.images?.[0]?.url || currentTrack.thumbnail,
                            source: 'Spotify Autoplay',
                            requester: currentTrack.requester
                        };
                    }
                }
            }
        } catch (e) {}

        // 2. Official Spotify Search: artist radio & related music
        try {
            const spRadio = await spotifyEngine.searchTracks(`${primaryArtist} radio`, 20);
            if (spRadio && spRadio.length > 0) {
                for (const t of spRadio) {
                    const trackUrl = t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`;
                    if (isFresh(t.name, trackUrl)) {
                        return {
                            title: t.name,
                            author: t.artists?.map(a => a.name).join(', ') || primaryArtist,
                            album: t.album?.name || 'Spotify Radio',
                            url: trackUrl,
                            duration: t.duration_ms || 180000,
                            thumbnail: t.album?.images?.[0]?.url || currentTrack.thumbnail,
                            source: 'Spotify Autoplay',
                            requester: currentTrack.requester
                        };
                    }
                }
            }
        } catch (e) {}

        // 3. Fallback YouTube related search
        try {
            const ytResults = await play.search(`${primaryArtist} top songs`, { limit: 10 }).catch(() => []);
            for (const item of ytResults) {
                if (isFresh(item.title, item.url)) {
                    return {
                        title: item.title,
                        author: item.channel?.name || primaryArtist,
                        url: item.url,
                        duration: (item.durationInSec || 180) * 1000,
                        thumbnail: item.thumbnails?.[0]?.url || currentTrack.thumbnail,
                        source: 'YouTube Autoplay',
                        requester: currentTrack.requester
                    };
                }
            }
        } catch (e) {}

        return null;
    }
}

module.exports = {
    StarryAudioEngine,
    StarryGuildPlayer,
    formatTime,
    createProgressBar
};
