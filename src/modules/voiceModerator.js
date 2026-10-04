// ==========================================
// 🎙️ STARRY ADVANCED AI VOICE CHANNEL MODERATOR
// File Path: src/modules/voiceModerator.js
// Real-Time Audio Capture • Gemini Multimodal Speech Analysis
// Automated Fighting & Abuse Detection • Server Mute/Disconnect/Warn
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits,
    ChannelType 
} = require('discord.js');
const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus, 
    EndBehaviorType, 
    getVoiceConnection, 
    VoiceConnectionStatus 
} = require('@discordjs/voice');
const prism = require('prism-media');
const { Readable } = require('stream');
const VoiceModerationConfig = require('../models/VoiceModerationConfig');

// In-Memory Active Monitoring Sessions: guildId -> Session
const activeSessions = new Map();

// In-Memory Guild Settings Cache: guildId -> Config Object
const guildConfigCache = new Map();

// Recent Violation Cooldown: `${guildId}_${userId}` -> timestamp
const userViolationCooldowns = new Map();
const COOLDOWN_MS = 12000; // 12 second debounce between successive flags per user

// ==========================================
// 1. WAV HEADER & DOWNSAMPLING HELPERS
// ==========================================

/**
 * Downsamples 48kHz 16-bit Stereo PCM to 16kHz 16-bit Mono PCM
 * Reduces audio payload by ~6x for instant, bandwidth-efficient AI analysis.
 */
function downsample48kStereoTo16kMono(buffer) {
    const numFrames = Math.floor(buffer.length / 4);
    const outSamples = Math.floor(numFrames / 3);
    const outBuffer = Buffer.alloc(outSamples * 2);

    for (let i = 0, outIdx = 0; i < numFrames - 2; i += 3, outIdx += 2) {
        const byteOffset = i * 4;
        const left = buffer.readInt16LE(byteOffset);
        const right = buffer.readInt16LE(byteOffset + 2);
        const mono = Math.round((left + right) / 2);
        outBuffer.writeInt16LE(mono, outIdx);
    }
    return outBuffer;
}

/**
 * Creates standard 44-byte RIFF/WAVE header
 */
function pcmToWav(pcmBuffer, sampleRate = 16000, channels = 1) {
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcmBuffer.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    header.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * channels * 2, 28); // ByteRate
    header.writeUInt16LE(channels * 2, 32);             // BlockAlign
    header.writeUInt16LE(16, 34);                       // BitsPerSample
    header.write('data', 36);
    header.writeUInt32LE(pcmBuffer.length, 40);
    return Buffer.concat([header, pcmBuffer]);
}

// ==========================================
// 2. GEMINI MULTIMODAL AUDIO ANALYSIS ENGINE
// ==========================================

function getGeminiApiKey() {
    const raw = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || '';
    const keys = raw.split(',').map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) return null;
    return keys[Math.floor(Math.random() * keys.length)];
}

/**
 * Sends audio WAV buffer to Gemini Flash for speech-to-text + toxicity & fighting detection
 */
async function analyzeVoiceAudio(wavBuffer) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        return { flagged: false, error: 'GEMINI_API_KEY missing' };
    }

    const base64Audio = wavBuffer.toString('base64');
    const systemPrompt = `You are Starry's AI Discord Voice Channel Moderator.
Analyze this audio clip spoken by a user in a Discord voice channel.
Evaluate whether the speaker is:
1. Being verbally abusive, insulting, degrading, using slurs, extreme toxicity, or harassment.
2. Fighting, screaming in an aggressive verbal confrontation, arguing hostilely, or threatening someone.

CASUAL CONVERSATION, GAMING TALK, LAUGHTER, PEACEFUL DEBATE, OR SLIGHT FRUSTRATION MUST NOT BE FLAGGED.
Only flag genuine verbal abuse, fighting, extreme toxicity, harassment, or threats.

Return ONLY a JSON object with this exact schema (no markdown, no code fences):
{
  "transcription": "verbatim text of what was spoken",
  "flagged": true or false,
  "category": "none" | "fighting" | "verbal_abuse" | "harassment" | "threats",
  "severity": "none" | "low" | "medium" | "high" | "critical",
  "reason": "short explanation of why it was flagged or 'Clean' if safe"
}`;

    const models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.5-flash-lite', 'gemini-3.5-flash'];
    for (const model of models) {
        try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { inlineData: { mimeType: 'audio/wav', data: base64Audio } },
                            { text: systemPrompt }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        responseMimeType: 'application/json'
                    }
                })
            });

            if (!res.ok) continue;
            const data = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) continue;

            const cleanJson = text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
            const parsed = JSON.parse(cleanJson);
            return {
                transcription: parsed.transcription || '(Speech detected)',
                flagged: Boolean(parsed.flagged),
                category: parsed.category || 'none',
                severity: parsed.severity || 'none',
                reason: parsed.reason || 'Clean'
            };
        } catch (err) {
            // Try next model candidate
        }
    }

    return { flagged: false, reason: 'AI analysis inconclusive' };
}

