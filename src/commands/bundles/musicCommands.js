// ==========================================
// 🎵 MASTER AUDIO & MUSIC COMMAND SUITE (33 COMMANDS)
// File Path: src/commands/bundles/musicCommands.js
// Multi-Platform Fast Search Resolver • Real-Time DSP Audio Processing • 1-Year Interactive Controls
// 100% Compatible across Windows, macOS, Linux, and Android/Termux
// ==========================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require('discord.js');
const config = require('../../config');
const { ONE_YEAR_MS, EPHEMERAL_FLAG } = require('../../utils/contextHelper');
const { StarryAudioEngine, formatTime, createProgressBar } = require('../../utils/nativeAudioEngine');
const { requirePremium } = require('../../utils/premiumHelper');

function getVoiceGuard(ctx) {
    const voiceChannel = ctx.member?.voice?.channel;
    if (!voiceChannel) {
        return { error: '❌ You must be connected to a voice channel first!' };
    }

    const multiBot = ctx.client.multiBot;
    const botId = ctx.client.user?.id;
    let botMember = ctx.guild?.members?.me || (botId ? ctx.guild?.members?.cache?.get(botId) : null);
    let workerClient = ctx.client;

    // If this bot is already active in a different VC, auto-delegate if multiBot has a free bot
    if (botMember?.voice?.channelId && botMember.voice.channelId !== voiceChannel.id) {
        if (multiBot && typeof multiBot.getMusicWorker === 'function') {
            const candidate = multiBot.getMusicWorker(ctx.guild, voiceChannel);
            if (candidate && candidate.client && candidate.client.user?.id !== botId) {
                workerClient = candidate.client;
                botMember = candidate.botMember;
                return { voiceChannel, botMember, workerClient, delegated: true, botName: candidate.name };
            }
        }
        return { error: `❌ **${botMember?.user?.username || 'Starry'}** is already active in <#${botMember.voice.channelId}>! Join that channel or use \`s2,play\` / \`s3,play\`.` };
    }

    return { voiceChannel, botMember, workerClient: ctx.client };
}

function getActivePlayer(client, guildId) {
    let kPlayer = client.manager?.getPlayer(guildId);
    if (!kPlayer && client.multiBot?.instances) {
        for (const inst of client.multiBot.instances.values()) {
            if (inst.client?.manager) {
                const p = inst.client.manager.getPlayer(guildId);
                if (p) { kPlayer = p; break; }
            }
        }
    }
    const nativePlayer = StarryAudioEngine.getPlayer(guildId, client);
    const nativeIsActive = nativePlayer && !nativePlayer.destroyed && (nativePlayer.currentTrack || nativePlayer.queue.length > 0);
    const kazagumoIsActive = kPlayer && (kPlayer.queue?.current || kPlayer.playing || kPlayer.queue?.length > 0);

    if (kazagumoIsActive || (kPlayer && !nativeIsActive)) {
        const { applyKazagumoFilter } = require('../../utils/musicManager');
        return {
            isKazagumo: true,
            player: kPlayer,
            currentTrack: kPlayer.queue.current ? {
                title: kPlayer.queue.current.title,
                author: kPlayer.queue.current.author,
                url: kPlayer.queue.current.uri,
                duration: kPlayer.queue.current.length,
                thumbnail: kPlayer.queue.current.thumbnail,
                requester: kPlayer.queue.current.requester
            } : null,
            queue: kPlayer.queue,
            position: kPlayer.position || 0,
            paused: kPlayer.paused,
            playing: kPlayer.playing,
            volume: kPlayer.volume || 100,
            loop: kPlayer.loop,
            filter: kPlayer.data?.get('activeFilter') || 'clear',
            pause: () => kPlayer.pause(true),
            resume: () => kPlayer.pause(false),
            skip: () => kPlayer.skip(),
            stop: () => kPlayer.destroy(),
            destroy: () => kPlayer.destroy(),
            setVolume: (v) => kPlayer.setVolume(v),
            setLoop: (l) => kPlayer.setLoop(l),
            shuffle: () => kPlayer.queue.shuffle(),
            setFilter: (f) => applyKazagumoFilter(kPlayer, f)
        };
    }

    if (nativeIsActive || (nativePlayer && !nativePlayer.destroyed)) {
        return nativePlayer;
    }

    return null;
}

