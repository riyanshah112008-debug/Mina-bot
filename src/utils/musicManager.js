const { Kazagumo, KazagumoPlayer } = require("kazagumo");
const { Connectors } = require("shoukaku");
const KazagumoSpotify = require("kazagumo-spotify");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const config = require("../config");

// Ensure KazagumoPlayer has .search() for internal delegates
if (KazagumoPlayer && !KazagumoPlayer.prototype.search) {
  KazagumoPlayer.prototype.search = function (query, options) {
    return this.kazagumo.search(query, options);
  };
}

// Format duration helper (mm:ss or hh:mm:ss)
function formatTime(ms) {
  if (!ms || isNaN(ms)) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// High-Reliability Lavalink Nodes (Lavalink v4 Cluster)
const Nodes = [
  {
    name: "Node-1-Serenetia-SSL",
    url: "lavalink.serenetia.com:443",
    auth: "youshallnotpass",
    secure: true,
    retryAmount: 50,
    retryDelay: 3000,
  },
  {
    name: "Node-2-Ajieblogs-NonSSL",
    url: "lava-v4.ajieblogs.eu.org:80",
    auth: "https://dsc.gg/ajidevserver",
    secure: false,
    retryAmount: 50,
    retryDelay: 3000,
  },
];

// Interactive Now Playing Control Rows
function buildNowPlayingComponents(isAutoplay = false, isPaused = false, loopMode = "none") {
  // Row 1: Playback Controls
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("music_pause")
      .setEmoji(isPaused ? "▶️" : "⏸️")
      .setLabel(isPaused ? "Resume" : "Pause")
      .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("music_skip")
      .setEmoji("⏭️")
      .setLabel("Skip")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_loop")
      .setEmoji("🔁")
      .setLabel(`Loop: ${loopMode === "track" ? "Track" : loopMode === "queue" ? "Queue" : "OFF"}`)
      .setStyle(loopMode !== "none" ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_stop")
      .setEmoji("⏹️")
      .setLabel("Stop")
      .setStyle(ButtonStyle.Danger)
  );

  // Row 2: Volume & Queue
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("dj_vol_down")
      .setEmoji("🔉")
      .setLabel("Vol -10%")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("dj_vol_up")
      .setEmoji("🔊")
      .setLabel("Vol +10%")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_shuffle")
      .setEmoji("🔀")
      .setLabel("Shuffle")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_queue")
      .setEmoji("📜")
      .setLabel("Queue")
      .setStyle(ButtonStyle.Secondary)
  );

  // Row 3: Autoplay & Audio Presets
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("music_autoplay")
      .setEmoji("📻")
      .setLabel(isAutoplay ? "AutoPlay: ON" : "AutoPlay: OFF")
      .setStyle(isAutoplay ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  // Row 4: DSP Audio Equalizer Filters
  const filterRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("music_filter")
      .setPlaceholder("🎛️ Select DSP Audio Filter / Equalizer...")
      .addOptions([
        {
          label: "⭐ Studio Hi-Fi Master",
          description: "Audiophile punch, deep sub-bass, silky vocals",
          value: "empowering",
          emoji: "✨",
        },
        {
          label: "Clear / Flat Studio",
          description: "Raw, pristine uncolored studio audio",
          value: "clear",
          emoji: "🚫",
        },
        {
          label: "Bass Boost",
          description: "Deep physical vibration & subwoofer rumble",
          value: "bass",
          emoji: "🔊",
        },
        {
          label: "8D Spatial Audio",
          description: "360° rotating spatial surround sound",
          value: "8d",
          emoji: "🌀",
        },
        {
          label: "Nightcore",
          description: "Sped up tempo + higher pitch aesthetic",
          value: "nightcore",
          emoji: "✨",
        },
        {
          label: "Daycore / Slowed",
          description: "Slowed down tempo + deeper tone",
          value: "daycore",
          emoji: "🌅",
        },
        {
          label: "Vaporwave",
          description: "Slowed reverb + retro cassette feel",
          value: "vaporwave",
          emoji: "🪩",
        },
        {
          label: "Lo-Fi Chill",
          description: "Warm vinyl tape flutter & mellow acoustic tone",
          value: "lofi",
          emoji: "☕",
        },
        {
          label: "Treble Boost",
          description: "Crisp, crystal clear high frequencies",
          value: "treble",
          emoji: "💎",
        },
      ])
  );

  return [row1, row2, row3, filterRow];
}