// ==========================================
// 3. VOICE MODERATOR SESSION CLASS
// ==========================================

class VoiceModeratorSession {
    constructor(guild, channel, client) {
        this.guild = guild;
        this.channel = channel;
        this.client = client;
        this.connection = null;
        this.player = createAudioPlayer();
        this.receiver = null;
        this.activeUserStreams = new Set();
        this.isPlayingWarning = false;
        this.startTime = Date.now();
    }

    async init() {
        this.connection = joinVoiceChannel({
            channelId: this.channel.id,
            guildId: this.guild.id,
            adapterCreator: this.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });

        this.connection.subscribe(this.player);

        this.player.on('error', (err) => {
            console.error(`❌ [VoiceMod Player Error in ${this.guild.name}]:`, err.message);
        });

        this.connection.on(VoiceConnectionStatus.Ready, () => {
            console.log(`🎙️ [VoiceMod] Connected and moderating: "${this.channel.name}" (${this.guild.name})`);
            this.setupReceiver();
        });

        this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    require('events').once(this.connection, VoiceConnectionStatus.Signalling),
                    require('events').once(this.connection, VoiceConnectionStatus.Connecting)
                ]);
            } catch (error) {
                this.destroy();
            }
        });
    }

    setupReceiver() {
        if (!this.connection) return;
        this.receiver = this.connection.receiver;

        this.receiver.speaking.on('start', (userId) => {
            this.handleUserSpeechStart(userId);
        });
    }

    async handleUserSpeechStart(userId) {
        // Ignore if Starry itself or another bot
        if (userId === this.client.user.id) return;
        if (this.activeUserStreams.has(userId)) return;

        // Fetch Member & Settings
        const member = await this.guild.members.fetch(userId).catch(() => null);
        if (!member || member.user.bot) return;

        const config = await getGuildVoiceModConfig(this.guild.id);
        if (!config.enabled) return;

        // Role exemption check
        if (config.ignoredRoles && config.ignoredRoles.length > 0) {
            const isExempt = member.roles.cache.some(r => config.ignoredRoles.includes(r.id));
            if (isExempt) return;
        }

        // Administrator exemption
        if (member.permissions.has(PermissionFlagsBits.Administrator)) return;

        // Anti-spam debounce check
        const cooldownKey = `${this.guild.id}_${userId}`;
        const lastFlag = userViolationCooldowns.get(cooldownKey) || 0;
        if (Date.now() - lastFlag < COOLDOWN_MS) return;

        this.activeUserStreams.add(userId);

        try {
            const audioStream = this.receiver.subscribe(userId, {
                end: { behavior: EndBehaviorType.AfterSilence, duration: 800 }
            });

            const opusDecoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
            const pcmChunks = [];

            // Max 8 seconds recording safety cap
            const maxDurationTimeout = setTimeout(() => {
                try { audioStream.destroy(); } catch (e) {}
            }, 8000);

            audioStream.pipe(opusDecoder);

            opusDecoder.on('data', (chunk) => {
                pcmChunks.push(chunk);
            });

            opusDecoder.on('end', async () => {
                clearTimeout(maxDurationTimeout);
                this.activeUserStreams.delete(userId);

                const rawStereoPcm = Buffer.concat(pcmChunks);
                // Require at least ~0.5s of audio to prevent micro-clicks from firing
                if (rawStereoPcm.length < 48000 * 2) return;

                // Downsample to 16kHz mono (6x smaller footprint)
                const mono16kPcm = downsample48kStereoTo16kMono(rawStereoPcm);
                const wavBuffer = pcmToWav(mono16kPcm, 16000, 1);

                // Run AI Audio Classification
                const result = await analyzeVoiceAudio(wavBuffer);
                if (result && result.flagged) {
                    await this.processViolation(member, result, config);
                }
            });

            opusDecoder.on('error', () => {
                clearTimeout(maxDurationTimeout);
                this.activeUserStreams.delete(userId);
            });

        } catch (err) {
            this.activeUserStreams.delete(userId);
        }
    }

    async processViolation(member, aiResult, config) {
        const severity = (aiResult.severity || 'medium').toLowerCase();
        const sensitivity = (config.sensitivity || 'standard').toLowerCase();

        // Sensitivity threshold check
        let isEligible = false;
        if (sensitivity === 'strict') {
            isEligible = ['low', 'medium', 'high', 'critical'].includes(severity);
        } else if (sensitivity === 'severe') {
            isEligible = ['high', 'critical'].includes(severity);
        } else {
            // Standard
            isEligible = ['medium', 'high', 'critical'].includes(severity);
        }

        if (!isEligible) return;

        // Set Debounce
        userViolationCooldowns.set(`${this.guild.id}_${member.id}`, Date.now());

        const category = aiResult.category || 'verbal_abuse';
        const action = config.action || 'warn';
        let actionTakenText = 'Logged Incident';

        // 1. Audio Warning in Voice Channel (TTS Announcement)
        if (config.audioWarning && !this.isPlayingWarning) {
            this.playAudioWarning();
        }

        // 2. Execute Enforcement Action
        try {
            if (action === 'mute') {
                if (member.voice.channelId && member.voice.serverMute !== true) {
                    await member.voice.setMute(true, `Starry VC Moderation: ${aiResult.reason}`).catch(() => {});
                    actionTakenText = `Server Muted (${Math.round(config.muteDuration / 60)}m)`;

                    // Auto-unmute after duration
                    if (config.muteDuration > 0) {
                        setTimeout(async () => {
                            try {
                                const currentMember = await this.guild.members.fetch(member.id).catch(() => null);
                                if (currentMember && currentMember.voice.serverMute) {
                                    await currentMember.voice.setMute(false, 'Starry VC Moderation: Mute duration expired').catch(() => {});
                                }
                            } catch (e) {}
                        }, config.muteDuration * 1000);
                    }
                }
            } else if (action === 'disconnect') {
                if (member.voice.channelId) {
                    await member.voice.disconnect(`Starry VC Moderation: ${aiResult.reason}`).catch(() => {});
                    actionTakenText = 'Disconnected from Voice Channel';
                }
            } else if (action === 'timeout') {
                if (member.moderatable) {
                    const timeoutMs = (config.timeoutDuration || 300) * 1000;
                    await member.timeout(timeoutMs, `Starry VC Moderation: ${aiResult.reason}`).catch(() => {});
                    actionTakenText = `Timed Out (${Math.round(timeoutMs / 60000)}m)`;
                }
            } else if (action === 'warn') {
                actionTakenText = 'Official DM Warning Sent';
            }
        } catch (actErr) {
            console.error('❌ Error executing voice moderation enforcement:', actErr.message);
        }

        // 3. Send Member DM Notification
        try {
            const warningDmEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('⚠️ Voice Moderation Alert')
                .setDescription(`Your recent speech in **${this.guild.name}** (${this.channel.name}) was flagged by Starry AI Voice Moderation for **${formatCategory(category)}**.`)
                .addFields(
                    { name: '🎙️ Spoken Words', value: `*"${aiResult.transcription.slice(0, 500)}"*` },
                    { name: '⚖️ Action Taken', value: `\`${actionTakenText}\``, inline: true },
                    { name: '🔍 Details', value: aiResult.reason || 'Inappropriate or abusive speech', inline: true }
                )
                .setFooter({ text: 'Please maintain respect in voice channels. Repeat violations may lead to a server ban.' })
                .setTimestamp();

            await member.send({ embeds: [warningDmEmbed] }).catch(() => {});
        } catch (dmErr) {}

        // 4. Send Moderator Incident Report Embed to Log Channel
        await this.sendIncidentLog(member, aiResult, actionTakenText, config);

        // 5. Update MongoDB Stats & Incident History
        try {
            const catKey = category === 'fighting' ? 'fighting'
                         : category === 'threats' ? 'threats'
                         : category === 'harassment' ? 'harassment' : 'verbalAbuse';

            await VoiceModerationConfig.findOneAndUpdate(
                { guildId: this.guild.id },
                {
                    $inc: { 
                        totalViolations: 1,
                        [`stats.${catKey}`]: 1
                    },
                    $push: {
                        recentIncidents: {
                            $each: [{
                                userId: member.id,
                                username: member.user.tag || member.user.username,
                                channelId: this.channel.id,
                                channelName: this.channel.name,
                                category: category,
                                severity: severity,
                                transcription: aiResult.transcription,
                                reason: aiResult.reason,
                                actionTaken: actionTakenText,
                                timestamp: new Date()
                            }],
                            $slice: -50 // Keep latest 50 incidents
                        }
                    }
                },
                { upsert: true }
            ).catch(() => {});
        } catch (dbErr) {}
    }

    async playAudioWarning() {
        try {
            this.isPlayingWarning = true;
            const ttsUrl = `https://api.streamelements.com/kappa/v2/speech?voice=Salli&text=${encodeURIComponent('Warning: Please keep voice chat respectful. Verbal abuse and fighting are not allowed.')}`;
            const res = await fetch(ttsUrl);
            if (!res.ok) {
                this.isPlayingWarning = false;
                return;
            }
            const buf = Buffer.from(await res.arrayBuffer());
            const resource = createAudioResource(Readable.from(buf));
            this.player.play(resource);

            this.player.once(AudioPlayerStatus.Idle, () => {
                this.isPlayingWarning = false;
            });
        } catch (e) {
            this.isPlayingWarning = false;
        }
    }

    async sendIncidentLog(member, aiResult, actionTakenText, config) {
        let targetLogChannel = null;
        if (config.logChannelId) {
            targetLogChannel = this.guild.channels.cache.get(config.logChannelId);
        }

        if (!targetLogChannel) {
            // Fallback: look for audit log or mod-log or channel text chat
            targetLogChannel = this.guild.channels.cache.find(c => 
                c.isTextBased() && (c.name.includes('mod-log') || c.name.includes('voice-log') || c.name.includes('logs'))
            ) || this.channel;
        }

        if (!targetLogChannel || typeof targetLogChannel.send !== 'function') return;

        const severityBadge = aiResult.severity === 'critical' ? '🔴 **CRITICAL**'
                            : aiResult.severity === 'high' ? '🟠 **HIGH**'
                            : aiResult.severity === 'medium' ? '🟡 **MEDIUM**'
                            : '⚪ **LOW**';

        const embed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle(`🎙️ Voice Moderation Violation: ${formatCategory(aiResult.category)}`)
            .setAuthor({ 
                name: `${member.user.tag || member.user.username} (${member.id})`, 
                iconURL: member.user.displayAvatarURL() 
            })
            .addFields(
                { name: '👤 Offender', value: `<@${member.id}> (\`${member.id}\`)`, inline: true },
                { name: '🔊 Voice Channel', value: `<#${this.channel.id}>`, inline: true },
                { name: '🚨 Severity', value: severityBadge, inline: true },
                { name: '💬 Spoken Transcription', value: `\`\`\`fix\n"${aiResult.transcription.slice(0, 950)}"\n\`\`\`` },
                { name: '🧠 AI Reason', value: aiResult.reason || 'Violated voice conduct policy', inline: true },
                { name: '⚖️ Action Enforced', value: `\`${actionTakenText}\``, inline: true }
            )
            .setFooter({ text: 'Starry AI Voice Channel Sentinel • Instant 0s Reaction' })
            .setTimestamp();

        // Quick Moderator Controls (1-click Action Buttons)
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`vcmod_unmute_${member.id}`)
                .setLabel('Unmute Member')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🔊'),
            new ButtonBuilder()
                .setCustomId(`vcmod_dc_${member.id}`)
                .setLabel('Kick from VC')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('👢'),
            new ButtonBuilder()
                .setCustomId(`vcmod_dismiss`)
                .setLabel('Dismiss Alert')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🗑️')
        );

        await targetLogChannel.send({ embeds: [embed], components: [row] }).catch(() => {});
    }

    destroy() {
        this.player.stop();
        if (this.connection && this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
            try { this.connection.destroy(); } catch (e) {}
        }
        activeSessions.delete(this.guild.id);
        console.log(`🎙️ [VoiceMod] Stopped moderating: "${this.channel.name}" (${this.guild.name})`);
    }
}