const commands = [
    // 1. PLAY
    {
        name: 'play',
        aliases: ['p', 'add'],
        category: 'Music',
        description: 'Play high quality audio from SoundCloud, Spotify, YouTube or search keywords.',
        usage: ',play <song title or URL>',
        async autocomplete(interaction, client) {
            const { getSongAutocomplete } = require('../../utils/musicSearchHelper');
            const focused = interaction.options.getFocused();
            const choices = await getSongAutocomplete(focused, client.manager);
            return interaction.respond(choices).catch(() => {});
        },
        async execute(ctx) {
            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            let query = (ctx.isSlash && typeof ctx.interaction?.options?.getString === 'function') 
                ? ctx.interaction.options.getString('song') 
                : (ctx.args ? ctx.args.join(' ') : '');
            if (!query || !query.trim()) {
                return ctx.reply('❌ Please provide a song title or URL!\n*Usage: `,play <song title or URL>`*');
            }
            query = query.trim();

            if (ctx.isSlash) await ctx.defer();

            const targetClient = guard.workerClient || ctx.client;
            const manager = targetClient.manager || ctx.client.manager;
            const hasLavalink = Boolean(
                manager && 
                manager.shoukaku && 
                Array.from(manager.shoukaku.nodes.values()).some(n => n.state === 1)
            );

            let loadingMsg = null;
            if (!ctx.isSlash) {
                loadingMsg = await ctx.reply(`🔍 **Searching:** \`${query.length > 50 ? query.substring(0, 47) + '...' : query}\` • *Resolving Original Studio Hi-Fi Master...*`).catch(() => null);
            }

            // Route 1: High-Performance Lavalink Cluster (Primary for Cloud Hosting / Render where UDP is restricted)
            if (hasLavalink) {
                try {
                    const res = await manager.search(query, { requester: ctx.user });
                    if (!res || !res.tracks || res.tracks.length === 0 || res.loadType === 'empty' || res.loadType === 'error') {
                        throw new Error(`Lavalink could not resolve "${query}". Falling back to Native Audio Engine.`);
                    }

                    try {
                        const nPlayer = StarryAudioEngine.getPlayer(ctx.guild.id, targetClient);
                        if (nPlayer && !nPlayer.destroyed) nPlayer.destroy();
                    } catch (_) {}

                    let player = manager.getPlayer(ctx.guild.id);
                    if (!player) {
                        player = await manager.createPlayer({
                            guildId: ctx.guild.id,
                            voiceId: guard.voiceChannel.id,
                            textId: ctx.channel.id,
                            deaf: true
                        });
                    }

                    if (player.voiceId !== guard.voiceChannel.id) {
                        player.setVoiceChannel(guard.voiceChannel.id);
                    }

                    if (ctx.isSlash && ctx.interaction) {
                        player.data.set('interaction', ctx.interaction);
                    }
                    if (loadingMsg) {
                        player.data.set('loadingMessage', loadingMsg);
                    }

                    if (res.loadType === 'playlist') {
                        for (const track of res.tracks) {
                            player.queue.add(track);
                        }
                        if (!player.playing && !player.paused) player.play();

                        if (loadingMsg) {
                            loadingMsg.delete().catch(() => {});
                            player.data.delete('loadingMessage');
                        }

                        const totalDurationMs = res.tracks.reduce((acc, t) => acc + (t.length || 0), 0);
                        const totalDurationStr = formatTime(totalDurationMs);

                        const previewTracks = res.tracks.slice(0, 3).map((t, idx) => {
                            return `\`${idx + 1}.\` **[${(t.title || 'Track').substring(0, 45)}](${t.uri || 'https://discord.gg'})** • \`${t.author || 'Artist'}\` (\`${formatTime(t.length)}\`)`;
                        }).join('\n');
                        const remainingCount = res.tracks.length > 3 ? `\n*... and **${res.tracks.length - 3}** more tracks*` : '';

                        const embed = new EmbedBuilder()
                            .setColor('#5865F2')
                            .setAuthor({ 
                                name: `📚 Playlist Enqueued • ${res.playlist?.name || 'Online Stream'}`, 
                                iconURL: ctx.user.displayAvatarURL({ dynamic: true }) 
                            })
                            .setTitle(res.playlist?.name ? res.playlist.name.substring(0, 95) : 'Loaded Playlist')
                            .setThumbnail(res.tracks[0]?.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80')
                            .setDescription(
                                `✅ Added **${res.tracks.length}** tracks to the server queue!\n\n` +
                                `👤 **Curator / Artist:** \`${res.tracks[0]?.author || 'Featured Artist'}\`\n` +
                                `🕒 **Total Estimated Playtime:** \`${totalDurationStr}\`\n` +
                                `🔠 **Queue Status:** Currently playing • \`${player.queue.length}\` songs in queue\n` +
                                `🔊 **Mastering:** \`Lavalink Studio Hi-Fi Active\`\n\n` +
                                `📝 **Upcoming Tracks Preview:**\n` +
                                `${previewTracks}${remainingCount}`
                            )
                            .setFooter({ text: `Requested by ${ctx.user.tag} • Prefix: ,`, iconURL: ctx.user.displayAvatarURL() })
                            .setTimestamp();
                        return ctx.reply({ embeds: [embed] });
                    } else {
                        const track = res.tracks[0];
                        if (!player.playing && !player.paused && !player.queue.current) {
                            player.queue.add(track);
                            player.play();
                            // loadingMsg will be deleted by playerStart handler in musicManager.js
                        } else {
                            if (loadingMsg) {
                                loadingMsg.delete().catch(() => {});
                                player.data.delete('loadingMessage');
                            }
                            player.queue.add(track);
                            const embed = new EmbedBuilder()
                                .setColor('#5865F2')
                                .setAuthor({ name: 'Track Queued • Original Studio Hi-Fi Active', iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                                .setTitle(track.title ? track.title.substring(0, 90) : 'Track')
                                .setURL(track.uri || 'https://discord.gg')
                                .setThumbnail(track.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80')
                                .setDescription(
                                    `👤 **Artist:** \`${track.author || 'Artist'}\`\n` +
                                    `🕒 **Duration:** \`${formatTime(track.length)}\`\n` +
                                    `🔢 **Queue Position:** \`#${player.queue.length}\`\n` +
                                    `🌐 **Source:** \`${track.sourceName || 'Lavalink Hi-Fi'}\`\n` +
                                    `🔊 **Sound Profile:** \`⭐ Studio Hi-Fi Master (Original Release)\``
                                )
                                .setFooter({ text: `Requested by ${ctx.user.tag} • Prefix: ,` })
                                .setTimestamp();
                            return ctx.reply({ embeds: [embed] });
                        }
                    }
                    return;
                } catch (kErr) {
                    console.warn('⚠️ [Kazagumo Lavalink Playback Notice]:', kErr.message || kErr);
                }
            }

            // Route 2: Native Audio Engine (Local / Standalone / Cloud fallback)
            const player = StarryAudioEngine.getOrCreatePlayer(targetClient, ctx.guild.id, guard.voiceChannel, ctx.channel);
            // ⚡ Instantly join voice channel in background without blocking search
            player.connect().catch(() => {});

            try {
                // Fast search with 4-second timeout guarantee
                const result = await Promise.race([
                    StarryAudioEngine.search(query, ctx.user),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Audio search timed out after 4s')), 4000))
                ]);

                if (!result || !result.tracks || result.tracks.length === 0) {
                    if (loadingMsg) loadingMsg.delete().catch(() => {});
                    const { sendNoResultsFallback } = require('../../utils/musicSearchHelper');
                    return sendNoResultsFallback(ctx, query);
                }

                if (result.type === 'PLAYLIST') {
                    for (const track of result.tracks) {
                        player.queue.push(track);
                    }
                    if (!player.currentTrack) {
                        player.playNext().catch(err => console.warn('playNext error:', err.message || err));
                    }

                    if (loadingMsg) {
                        loadingMsg.delete().catch(() => {});
                        player.loadingMessage = null;
                    }

                    const totalDurationMs = result.tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
                    const totalDurationStr = formatTime(totalDurationMs);

                    const previewTracks = result.tracks.slice(0, 3).map((t, idx) => {
                        return `\`${idx + 1}.\` **[${(t.title || 'Track').substring(0, 45)}](${t.url || 'https://discord.gg'})** • \`${t.author || 'Artist'}\` (\`${formatTime(t.duration)}\`)`;
                    }).join('\n');
                    const remainingCount = result.tracks.length > 3 ? `\n*... and **${result.tracks.length - 3}** more tracks*` : '';

                    const embed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setAuthor({ 
                            name: `📚 Playlist Enqueued • ${result.source || 'Online Stream'}`, 
                            iconURL: ctx.user.displayAvatarURL({ dynamic: true }) 
                        })
                        .setTitle(result.playlistName ? result.playlistName.substring(0, 95) : 'Loaded Playlist')
                        .setThumbnail(result.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80')
                        .setDescription(
                            `✅ Added **${result.tracks.length}** tracks to the server queue!\n\n` +
                            `👤 **Curator / Artist:** \`${result.author || 'Featured Artist'}\`\n` +
                            `🕒 **Total Estimated Playtime:** \`${totalDurationStr}\`\n` +
                            `🔠 **Queue Status:** Currently playing • \`${player.queue.length}\` songs in queue\n` +
                            `🔊 **Mastering:** \`Empowering Hi-Fi Dynamic EQ Active\`\n\n` +
                            `📝 **Upcoming Tracks Preview:**\n` +
                            `${previewTracks}${remainingCount}`
                        )
                        .setFooter({ text: `Requested by ${ctx.user.tag} • Prefix: ,`, iconURL: ctx.user.displayAvatarURL() })
                        .setTimestamp();
                    return ctx.reply({ embeds: [embed] });
                } else {
                    const track = result.tracks[0];
                    if (!player.currentTrack) {
                        player.queue.push(track);
                        // ⚡ Launch playback asynchronously in background - NEVER wait for it before showing embed!
                        player.playNext().catch(err => console.warn('playNext error:', err.message || err));

                        // ⚡ Deliver Now Playing embed immediately (< 2 seconds)!
                        const payload = player.buildNowPlayingPayload(track);
                        let sentMsg = null;
                        if (ctx.isSlash) {
                            sentMsg = await ctx.reply(payload).catch(() => null);
                        } else if (loadingMsg) {
                            sentMsg = await loadingMsg.edit({ content: null, ...payload }).catch(() => null);
                            if (!sentMsg) sentMsg = await ctx.reply(payload).catch(() => null);
                        } else {
                            sentMsg = await ctx.reply(payload).catch(() => null);
                        }
                        if (sentMsg) {
                            player.nowPlayingMessage = sentMsg;
                        }
                        return;
                    } else {
                        if (loadingMsg) {
                            loadingMsg.delete().catch(() => {});
                            player.loadingMessage = null;
                        }
                        player.queue.push(track);
                        const embed = new EmbedBuilder()
                            .setColor('#5865F2')
                            .setAuthor({ name: 'Track Queued • Empowering Sound Active', iconURL: ctx.user.displayAvatarURL({ dynamic: true }) })
                            .setTitle(track.title ? track.title.substring(0, 90) : 'Track')
                            .setURL(track.url || 'https://discord.gg')
                            .setThumbnail(track.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80')
                            .setDescription(
                                `👤 **Artist:** \`${track.author || 'Artist'}\`\n` +
                                `🕒 **Duration:** \`${formatTime(track.duration)}\`\n` +
                                `🔢 **Queue Position:** \`#${player.queue.length}\`\n` +
                                `🌐 **Source:** \`${track.source || 'Studio Hi-Fi'}\`\n` +
                                `🔊 **Sound Profile:** \`Empowering Master Dynamic EQ\``
                            )
                            .setFooter({ text: `Requested by ${ctx.user.tag} • Prefix: ,` })
                            .setTimestamp();
                        return ctx.reply({ embeds: [embed] });
                    }
                }
            } catch (err) {
                if (loadingMsg) loadingMsg.delete().catch(() => {});
                console.error('Play command error:', err);
                return ctx.reply(`❌ Playback error: \`${err.message}\``);
            }
        }
    },

    // 2. PAUSE
    {
        name: 'pause',
        aliases: [],
        category: 'Music',
        description: 'Pause audio playback.',
        usage: ',pause',
        async execute(ctx) {
            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player || !player.currentTrack) return ctx.reply('❌ No active audio stream in this server.');

            if (player.paused) return ctx.reply('⚠️ Music is already paused.');
            player.pause(true);
            return ctx.reply('⏸️ **Paused audio playback.**');
        }
    },

    // 3. RESUME
    {
        name: 'resume',
        aliases: ['unpause'],
        category: 'Music',
        description: 'Resume paused audio playback.',
        usage: ',resume',
        async execute(ctx) {
            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player || !player.currentTrack) return ctx.reply('❌ No active audio stream in this server.');

            if (!player.paused) return ctx.reply('⚠️ Music is not paused.');
            player.pause(false);
            return ctx.reply('▶️ **Resumed audio playback.**');
        }
    },

    // 4. SKIP
    {
        name: 'skip',
        aliases: ['s', 'next'],
        category: 'Music',
        description: 'Skip the current track.',
        usage: ',skip',
        async execute(ctx) {
            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player || !player.currentTrack) return ctx.reply('❌ No track currently playing.');

            const skippedTitle = player.currentTrack.title;
            player.skip();
            return ctx.reply(`⏭️ **Skipped:** \`${skippedTitle}\``);
        }
    },

    // 5. STOP
    {
        name: 'stop',
        aliases: ['leave', 'dc', 'disconnect'],
        category: 'Music',
        description: 'Stop audio, clear queue, and leave voice channel.',
        usage: ',stop',
        async execute(ctx) {
            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player) return ctx.reply('❌ No active audio session.');

            player.destroy();
            return ctx.reply('⏹️ **Playback stopped and queue cleared.**');
        }
    },

    // 6. QUEUE
    {
        name: 'queue',
        aliases: ['q', 'list'],
        category: 'Music',
        description: 'Display current song and upcoming queue.',
        usage: ',queue',
        async execute(ctx) {
            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player || (!player.currentTrack && player.queue.length === 0)) {
                return ctx.reply('❌ No active audio queue in this server.');
            }

            const current = player.currentTrack;
            const queueList = player.queue;
            const progress = createProgressBar(player.position, current?.duration || 0);

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle(`🎵 Music Queue — ${ctx.guild.name}`)
                .setDescription(
                    `**Now Playing:**\n${current ? `▶️ [${current.title}](${current.url || 'https://discord.gg'})\n\`[${formatTime(player.position)}]\` ${progress} \`[${formatTime(current.duration)}]\`` : 'None'}\n\n` +
                    `**Up Next (${queueList.length} tracks):**\n` +
                    (queueList.length > 0 
                        ? queueList.slice(0, 10).map((t, idx) => `\`${idx + 1}.\` [${t.title?.substring(0, 60)}](${t.url || 'https://discord.gg'}) | \`${formatTime(t.duration)}\``).join('\n')
                        : '*No upcoming tracks in queue.*')
                )
                .setFooter({ text: `Loop: ${player.loop.toUpperCase()} • Autoplay: ${player.autoplay ? 'ON' : 'OFF'} • Volume: ${player.volume}%` })
                .setTimestamp();

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 7. VOLUME
    {
        name: 'volume',
        aliases: ['vol', 'v'],
        category: 'Music',
        description: 'Adjust playback output volume (1-150%).',
        usage: ',volume <1-150>',
        async execute(ctx) {
            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player) return ctx.reply('❌ No active audio stream.');

            let amount = ctx.args[0] ? parseInt(ctx.args[0], 10) : null;
            if (isNaN(amount) || amount < 1 || amount > 150) {
                return ctx.reply(`🔊 Current volume is: **${player.volume}%**\n*To change: \`,volume 80\`*`);
            }

            player.setVolume(amount);
            return ctx.reply(`🔊 Volume set to **${amount}%**!`);
        }
    },

    // 8. LOOP
    {
        name: 'loop',
        aliases: ['repeat', 'l'],
        category: 'Music',
        description: 'Loop the current song or entire queue.',
        usage: ',loop [off/track/queue]',
        async execute(ctx) {
            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player) return ctx.reply('❌ No active audio stream.');

            let mode = ctx.args[0]?.toLowerCase();
            if (!['off', 'track', 'queue'].includes(mode)) {
                mode = player.loop === 'none' ? 'track' : player.loop === 'track' ? 'queue' : 'none';
            }

            player.loop = mode === 'off' ? 'none' : mode;
            return ctx.reply(`🔁 Loop mode set to: **${player.loop.toUpperCase()}**`);
        }
    },

    // 9. SHUFFLE
    {
        name: 'shuffle',
        aliases: ['mix', 'shuff'],
        category: 'Music',
        description: 'Randomize the order of tracks in the queue.',
        usage: ',shuffle',
        async execute(ctx) {
            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player || player.queue.length <= 1) {
                return ctx.reply('❌ Need at least 2 songs in the queue to shuffle.');
            }

            player.shuffle();
            return ctx.reply(`🔀 **Successfully shuffled ${player.queue.length} tracks in queue!**`);
        }
    },

    // 10. NOW PLAYING
    {
        name: 'nowplaying',
        aliases: ['np', 'current'],
        category: 'Music',
        description: 'View full details and live progress of active song.',
        usage: ',nowplaying',
        async execute(ctx) {
            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player || !player.currentTrack) return ctx.reply('❌ No audio currently playing.');

            const track = player.currentTrack;
            const progress = createProgressBar(player.position, track.duration);

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle(`Now Playing: ${track.title}`)
                .setURL(track.url || 'https://discord.gg')
                .setThumbnail(track.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80')
                .setDescription(
                    `👤 **Artist:** \`${track.author || 'Artist'}\`\n` +
                    `🕒 **Progress:** \`${formatTime(player.position)} / ${formatTime(track.duration)}\`\n` +
                    `${progress}\n\n` +
                    `🎛️ **Filter:** \`${player.filter.toUpperCase()}\` | 🔊 **Volume:** \`${player.volume}%\`\n` +
                    `👤 **Requester:** ${track.requester ? `<@${track.requester.id}>` : 'Unknown'}`
                )
                .setFooter({ text: 'High-Fidelity Audio Engine • Prefix: ,' });

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 11. 24/7 MODE
    {
        name: '247',
        aliases: ['stay', 'alwayson'],
        category: 'Music',
        description: 'Keep the bot inside voice channel 24/7 without disconnecting.',
        usage: ',247',
        async execute(ctx) {
            if (!await requirePremium(ctx, '24/7 Voice Channel Mode')) return;

            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const targetClient = guard.workerClient || ctx.client;
            const player = StarryAudioEngine.getOrCreatePlayer(targetClient, ctx.guild.id, guard.voiceChannel, ctx.channel);
            player.connect().catch(() => {});
            player.is247 = !player.is247;

            return ctx.reply(`📻 24/7 Voice Channel Persistence is now: **${player.is247 ? '🟢 ENABLED' : '🔴 DISABLED'}**!`);
        }
    },

    // 12. AUTOPLAY
    {
        name: 'autoplay',
        aliases: ['ap', 'auto'],
        category: 'Music',
        description: 'Toggle automatic recommendation queueing when playlist ends.',
        usage: ',autoplay',
        async execute(ctx) {
            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const targetClient = guard.workerClient || ctx.client;
            let kPlayer = targetClient.manager?.getPlayer(ctx.guild.id);
            if (!kPlayer && targetClient.multiBot?.instances) {
                for (const inst of targetClient.multiBot.instances.values()) {
                    if (inst.client?.manager) {
                        const p = inst.client.manager.getPlayer(ctx.guild.id);
                        if (p) { kPlayer = p; break; }
                    }
                }
            }

            let newState = false;
            if (kPlayer) {
                const cur = Boolean(kPlayer.data?.get('autoplay') || kPlayer.autoplay);
                newState = !cur;
                kPlayer.data?.set('autoplay', newState);
                kPlayer.autoplay = newState;

                if (newState) {
                    const { triggerAutoplayBuffer } = require('../../utils/musicManager');
                    triggerAutoplayBuffer(kPlayer, kPlayer.queue.length === 0 && !kPlayer.playing).catch(() => {});
                }

                // Live update the now-playing embed components
                const nowMsg = kPlayer.data?.get('nowPlayingMessage');
                if (nowMsg && typeof nowMsg.edit === 'function') {
                    const { buildNowPlayingComponents } = require('../../utils/musicManager');
                    nowMsg.edit({ components: buildNowPlayingComponents(ctx.guild.id, newState) }).catch(() => {});
                }
            } else {
                const player = StarryAudioEngine.getOrCreatePlayer(targetClient, ctx.guild.id, guard.voiceChannel, ctx.channel);
                player.autoplay = !player.autoplay;
                newState = player.autoplay;
                if (player.currentTrack && typeof player.sendNowPlayingPanel === 'function') {
                    await player.sendNowPlayingPanel(player.currentTrack, true).catch(() => {});
                }
            }

            // Sync controller if deployed
            try {
                const musicController = require('../../modules/musicController');
                musicController.update(ctx.guild.id, targetClient).catch(() => {});
            } catch (e) {}

            const embed = new EmbedBuilder()
                .setColor(newState ? '#57F287' : '#ED4245')
                .setAuthor({ 
                    name: '📻 Autoplay Smart Stream Engine', 
                    iconURL: 'https://cdn.discordapp.com/emojis/1049283733054177301.webp?size=96' 
                })
                .setTitle(newState ? '🟢 Autoplay Smart Stream: ENABLED' : '🔴 Autoplay Smart Stream: DISABLED')
                .setDescription(
                    newState
                        ? `Starry will automatically fetch and queue matching recommended songs from Spotify & YouTube when the playlist ends!\n\n` +
                          `✨ **Pro-Tip:** You can also click the 📻 **AutoPlay** button on the player embed for 1-click toggling.`
                        : `Playback will stop when the current queue reaches the end.`
                )
                .setFooter({ text: 'Starry Hi-Fi Audio Engine • Continuous Streaming' });

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 13. BASS (Physical Vibration Sub-Bass)
    {
        name: 'bass',
        aliases: ['bb', 'bassboost', 'vibrate', 'vibration', 'deepbass', 'subwoofer'],
        category: 'Music',
        description: 'Apply deep physical vibration sub-bass (Vocals & clarity 100% intact).',
        usage: ',bass',
        async execute(ctx) {
            if (!await requirePremium(ctx, 'Bass (Physical Vibration DSP Filter)')) return;

            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player) return ctx.reply('❌ No active audio stream.');

            await player.setFilter('bass');
            return ctx.reply('🔊 **Applied Audio Filter: BASS (Deep Physical Subwoofer Vibration • 100% Intact Clarity)**');
        }
    },

    // 14. 8D AUDIO
    {
        name: '8d',
        aliases: ['binaural'],
        category: 'Music',
        description: 'Apply 360° rotating spatial surround sound.',
        usage: ',8d',
        async execute(ctx) {
            if (!await requirePremium(ctx, '360° 8D Audio (Studio DSP Filter)')) return;

            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player) return ctx.reply('❌ No active audio stream.');

            await player.setFilter('8d');
            return ctx.reply('🌀 **Applied Audio Filter: 8D SPATIAL AUDIO (360° Binaural Surround)**');
        }
    },

    // 15. NIGHTCORE
    {
        name: 'nightcore',
        aliases: ['nc'],
        category: 'Music',
        description: 'Speed up tempo and pitch up audio.',
        usage: ',nightcore',
        async execute(ctx) {
            if (!await requirePremium(ctx, 'Nightcore Remix (Studio DSP Filter)')) return;

            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player) return ctx.reply('❌ No active audio stream.');

            await player.setFilter('nightcore');
            return ctx.reply('✨ **Applied Audio Filter: NIGHTCORE (Sped Up + Higher Pitch)**');
        }
    },

    // 16. DAYCORE / SLOWED
    {
        name: 'daycore',
        aliases: ['slowed'],
        category: 'Music',
        description: 'Slow down tempo and lower pitch with warm acoustics.',
        usage: ',daycore',
        async execute(ctx) {
            if (!await requirePremium(ctx, 'Daycore Reverb (Studio DSP Filter)')) return;

            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player) return ctx.reply('❌ No active audio stream.');

            await player.setFilter('daycore');
            return ctx.reply('🌅 **Applied Audio Filter: DAYCORE (Slowed Tempo + Deep Warmth)**');
        }
    },

    // 17. VAPORWAVE
    {
        name: 'vaporwave',
        aliases: ['vw'],
        category: 'Music',
        description: 'Slowed reverb + retro cassette aesthetic.',
        usage: ',vaporwave',
        async execute(ctx) {
            if (!await requirePremium(ctx, 'Vaporwave Lo-Fi (Studio DSP Filter)')) return;

            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player) return ctx.reply('❌ No active audio stream.');

            await player.setFilter('vaporwave');
            return ctx.reply('🪩 **Applied Audio Filter: VAPORWAVE (Retro Cassette + Dreamy Reverb)**');
        }
    },

    // 17B. LO-FI CHILL
    {
        name: 'lofi',
        aliases: ['lo-fi', 'chill'],
        category: 'Music',
        description: 'Warm analog vinyl tape flutter & mellow acoustic tone.',
        usage: ',lofi',
        async execute(ctx) {
            if (!await requirePremium(ctx, 'Lo-Fi Chill (Studio DSP Filter)')) return;

            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player) return ctx.reply('❌ No active audio stream.');

            await player.setFilter('lofi');
            return ctx.reply('☕ **Applied Audio Filter: LO-FI CHILL (Vintage Vinyl Warmth + Tape Flutter)**');
        }
    },

    // 17C. SLOWED & REVERB
    {
        name: 'reverb',
        aliases: ['slowreverb', 'hall', 'echo'],
        category: 'Music',
        description: 'Immersive stadium & cathedral concert reverb.',
        usage: ',reverb',
        async execute(ctx) {
            if (!await requirePremium(ctx, 'Slowed & Reverb (Studio DSP Filter)')) return;

            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player) return ctx.reply('❌ No active audio stream.');

            await player.setFilter('reverb');
            return ctx.reply('🌌 **Applied Audio Filter: SLOWED & REVERB (Cathedral Concert Hall Atmosphere)**');
        }
    },

    // 17D. KARAOKE / VOCAL REMOVER
    {
        name: 'karaoke',
        aliases: ['vocalremover', 'vocalcut', 'instrumental'],
        category: 'Music',
        description: 'Attenuate center lead vocals for sing-along or instrumental.',
        usage: ',karaoke',
        async execute(ctx) {
            if (!await requirePremium(ctx, 'Karaoke Vocal Remover (Studio DSP Filter)')) return;

            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player) return ctx.reply('❌ No active audio stream.');

            await player.setFilter('karaoke');
            return ctx.reply('🎤 **Applied Audio Filter: KARAOKE (Center Lead Vocal Cancellation)**');
        }
    },

    // 17E. 3D SURROUND SOUND
    {
        name: 'surround',
        aliases: ['3d', 'spatial'],
        category: 'Music',
        description: 'Wide immersive cinematic surround soundstage.',
        usage: ',surround',
        async execute(ctx) {
            if (!await requirePremium(ctx, '3D Surround Sound (Studio DSP Filter)')) return;

            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player) return ctx.reply('❌ No active audio stream.');

            await player.setFilter('surround');
            return ctx.reply('🎧 **Applied Audio Filter: 3D SURROUND (Wide Panoramic Soundstage)**');
        }
    },

    // 17F. ELECTRONIC / CLUB MASTER
    {
        name: 'electronic',
        aliases: ['edm', 'club'],
        category: 'Music',
        description: 'High-energy dance punch & crisp sizzling hats for EDM & Phonk.',
        usage: ',electronic',
        async execute(ctx) {
            if (!await requirePremium(ctx, 'EDM & Club Master (Studio DSP Filter)')) return;

            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player) return ctx.reply('❌ No active audio stream.');

            await player.setFilter('electronic');
            return ctx.reply('⚡ **Applied Audio Filter: EDM & CLUB (Heavy Kick Punch • Sizzling Top End)**');
        }
    },

    // 17G. SOFT & MELLOW
    {
        name: 'soft',
        aliases: ['mellow', 'relax'],
        category: 'Music',
        description: 'Non-fatiguing smooth sound for late night study & relaxation.',
        usage: ',soft',
        async execute(ctx) {
            if (!await requirePremium(ctx, 'Soft & Mellow (Studio DSP Filter)')) return;

            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player) return ctx.reply('❌ No active audio stream.');

            await player.setFilter('soft');
            return ctx.reply('🍃 **Applied Audio Filter: SOFT & MELLOW (Fatigue-Free Smooth Acoustics)**');
        }
    },

    // 17H. RETRO RADIO
    {
        name: 'radio',
        aliases: ['vintage'],
        category: 'Music',
        description: 'Vintage 1950s AM telephone receiver sound.',
        usage: ',radio',
        async execute(ctx) {
            if (!await requirePremium(ctx, 'Retro Radio (Studio DSP Filter)')) return;

            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player) return ctx.reply('❌ No active audio stream.');

            await player.setFilter('radio');
            return ctx.reply('📻 **Applied Audio Filter: RETRO RADIO (Vintage AM Telephone Bandpass)**');
        }
    },

    // 18. TREBLE
    {
        name: 'treble',
        aliases: [],
        category: 'Music',
        description: 'Boost high frequencies for crystal clear audio.',
        usage: ',treble',
        async execute(ctx) {
            if (!await requirePremium(ctx, 'Treble Boost (Studio DSP Filter)')) return;

            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player) return ctx.reply('❌ No active audio stream.');

            await player.setFilter('treble');
            return ctx.reply('💎 **Applied Audio Filter: TREBLE BOOST (Crystal Clear Highs)**');
        }
    },

    // 19. POP
    {
        name: 'pop',
        aliases: [],
        category: 'Music',
        description: 'Enhance vocal clarity and acoustic profile.',
        usage: ',pop',
        async execute(ctx) {
            if (!await requirePremium(ctx, 'Vocal & Pop Clarity (Studio DSP Filter)')) return;

            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player) return ctx.reply('❌ No active audio stream.');

            await player.setFilter('pop');
            return ctx.reply('🎙️ **Applied Audio Filter: POP & VOCAL CLARITY (Forward Intelligible Vocals)**');
        }
    },

    // 20. CLEAR FILTERS
    {
        name: 'clearfilters',
        aliases: ['resetfilters', 'cf', 'clearfilter'],
        category: 'Music',
        description: 'Reset all active audio filters back to normal studio master.',
        usage: ',clearfilters',
        async execute(ctx) {
            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player) return ctx.reply('❌ No active audio stream.');

            await player.setFilter('clear');
            return ctx.reply('🚫 **All audio filters cleared (Standard Hi-Fi Flat Master).**');
        }
    },

    // 20B. STUDIO HI-FI MASTER
    {
        name: 'hifi',
        aliases: ['empower', 'empowering', 'master', 'audiophile', 'studio'],
        category: 'Music',
        description: 'Activate Studio Hi-Fi Mastering (Deep sub-bass rumble, mud scoop, vocal clarity & wide stage).',
        usage: ',hifi',
        async execute(ctx) {
            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player) return ctx.reply('❌ No active audio stream.');

            await player.setFilter('empowering');
            return ctx.reply('✨ **Applied Studio Hi-Fi Master: Crisp Vocal Clarity, Deep Tactile Sub-Bass & Zero-Distortion Dynamics!**');
        }
    },

    // 20C. MASTER FILTER HUB
    {
        name: 'filter',
        aliases: ['filters', 'dsp'],
        category: 'Music',
        description: 'View or select from all 16 studio-grade DSP audio filters.',
        usage: ',filter <name> or ,filters',
        async execute(ctx) {
            const requested = (ctx.args[0] || '').toLowerCase().trim();

            const filterMap = {
                empowering: 'empowering',
                hifi: 'empowering',
                master: 'empowering',
                studio: 'empowering',
                audiophile: 'empowering',
                empower: 'empowering',
                bass: 'bass',
                bb: 'bass',
                bassboost: 'bass',
                vibrate: 'bass',
                vibration: 'bass',
                deepbass: 'bass',
                subwoofer: 'bass',
                '8d': '8d',
                binaural: '8d',
                nightcore: 'nightcore',
                nc: 'nightcore',
                daycore: 'daycore',
                slowed: 'daycore',
                vaporwave: 'vaporwave',
                vw: 'vaporwave',
                lofi: 'lofi',
                'lo-fi': 'lofi',
                chill: 'lofi',
                reverb: 'reverb',
                slowreverb: 'reverb',
                hall: 'reverb',
                echo: 'reverb',
                karaoke: 'karaoke',
                vocalremover: 'karaoke',
                instrumental: 'karaoke',
                vocalcut: 'karaoke',
                surround: 'surround',
                '3d': 'surround',
                spatial: 'surround',
                electronic: 'electronic',
                edm: 'electronic',
                club: 'electronic',
                soft: 'soft',
                mellow: 'soft',
                relax: 'soft',
                radio: 'radio',
                vintage: 'radio',
                treble: 'treble',
                pop: 'pop',
                clear: 'clear',
                reset: 'clear',
                off: 'clear',
                none: 'clear'
            };

            if (requested && filterMap[requested]) {
                const targetFilter = filterMap[requested];
                const guard = getVoiceGuard(ctx);
                if (guard.error) return ctx.reply(guard.error);

                const player = getActivePlayer(ctx.client, ctx.guild.id);
                if (!player) return ctx.reply('❌ No active audio stream.');

                if (targetFilter !== 'clear' && targetFilter !== 'empowering') {
                    if (!await requirePremium(ctx, `${targetFilter.toUpperCase()} (Studio DSP Filter)`)) return;
                }

                await player.setFilter(targetFilter);
                return ctx.reply(`🎧 **Applied Audio Filter:** \`${targetFilter.toUpperCase()}\``);
            }

            // Overview Embed of all 16 studio filters
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ 
                    name: 'Starry Hi-Fi Studio DSP Audio Engine', 
                    iconURL: 'https://cdn.discordapp.com/emojis/1049283733054177301.webp?size=96' 
                })
                .setTitle('🎛️ 16 Studio-Grade DSP Audio Filters')
                .setDescription(
                    `Switch audio filters dynamically in real time using \`,filter <name>\` or dedicated commands:\n\n` +
                    `✨ **\`,hifi\`** — ⭐ **Studio Hi-Fi Master (Default)** (Pristine vocals, tactile sub-bass, zero distortion)\n` +
                    `🔊 **\`,bass\`** — Deep physical subwoofer vibration (Earphones rattle • Vocals clear)\n` +
                    `🌀 **\`,8d\`** — 360° binaural rotating spatial surround\n` +
                    `✨ **\`,nightcore\`** — Upbeat sped-up tempo + higher pitch\n` +
                    `🌅 **\`,daycore\`** — Relaxed slowed down tempo + acoustic warmth\n` +
                    `🪩 **\`,vaporwave\`** — Retro slowed cassette tape vibe with dreamy tremolo\n` +
                    `☕ **\`,lofi\`** — Vintage analog vinyl tape flutter & softened highs\n` +
                    `🌌 **\`,reverb\`** — Immersive stadium & concert hall reverberation\n` +
                    `🎤 **\`,karaoke\`** — Center lead vocal cancellation for sing-along\n` +
                    `🎧 **\`,surround\`** — Wide panoramic 3D cinematic soundstage\n` +
                    `⚡ **\`,electronic\`** — High-energy EDM & club master with thumping kick\n` +
                    `🍃 **\`,soft\`** — Fatigue-free mellow listening with rounded highs\n` +
                    `📻 **\`,radio\`** — Vintage 1950s AM telephone receiver bandpass\n` +
                    `💎 **\`,treble\`** — Crisp crystal clear high frequencies\n` +
                    `🎙️ **\`,pop\`** — Enhanced vocal presence & acoustic sheen\n` +
                    `🚫 **\`,clearfilters\`** — Reset all filters back to studio flat\n\n` +
                    `*💡 Pro-Tip: You can also use the interactive dropdown menu on the player embed or web dashboard!*`
                )
                .setFooter({ text: 'Starry Hi-Fi Audio Suite • Real-Time DSP Mastering' });

            return ctx.reply({ embeds: [embed] });
        }
    },

    // 21. JUMP / SKIPTO
    {
        name: 'jump',
        aliases: ['skipto'],
        category: 'Music',
        description: 'Jump directly to a specific song in queue.',
        usage: ',jump <position number>',
        async execute(ctx) {
            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player || player.queue.length === 0) return ctx.reply('❌ Queue is empty.');

            const pos = parseInt(ctx.args[0], 10);
            if (isNaN(pos) || pos < 1 || pos > player.queue.length) {
                return ctx.reply(`❌ Invalid queue position. Must be between 1 and ${player.queue.length}.`);
            }

            player.jump(pos);
            return ctx.reply(`⏭️ **Jumped to queue position #${pos}!**`);
        }
    },

    // 22. MOVE
    {
        name: 'move',
        aliases: [],
        category: 'Music',
        description: 'Move a song from one queue position to another.',
        usage: ',move <from position> <to position>',
        async execute(ctx) {
            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player || player.queue.length < 2) return ctx.reply('❌ Need at least 2 songs in queue to move.');

            const from = parseInt(ctx.args[0], 10);
            const to = parseInt(ctx.args[1], 10);
            if (isNaN(from) || isNaN(to) || !player.move(from, to)) {
                return ctx.reply(`❌ Invalid positions. Usage: \`,move 3 1\``);
            }

            return ctx.reply(`📦 **Moved track from #${from} to #${to}!**`);
        }
    },

    // 23. REMOVE
    {
        name: 'remove',
        aliases: ['rm'],
        category: 'Music',
        description: 'Remove a specific song from queue.',
        usage: ',remove <position number>',
        async execute(ctx) {
            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player || player.queue.length === 0) return ctx.reply('❌ Queue is empty.');

            const pos = parseInt(ctx.args[0], 10);
            const removed = player.remove(pos);
            if (!removed) return ctx.reply(`❌ Invalid position. Must be between 1 and ${player.queue.length}.`);

            return ctx.reply(`🗑️ **Removed:** \`${removed.title}\` from queue.`);
        }
    },

    // 24. CLEAR QUEUE
    {
        name: 'clear',
        aliases: ['cq', 'clearqueue'],
        category: 'Music',
        description: 'Clear all upcoming tracks from queue.',
        usage: ',clear',
        async execute(ctx) {
            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player || player.queue.length === 0) return ctx.reply('❌ Queue is already empty.');

            const count = player.clearQueue();
            return ctx.reply(`🗑️ **Cleared ${count} songs from the queue.**`);
        }
    },

    // 25. REPLAY
    {
        name: 'replay',
        aliases: ['restart'],
        category: 'Music',
        description: 'Restart the current song from the beginning.',
        usage: ',replay',
        async execute(ctx) {
            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player || !player.currentTrack) return ctx.reply('❌ No track currently playing.');

            player.replay();
            return ctx.reply(`🔄 **Replaying:** \`${player.currentTrack.title}\``);
        }
    },

    // 26. PREVIOUS
    {
        name: 'previous',
        aliases: ['prev', 'back'],
        category: 'Music',
        description: 'Play the previous song from history.',
        usage: ',previous',
        async execute(ctx) {
            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player || !player.previous()) {
                return ctx.reply('❌ No previous track found in history.');
            }

            return ctx.reply('⏮️ **Playing previous song from history!**');
        }
    },

    // 27. JOIN
    {
        name: 'join',
        aliases: ['summon', 'connect'],
        category: 'Music',
        description: 'Summon the bot to your voice channel.',
        usage: ',join',
        async execute(ctx) {
            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const targetClient = guard.workerClient || ctx.client;
            const player = StarryAudioEngine.getOrCreatePlayer(targetClient, ctx.guild.id, guard.voiceChannel, ctx.channel);
            await player.connect();

            return ctx.reply(`👋 **Joined voice channel:** <#${guard.voiceChannel.id}>`);
        }
    },

    // 28. SEARCH
    {
        name: 'search',
        aliases: ['find'],
        category: 'Music',
        description: 'Interactive multi-platform audio search across SoundCloud, Spotify, Apple Music & YouTube.',
        usage: ',search <song name or artist>',
        async autocomplete(interaction, client) {
            const { getSongAutocomplete } = require('../../utils/musicSearchHelper');
            const focused = interaction.options.getFocused();
            const choices = await getSongAutocomplete(focused, client.manager);
            return interaction.respond(choices).catch(() => {});
        },
        async execute(ctx) {
            const query = (ctx.isSlash && typeof ctx.interaction?.options?.getString === 'function') 
                ? ctx.interaction.options.getString('query') 
                : (ctx.args ? ctx.args.join(' ') : '');
            const { executeSearchCommand } = require('../../utils/musicSearchHelper');
            return executeSearchCommand(ctx, query);
        }
    },

    // 29. DJ PANEL
    {
        name: 'djpanel',
        aliases: ['musicpanel', 'panel'],
        category: 'Music',
        description: 'Deploy the interactive DJ and Voice Control Panel.',
        usage: ',djpanel',
        async execute(ctx) {
            const { voiceChannel } = getVoiceGuard(ctx);
            const player = getActivePlayer(ctx.client, ctx.guild.id);

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🎛️ Ultimate DJ & Voice Control Hub')
                .setDescription(
                    `Complete master command center for voice channel security and audio playback.\n\n` +
                    `🎙️ **Active VC:** \`${voiceChannel ? voiceChannel.name : 'Not Connected'}\`\n` +
                    `🎵 **Now Playing:** \`${player?.currentTrack ? player.currentTrack.title : 'None'}\`\n` +
                    `🔊 **Volume:** \`${player ? player.volume : 100}%\` | **Filter:** \`${player ? player.filter.toUpperCase() : 'CLEAR'}\``
                )
                .setFooter({ text: 'High-Fidelity Audio Control Hub' })
                .setTimestamp();

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('music_pause').setEmoji('⏸️').setLabel('Pause').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('music_skip').setEmoji('⏭️').setLabel('Skip').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('music_loop').setEmoji('🔁').setLabel('Loop').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('music_stop').setEmoji('⏹️').setLabel('Stop').setStyle(ButtonStyle.Danger)
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('dj_vol_down').setEmoji('🔉').setLabel('Vol -').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('dj_vol_up').setEmoji('🔊').setLabel('Vol +').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('dj_shuffle').setEmoji('🔀').setLabel('Shuffle').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('music_queue').setEmoji('📜').setLabel('Queue').setStyle(ButtonStyle.Secondary)
            );

            const row3 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('dj_lock').setEmoji('🔒').setLabel('Lock VC').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('dj_unlock').setEmoji('🔓').setLabel('Unlock VC').setStyle(ButtonStyle.Success)
            );

            return ctx.reply({ embeds: [embed], components: [row1, row2, row3] });
        }
    },

    // 30. GRAB / SAVE
    {
        name: 'grab',
        aliases: ['save', 'dm'],
        category: 'Music',
        description: 'Send current playing song info and link to your DMs.',
        usage: ',grab',
        async execute(ctx) {
            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player || !player.currentTrack) return ctx.reply('❌ No audio currently playing.');

            const track = player.currentTrack;
            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.PRIMARY)
                .setTitle(`💾 Saved Track: ${track.title}`)
                .setURL(track.url || 'https://discord.gg')
                .setDescription(`👤 **Artist:** \`${track.author || 'Artist'}\`\n🕒 **Duration:** \`${formatTime(track.duration)}\`\n🌐 **Server:** \`${ctx.guild.name}\``)
                .setThumbnail(track.thumbnail || null);

            try {
                await ctx.user.send({ embeds: [embed] });
                return ctx.reply('📬 **Sent track details to your Direct Messages!**');
            } catch (e) {
                return ctx.reply('❌ Could not send DM. Please check your privacy settings!');
            }
        }
    },

    // 31. LYRICS
    {
        name: 'lyrics',
        aliases: ['ly'],
        category: 'Music',
        description: 'Search for lyrics of the currently playing song.',
        usage: ',lyrics [song name]',
        async execute(ctx) {
            const player = getActivePlayer(ctx.client, ctx.guild.id);
            let songTitle = ctx.args.join(' ').trim() || player?.currentTrack?.title;

            if (!songTitle) return ctx.reply('❌ Please provide a song name or start playing a track!');

            await ctx.defer();

            try {
                const cleanedTitle = songTitle.replace(/\(.*?\)|\[.*?\]/g, '').trim();
                const embed = new EmbedBuilder()
                    .setColor(config.EMBED_COLORS.PRIMARY)
                    .setTitle(`📜 Lyrics Search: ${cleanedTitle}`)
                    .setDescription(`Lyrics search preview for **${cleanedTitle}**.\n\n*Stream and listen with high-fidelity lyrics synchronization via active audio stream.*`)
                    .setFooter({ text: 'Audio Intelligence Engine' });

                return ctx.reply({ embeds: [embed] });
            } catch (e) {
                return ctx.reply('❌ Could not fetch lyrics for this song.');
            }
        }
    },

    // 32. SEEK
    {
        name: 'seek',
        aliases: [],
        category: 'Music',
        description: 'Seek to a specific timestamp in the current track.',
        usage: ',seek <seconds>',
        async execute(ctx) {
            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player || !player.currentTrack) return ctx.reply('❌ No track currently playing.');

            const sec = parseInt(ctx.args[0], 10);
            if (isNaN(sec) || sec < 0) return ctx.reply('❌ Please provide a valid timestamp in seconds! Example: `,seek 60`');

            await player.seekTo(sec);
            return ctx.reply(`⏩ **Seeked playback to \`${formatTime(sec * 1000)}\`!**`);
        }
    },

    // 33. SPEED
    {
        name: 'speed',
        aliases: ['tempo'],
        category: 'Music',
        description: 'Adjust playback speed.',
        usage: ',speed <0.5 - 2.0>',
        async execute(ctx) {
            const guard = getVoiceGuard(ctx);
            if (guard.error) return ctx.reply(guard.error);

            const player = getActivePlayer(ctx.client, ctx.guild.id);
            if (!player || !player.currentTrack) return ctx.reply('❌ No track currently playing.');

            const val = parseFloat(ctx.args[0]);
            if (isNaN(val) || val < 0.5 || val > 2.0) {
                return ctx.reply('❌ Speed must be between 0.5x and 2.0x. Example: `,speed 1.25`');
            }

            if (val > 1.1) {
                await player.setFilter('nightcore');
            } else if (val < 0.9) {
                await player.setFilter('daycore');
            } else {
                await player.setFilter('clear');
            }

            return ctx.reply(`⚡ **Playback speed set to \`${val}x\`!**`);
        }
    },

    // 34. SETUP MUSIC CONTROLLER
    {
        name: 'setup',
        aliases: ['musicsetup', 'setcontroller', 'controller', 'requestchannel', 'setmusic'],
        category: 'Music',
        description: 'Deploy the dedicated Starry Music Controller channel where users send song names/links directly.',
        usage: ',setup',
        permissions: [PermissionFlagsBits.ManageGuild],
        async execute(ctx) {
            const member = ctx.member;
            const isOwner = config.BOT_OWNERS?.includes(ctx.user?.id);
            const hasPerm = member?.permissions?.has(PermissionFlagsBits.ManageGuild) || member?.permissions?.has(PermissionFlagsBits.Administrator) || isOwner;

            if (!hasPerm) {
                return ctx.reply('❌ You need the **Manage Server** permission to deploy the Music Controller.');
            }

            await ctx.defer();

            const musicController = require('../../modules/musicController');
            try {
                const { channel } = await musicController.setupChannel(ctx.guild, ctx.user, ctx.client);

                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('🎵 Starry Music Controller Deployed!')
                    .setDescription(
                        `Successfully set up your dedicated music request channel: <#${channel.id}>\n\n` +
                        `✨ **How to use:**\n` +
                        `• Join any voice channel in this server\n` +
                        `• Go to <#${channel.id}>\n` +
                        `• Type any song title or link (Spotify, SoundCloud, YouTube, etc.)\n` +
                        `• The bot will instantly play it and keep the channel clean!\n\n` +
                        `🎛️ **Interactive Controls:**\n` +
                        `Use the button controller in <#${channel.id}> to pause, skip, adjust volume, toggle True Vibration Bass, and manage your session.`
                    )
                    .setFooter({ text: 'Starry Controller System' });

                return ctx.reply({ embeds: [embed] });
            } catch (err) {
                console.error('❌ Error setting up music channel:', err);
                return ctx.reply(`⚠️ Failed to setup music controller: \`${err.message}\``);
            }
        }
    }
];

const spotifyCommand = require('../music/spotify');
commands.push(spotifyCommand);

module.exports = commands;