// DSP Audio Filters Handler
async function applyKazagumoFilter(player, filterName) {
  if (!player || !player.shoukaku) return false;
  try {
    const shoukakuPlayer = player.shoukaku;
    const normalized = (filterName || "clear").toLowerCase().trim();

    switch (normalized) {
      case "bass":
      case "bassboost":
        await shoukakuPlayer.setFilters({
          volume: 0.7,
          equalizer: [
            { band: 0, gain: 0.28 },
            { band: 1, gain: 0.38 },
            { band: 2, gain: 0.32 },
            { band: 3, gain: 0.14 },
            { band: 4, gain: -0.04 },
            { band: 5, gain: -0.12 },
          ],
          timescale: null,
          rotation: null,
        });
        break;

      case "8d":
        await shoukakuPlayer.setFilters({
          volume: 0.94,
          rotation: { rotationHz: 0.22 },
          equalizer: [
            { band: 0, gain: 0.15 },
            { band: 1, gain: 0.12 },
            { band: 10, gain: 0.1 },
            { band: 11, gain: 0.14 },
          ],
          timescale: null,
        });
        break;

      case "nightcore":
        await shoukakuPlayer.setFilters({
          volume: 0.92,
          timescale: { speed: 1.25, pitch: 1.25, rate: 1.0 },
          rotation: null,
        });
        break;

      case "daycore":
      case "slowed":
        await shoukakuPlayer.setFilters({
          volume: 0.88,
          timescale: { speed: 0.85, pitch: 0.85, rate: 1.0 },
          rotation: null,
        });
        break;

      case "vaporwave":
        await shoukakuPlayer.setFilters({
          volume: 0.86,
          timescale: { speed: 0.8, pitch: 0.8, rate: 1.0 },
          tremolo: { frequency: 2.2, depth: 0.16 },
          rotation: null,
        });
        break;

      case "lofi":
        await shoukakuPlayer.setFilters({
          volume: 0.92,
          lowPass: { smoothing: 16.0 },
          timescale: { speed: 0.96, pitch: 0.96, rate: 1.0 },
          rotation: null,
        });
        break;

      case "treble":
        await shoukakuPlayer.setFilters({
          volume: 0.9,
          equalizer: [
            { band: 10, gain: 0.25 },
            { band: 11, gain: 0.3 },
            { band: 12, gain: 0.35 },
            { band: 13, gain: 0.4 },
          ],
          timescale: null,
          rotation: null,
        });
        break;

      case "empowering":
      default:
        await shoukakuPlayer.setFilters({
          volume: 0.95,
          equalizer: [
            { band: 0, gain: 0.18 },
            { band: 1, gain: 0.14 },
            { band: 2, gain: 0.08 },
            { band: 10, gain: 0.12 },
            { band: 11, gain: 0.15 },
          ],
          timescale: null,
          rotation: null,
        });
        break;
    }
    return true;
  } catch (err) {
    console.warn("[MusicManager] Error applying filter:", err.message);
    return false;
  }
}

// Track scoring engine to prioritize high quality studio/official releases
function scoreTrack(track, rawQuery) {
  let score = 100;
  const title = (track.title || "").toLowerCase();
  const author = (track.author || "").toLowerCase();
  const q = (rawQuery || "").toLowerCase();

  if (title.includes("official") || title.includes("original")) score += 50;
  if (title.includes("remix") && !q.includes("remix")) score -= 50;
  if (title.includes("live") && !q.includes("live")) score -= 40;
  if (title.includes("cover") && !q.includes("cover")) score -= 50;
  if (title.includes("karaoke") && !q.includes("karaoke")) score -= 60;

  const len = track.length || 0;
  if (len > 0 && len < 60000) score -= 80; // Penalize short teasers
  if (len > 900000) score -= 60; // Penalize multi-hour loops

  return score;
}