// ==========================================
// 4. HELPER & CONFIG UTILITIES
// ==========================================

function formatCategory(cat) {
    switch ((cat || '').toLowerCase()) {
        case 'fighting': return '🥊 Fighting / Confrontation';
        case 'verbal_abuse': return '🤬 Verbal Abuse / Toxicity';
        case 'harassment': return '⚠️ Harassment';
        case 'threats': return '🚨 Threats of Violence';
        default: return '⚠️ Inappropriate Speech';
    }
}

async function getGuildVoiceModConfig(guildId) {
    if (guildConfigCache.has(guildId)) {
        return guildConfigCache.get(guildId);
    }
    let conf = await VoiceModerationConfig.findOne({ guildId }).lean().catch(() => null);
    if (!conf) {
        conf = {
            guildId,
            enabled: false,
            logChannelId: null,
            action: 'warn',
            muteDuration: 300,
            timeoutDuration: 300,
            sensitivity: 'standard',
            audioWarning: true,
            autoJoinChannels: [],
            ignoredRoles: [],
            totalViolations: 0,
            stats: { fighting: 0, verbalAbuse: 0, harassment: 0, threats: 0 }
        };
    }
    guildConfigCache.set(guildId, conf);
    return conf;
}

function updateGuildConfigCache(guildId, newConfig) {
    guildConfigCache.set(guildId, newConfig);
}

// ==========================================
// 5. PUBLIC API & LIFECYCLE MANAGEMENT
// ==========================================

async function startVoiceModeration(guild, channel, client) {
    if (activeSessions.has(guild.id)) {
        const existing = activeSessions.get(guild.id);
        if (existing.channel.id === channel.id) {
            return { success: true, alreadyActive: true, session: existing };
        }
        existing.destroy();
    }

    const session = new VoiceModeratorSession(guild, channel, client);
    await session.init();
    activeSessions.set(guild.id, session);
    return { success: true, session };
}

function stopVoiceModeration(guildId) {
    if (activeSessions.has(guildId)) {
        const session = activeSessions.get(guildId);
        session.destroy();
        return true;
    }
    return false;
}

function getActiveSession(guildId) {
    return activeSessions.get(guildId) || null;
}

// Auto-Disconnect listener when voice channel empties
function setupAutoDisconnect(client) {
    client.on('voiceStateUpdate', async (oldState, newState) => {
        const guildId = oldState.guild?.id || newState.guild?.id;
        if (!guildId) return;

        const session = activeSessions.get(guildId);
        if (!session) return;

        // Check if the update affects Starry's monitored channel
        if (oldState.channelId === session.channel.id || newState.channelId === session.channel.id) {
            const currentHumans = session.channel.members.filter(m => !m.user.bot);
            // If channel is completely empty of humans, disconnect after 30 seconds
            if (currentHumans.size === 0) {
                setTimeout(() => {
                    const checkHumans = session.channel.members.filter(m => !m.user.bot);
                    if (checkHumans.size === 0 && activeSessions.has(guildId)) {
                        session.destroy();
                    }
                }, 30000);
            }
        }
    });
}