// Autoplay recommendation trigger
async function triggerAutoplayBuffer(player, immediatePlay = false) {
  if (!player || (!player.autoplay && !player.data?.get("autoplay"))) return false;
  const prevTrack = player.data?.get("previousTrack") || player.queue.current;
  if (!prevTrack) return false;

  try {
    const query = `${prevTrack.author || ""} ${prevTrack.title || ""}`.trim();
    const res = await player.search(`ytmsearch:${query}`, { requester: prevTrack.requester });
    if (!res || !res.tracks || res.tracks.length === 0) return false;

    // Pick a related track that isn't the identical same song
    const candidate = res.tracks.find(
      (t) => t.title.toLowerCase() !== prevTrack.title.toLowerCase()
    ) || res.tracks[1] || res.tracks[0];

    if (candidate) {
      player.queue.add(candidate);
      if (immediatePlay && !player.playing && !player.paused) {
        player.play();
      }
      return true;
    }
  } catch (err) {
    console.warn("[MusicManager Autoplay]:", err.message);
  }
  return false;
}

// Main Kazagumo Instance Creator
function createMusicManager(client) {
  if (client.manager) return client.manager;

  const spotifyClientId = process.env.SPOTIFY_CLIENT_ID || "38094e5c24ee435fa153355fb9999cf0";
  const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET || "2967db83b5c24770860861ba6546b455";

  const manager = new Kazagumo(
    {
      defaultSearchEngine: "youtube",
      plugins: [
        new KazagumoSpotify({
          clientId: spotifyClientId,
          clientSecret: spotifyClientSecret,
          playlistPageLimit: 5,
          albumPageLimit: 3,
          searchMarket: "US",
          searchPrefix: "ytmsearch:",
        }),
      ],
      send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild && guild.shard) {
          guild.shard.send(payload);
        } else if (client.ws?.shards) {
          const shard = client.ws.shards.first?.() || client.ws.shards.get(0);
          if (shard) shard.send(payload);
        }
      },
    },
    new Connectors.DiscordJS(client),
    Nodes,
    {
      moveOnDisconnect: true,
      resume: true,
      resumeTimeout: 60,
      reconnectTries: 50,
      reconnectInterval: 3000,
      restTimeout: 10000,
      voiceConnectionTimeout: 15000,
    }
  );

  manager.shoukaku.on("ready", (name) => {
    console.log(`[MusicManager] ✅ Lavalink Active (${client.user ? client.user.username : "Mina"}): Node [${name}] connected!`);
  });

  manager.shoukaku.on("error", (name, error) => {
    console.warn(`[MusicManager] ⚠️ Lavalink Node [${name}] notice:`, error?.message || error);
  });

  manager.shoukaku.on("disconnect", (name, count) => {
    console.warn(`[MusicManager] ⚠️ Lavalink Node [${name}] disconnected (Retry: ${count})`);
  });

  // Track Start Event
  manager.on("playerStart", async (player, track) => {
    player.data.set("previousTrack", track);

    // Apply baseline Hi-Fi DSP filter
    const activeFilter = player.data.get("activeFilter") || "empowering";
    await applyKazagumoFilter(player, activeFilter).catch(() => {});

    const channel = client.channels.cache.get(player.textId);
    if (!channel) return;

    // Delete prior now playing message if any
    const oldMsg = player.data.get("nowPlayingMessage");
    if (oldMsg) {
      await oldMsg.delete().catch(() => {});
      player.data.delete("nowPlayingMessage");
    }

    const fallbackThumb =
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80";
    const trackThumb =
      track.thumbnail && !track.thumbnail.includes("imgur.com")
        ? track.thumbnail
        : fallbackThumb;

    const isAutoplay = Boolean(player.data.get("autoplay") || player.autoplay);
    const loopMode = player.loop || "none";

    const embed = new EmbedBuilder()
      .setColor(config.theme.primary || 0x5865f2)
      .setAuthor({
        name: `Now Playing • ${client.user ? client.user.username : "Mina Bot"}`,
        iconURL: client.user?.displayAvatarURL({ dynamic: true }),
      })
      .setTitle((track.title || "Unknown Track").substring(0, 95))
      .setURL(track.uri || "https://discord.gg")
      .setThumbnail(trackThumb)
      .setDescription(
        `👤 **Artist / Channel:** \`${track.author || "Featured Artist"}\`\n` +
          `🕒 **Track Duration:** \`${formatTime(track.length)}\`\n` +
          `🌐 **Audio Source:** \`${track.sourceName || "Lavalink Hi-Fi"}\`\n` +
          `🎛️ **DSP Preset:** \`${activeFilter.toUpperCase()}\`\n` +
          `🔊 **Volume Level:** \`${player.volume}%\` • 📻 **Autoplay:** \`${isAutoplay ? "ON" : "OFF"}\``
      )
      .setFooter({
        text: `Requested by ${track.requester?.tag || track.requester?.username || "Community Member"} • Prefix: ?`,
      })
      .setTimestamp();

    const components = buildNowPlayingComponents(isAutoplay, player.paused, loopMode);
    try {
      const nowMsg = await channel.send({ embeds: [embed], components });
      player.data.set("nowPlayingMessage", nowMsg);
    } catch (err) {
      console.warn("[MusicManager] Could not send now playing message:", err.message);
    }
  });

  // Track End Event (Autoplay trigger)
  manager.on("playerEnd", async (player) => {
    const isAutoplay = Boolean(player.data.get("autoplay") || player.autoplay);
    if (isAutoplay && player.queue.length === 0) {
      await triggerAutoplayBuffer(player, true).catch(() => false);
    }
  });

  // Queue Empty Event
  manager.on("playerEmpty", async (player) => {
    const isAutoplay = Boolean(player.data.get("autoplay") || player.autoplay);
    if (isAutoplay) {
      const handled = await triggerAutoplayBuffer(player, true).catch(() => false);
      if (handled) return;
    }

    const channel = client.channels.cache.get(player.textId);
    if (channel) {
      const prefix = config.prefix || "?";
      channel
        .send({
          content: `🎶 **Queue has ended.** Use \`${prefix}play <song>\` to add more tracks, or turn on \`${prefix}autoplay\`!`,
        })
        .catch(() => {});
    }
  });

  client.manager = manager;
  return manager;
}