// Quick Mod Button Interaction Handler
async function handleVoiceModButton(interaction) {
    const customId = interaction.customId;
    if (!customId.startsWith('vcmod_')) return false;

    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers) &&
        !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
            content: '❌ You require **Moderate Members** permission to manage voice moderation alerts!',
            ephemeral: true
        });
    }

    if (customId === 'vcmod_dismiss') {
        return interaction.update({
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('vcmod_dismissed')
                        .setLabel(`Alert Dismissed by ${interaction.user.username}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                )
            ]
        });
    }

    if (customId.startsWith('vcmod_unmute_')) {
        const targetId = customId.replace('vcmod_unmute_', '');
        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
        if (!targetMember) {
            return interaction.reply({ content: '❌ Member is no longer in this server!', ephemeral: true });
        }
        if (targetMember.voice && targetMember.voice.serverMute) {
            await targetMember.voice.setMute(false, `Unmuted by ${interaction.user.tag}`).catch(() => {});
            return interaction.reply({ content: `🔊 <@${targetId}> has been unmuted!`, ephemeral: true });
        } else {
            return interaction.reply({ content: `ℹ️ <@${targetId}> is not currently server-muted.`, ephemeral: true });
        }
    }

    if (customId.startsWith('vcmod_dc_')) {
        const targetId = customId.replace('vcmod_dc_', '');
        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
        if (!targetMember || !targetMember.voice.channelId) {
            return interaction.reply({ content: '❌ Member is not currently in a voice channel!', ephemeral: true });
        }
        await targetMember.voice.disconnect(`Kicked from VC by ${interaction.user.tag}`).catch(() => {});
        return interaction.reply({ content: `👢 <@${targetId}> was disconnected from voice by <@${interaction.user.id}>.`, ephemeral: true });
    }

    return false;
}

module.exports = {
    startVoiceModeration,
    stopVoiceModeration,
    getActiveSession,
    getGuildVoiceModConfig,
    updateGuildConfigCache,
    setupAutoDisconnect,
    handleVoiceModButton,
    VoiceModeratorSession,
    downsample48kStereoTo16kMono,
    pcmToWav
};