// Global Music Interactive Button & Dropdown Handler
async function handleMusicInteraction(interaction, client) {
  const customId = interaction.customId;
  const guildId = interaction.guildId;
  const memberVoice = interaction.member?.voice?.channel;

  // Voice channel locks can be executed if member is in voice channel
  if (customId === "dj_lock") {
    if (!memberVoice) {
      return interaction.reply({ content: "❌ You must be connected to a voice channel to use lock controls.", ephemeral: true });
    }
    await memberVoice.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false }).catch(() => {});
    return interaction.reply({
      content: `🔒 **Locked voice channel:** <#${memberVoice.id}>\n*Only existing members and moderators can join.*`,
      ephemeral: true,
    });
  }

  if (customId === "dj_unlock") {
    if (!memberVoice) {
      return interaction.reply({ content: "❌ You must be connected to a voice channel to use lock controls.", ephemeral: true });
    }
    await memberVoice.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: null }).catch(() => {});
    return interaction.reply({
      content: `🔓 **Unlocked voice channel:** <#${memberVoice.id}>\n*Channel is now open.*`,
      ephemeral: true,
    });
  }

  const { StarryAudioEngine } = require("./nativeAudioEngine");
  const kPlayer = client.manager?.getPlayer(guildId);
  const nPlayer = StarryAudioEngine.getPlayer(guildId, client);

  if (!kPlayer && !nPlayer) {
    return interaction.reply({
      content: "❌ No active audio playback in this server.",
      ephemeral: true,
    });
  }

  // 1. PAUSE / RESUME
  if (customId === "music_pause" || customId === "dj_pause") {
    if (kPlayer) {
      const newState = !kPlayer.paused;
      kPlayer.pause(newState);
      const loopMode = kPlayer.loop || "none";
      const isAutoplay = Boolean(kPlayer.data?.get("autoplay") || kPlayer.autoplay);
      await interaction.update({
        components: buildNowPlayingComponents(isAutoplay, newState, loopMode),
      }).catch(() => {});
      return interaction.followUp({
        content: newState ? "⏸️ **Paused the music.**" : "▶️ **Resumed playback.**",
        ephemeral: true,
      }).catch(() => {});
    }
    if (nPlayer) {
      const isPaused = nPlayer.pause();
      if (nPlayer.currentTrack) {
        await nPlayer.sendNowPlayingPanel(nPlayer.currentTrack, true).catch(() => {});
      }
      return interaction.reply({
        content: isPaused ? "⏸️ **Paused the music.**" : "▶️ **Resumed playback.**",
        ephemeral: true,
      }).catch(() => {});
    }
  }

  // 2. SKIP
  if (customId === "music_skip" || customId === "dj_skip") {
    if (kPlayer) {
      const current = kPlayer.queue.current?.title || "Current Track";
      kPlayer.skip();
      return interaction.reply({ content: `⏭️ **Skipped:** \`${current}\``, ephemeral: true });
    }
    if (nPlayer) {
      const current = nPlayer.currentTrack?.title || "Current Track";
      nPlayer.skip();
      return interaction.reply({ content: `⏭️ **Skipped:** \`${current}\``, ephemeral: true });
    }
  }

  // 3. STOP
  if (customId === "music_stop" || customId === "dj_stop") {
    if (kPlayer) kPlayer.destroy();
    if (nPlayer) nPlayer.stop();
    return interaction.reply({
      content: "⏹️ **Audio playback stopped and bot disconnected.**",
      ephemeral: true,
    });
  }

  // 4. LOOP
  if (customId === "music_loop" || customId === "dj_loop") {
    if (kPlayer) {
      const currentLoop = kPlayer.loop || "none";
      let nextLoop = currentLoop === "none" ? "track" : currentLoop === "track" ? "queue" : "none";
      kPlayer.setLoop(nextLoop);
      const isAutoplay = Boolean(kPlayer.data?.get("autoplay") || kPlayer.autoplay);
      await interaction.update({
        components: buildNowPlayingComponents(isAutoplay, kPlayer.paused, nextLoop),
      }).catch(() => {});
      return interaction.followUp({
        content: `🔁 **Loop mode set to:** \`${nextLoop.toUpperCase()}\``,
        ephemeral: true,
      }).catch(() => {});
    }
    if (nPlayer) {
      nPlayer.loop = nPlayer.loop === "none" ? "track" : nPlayer.loop === "track" ? "queue" : "none";
      if (nPlayer.currentTrack) {
        await nPlayer.sendNowPlayingPanel(nPlayer.currentTrack, true).catch(() => {});
      }
      return interaction.reply({
        content: `🔁 **Loop mode set to:** \`${nPlayer.loop.toUpperCase()}\``,
        ephemeral: true,
      });
    }
  }

  // 5. VOLUME CONTROLS
  if (customId === "dj_vol_down") {
    if (kPlayer) {
      const newVol = Math.max((kPlayer.volume || 100) - 10, 10);
      kPlayer.setVolume(newVol);
      return interaction.reply({ content: `🔉 **Volume reduced to ${newVol}%**`, ephemeral: true });
    }
    if (nPlayer) {
      const newVol = Math.max(nPlayer.volume - 10, 10);
      nPlayer.setVolume(newVol);
      if (nPlayer.currentTrack) await nPlayer.sendNowPlayingPanel(nPlayer.currentTrack, true).catch(() => {});
      return interaction.reply({ content: `🔉 **Volume reduced to ${newVol}%**`, ephemeral: true });
    }
  }

  if (customId === "dj_vol_up") {
    if (kPlayer) {
      const newVol = Math.min((kPlayer.volume || 100) + 10, 150);
      kPlayer.setVolume(newVol);
      return interaction.reply({ content: `🔊 **Volume increased to ${newVol}%**`, ephemeral: true });
    }
    if (nPlayer) {
      const newVol = Math.min(nPlayer.volume + 10, 150);
      nPlayer.setVolume(newVol);
      if (nPlayer.currentTrack) await nPlayer.sendNowPlayingPanel(nPlayer.currentTrack, true).catch(() => {});
      return interaction.reply({ content: `🔊 **Volume increased to ${newVol}%**`, ephemeral: true });
    }
  }

  // 6. SHUFFLE
  if (customId === "music_shuffle" || customId === "dj_shuffle") {
    if (kPlayer) {
      if (!kPlayer.queue || kPlayer.queue.length === 0) {
        return interaction.reply({ content: "⚠️ Not enough songs in the queue to shuffle.", ephemeral: true });
      }
      kPlayer.queue.shuffle();
      return interaction.reply({ content: `🔀 **Shuffled ${kPlayer.queue.length} songs in the queue!**`, ephemeral: true });
    }
    if (nPlayer) {
      nPlayer.shuffle();
      return interaction.reply({ content: `🔀 **Shuffled ${nPlayer.queue.length} songs in the queue!**`, ephemeral: true });
    }
  }

  // 7. QUEUE VIEW
  if (customId === "music_queue") {
    if (kPlayer) {
      const current = kPlayer.queue.current;
      const tracks = kPlayer.queue.slice(0, 10);
      const queueList =
        tracks.length > 0
          ? tracks.map((t, idx) => `\`${idx + 1}.\` [${t.title}](${t.uri}) - \`${formatTime(t.length)}\``).join("\n")
          : "*No upcoming songs.*";

      const embed = new EmbedBuilder()
        .setColor(config.theme.primary || 0x5865f2)
        .setTitle(`📜 Queue for ${interaction.guild.name}`)
        .setDescription(
          `**Now Playing:**\n[${current ? current.title : "None"}](${current ? current.uri : ""}) - \`${formatTime(current ? current.length : 0)}\`\n\n` +
            `**Up Next (${kPlayer.queue.length} songs):**\n${queueList}`
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
    }
    if (nPlayer) {
      const current = nPlayer.currentTrack;
      const tracks = nPlayer.queue.slice(0, 10);
      const queueList =
        tracks.length > 0
          ? tracks.map((t, idx) => `\`${idx + 1}.\` [${t.title}](${t.url}) - \`${formatTime(t.duration)}\``).join("\n")
          : "*No upcoming songs.*";

      const embed = new EmbedBuilder()
        .setColor(config.theme.primary || 0x5865f2)
        .setTitle(`📜 Queue for ${interaction.guild.name}`)
        .setDescription(
          `**Now Playing:**\n[${current ? current.title : "None"}](${current ? current.url : ""}) - \`${formatTime(current ? current.duration : 0)}\`\n\n` +
            `**Up Next (${nPlayer.queue.length} songs):**\n${queueList}`
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
    }
  }

  // 8. AUTOPLAY TOGGLE
  if (customId === "music_autoplay") {
    if (kPlayer) {
      const cur = Boolean(kPlayer.data.get("autoplay") || kPlayer.autoplay);
      const nextState = !cur;
      kPlayer.data.set("autoplay", nextState);
      kPlayer.autoplay = nextState;

      if (nextState) {
        triggerAutoplayBuffer(kPlayer, kPlayer.queue.length === 0 && !kPlayer.playing).catch(() => {});
      }

      const loopMode = kPlayer.loop || "none";
      await interaction.update({
        components: buildNowPlayingComponents(nextState, kPlayer.paused, loopMode),
      }).catch(() => {});

      return interaction.followUp({
        content: `📻 **Autoplay recommendation mode:** \`${nextState ? "ENABLED" : "DISABLED"}\``,
        ephemeral: true,
      }).catch(() => {});
    }
    if (nPlayer) {
      nPlayer.autoplay = !nPlayer.autoplay;
      if (nPlayer.currentTrack) {
        await nPlayer.sendNowPlayingPanel(nPlayer.currentTrack, true).catch(() => {});
      }
      return interaction.reply({
        content: `📻 **Autoplay recommendation mode:** \`${nPlayer.autoplay ? "ENABLED" : "DISABLED"}\``,
        ephemeral: true,
      });
    }
  }

  // 9. DSP FILTER SELECT MENU
  if (customId === "music_filter" && interaction.isStringSelectMenu()) {
    const filterChoice = interaction.values[0];
    if (kPlayer) {
      kPlayer.data.set("activeFilter", filterChoice);
      await applyKazagumoFilter(kPlayer, filterChoice);
    }
    if (nPlayer) {
      await nPlayer.setFilter(filterChoice);
    }
    return interaction.reply({
      content: `🎛️ **Applied Audio DSP Filter:** \`${filterChoice.toUpperCase()}\``,
      ephemeral: true,
    }).catch(() => {});
  }
}

module.exports = {
  Nodes,
  formatTime,
  createMusicManager,
  applyKazagumoFilter,
  buildNowPlayingComponents,
  scoreTrack,
  triggerAutoplayBuffer,
  handleMusicInteraction,
};
