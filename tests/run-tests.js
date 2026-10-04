const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("=========================================");
console.log("🌸 Running Mina Bot Comprehensive Test Suite");
console.log("=========================================\n");

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

async function asyncIt(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

async function runAll() {
  // Test 1: Config
  console.log("📁 1. Configuration & Constants");
  it("Config loads and provides theme and defaults", () => {
    const config = require("../src/config");
    assert.ok(config.prefix, "Default prefix should exist");
    assert.ok(config.theme.primary, "Primary theme color should exist");
    assert.strictEqual(typeof config.validate, "function", "validate should be a function");
    assert.strictEqual(config.isOwner("1465049039153135639"), true, "Owner 1 must be authorized");
    assert.strictEqual(config.isOwner("1233116813831962737"), true, "Owner 2 must be authorized");
    assert.strictEqual(config.isOwner("999999999999999999"), false, "Non-owner must be rejected");

    // Token sanitization tests
    const sanitize = config.sanitizeToken;
    const sampleToken = "DUMMY_TOKEN_ID_26_CHARS_AAA.XYZ123.synthetic_hmac_sample_token_38_chars_long";
    assert.strictEqual(sanitize('  "TOKEN_123" \r\n'), "TOKEN_123", "Must strip quotes, spaces, and CRLF");
    assert.strictEqual(sanitize("'TOKEN_ABC'\n"), "TOKEN_ABC", "Must strip single quotes and newline");
    assert.strictEqual(sanitize("Bot TOKEN_XYZ"), "TOKEN_XYZ", "Must strip accidental Bot prefix");
    assert.strictEqual(sanitize("  'Bot " + sampleToken + "' \n"), sampleToken, "Must strip nested quotes and Bot prefix");
    assert.strictEqual(sanitize("DUMMY_TOKEN_ID_26_CHARS_AAA. XYZ123. synthetic_hmac_sample_token_38_chars_long"), sampleToken, "Must remove internal whitespace/spaces");
    assert.strictEqual(sanitize("DUMMY_TOKEN_ID_26_CHARS_AAA\u200B.XYZ123.\uFEFFsynthetic_hmac_sample_token_38_chars_long"), sampleToken, "Must strip zero-width characters");
    assert.strictEqual(sanitize(null), "", "Null token returns empty string");
    assert.strictEqual(sanitize(""), "", "Empty token returns empty string");
  });

  // Test 2: Time Parser Utility
  console.log("\n📁 2. Time Parser Utility");
  it("Parses valid duration strings correctly", () => {
    const { parseDuration, formatDuration } = require("../src/utils/timeParser");
    assert.strictEqual(parseDuration("30s"), 30000);
    assert.strictEqual(parseDuration("10m"), 600000);
    assert.strictEqual(parseDuration("2h"), 7200000);
    assert.strictEqual(parseDuration("1d"), 86400000);
    assert.strictEqual(parseDuration("invalid"), null);

    assert.strictEqual(formatDuration(60000), "1m");
    assert.strictEqual(formatDuration(3661000), "1h 1m 1s");
  });

  // Test 3: Database Engine
  console.log("\n📁 3. Unified Database Storage");
  it("Initializes database and handles guild settings", () => {
    const db = require("../src/utils/database");
    assert.strictEqual(db.initializeDatabase(), true);

    const testGuildId = "test_guild_" + Date.now();
    const initial = db.getGuildSettings(testGuildId);
    assert.strictEqual(initial.guildId, testGuildId);
    assert.strictEqual(initial.prefix, "?");

    const updated = db.updateGuildSettings(testGuildId, { prefix: "!" });
    assert.strictEqual(updated.prefix, "!");
  });

  it("Handles warning lifecycle (add, get, delete, clear)", () => {
    const db = require("../src/utils/database");
    const guildId = "test_warn_guild";
    const userId = "test_user_456";
    const modId = "test_mod_789";

    const w1 = db.addWarning(guildId, userId, modId, "Spamming in text chat");
    assert.ok(w1.id, "Warning should have an ID");
    assert.strictEqual(w1.reason, "Spamming in text chat");

    const w2 = db.addWarning(guildId, userId, modId, "Inappropriate language");
    const list = db.getWarnings(guildId, userId);
    assert.strictEqual(list.length, 2);

    const deleted = db.deleteWarning(w1.id);
    assert.strictEqual(deleted, true);
    assert.strictEqual(db.getWarnings(guildId, userId).length, 1);

    const clearedCount = db.clearWarnings(guildId, userId);
    assert.strictEqual(clearedCount, 1);
    assert.strictEqual(db.getWarnings(guildId, userId).length, 0);
  });

  it("Handles ticket records and configurations", () => {
    const db = require("../src/utils/database");
    const guildId = "ticket_test_guild";
    const channelId = "ticket_chan_999";

    db.setTicketConfig(guildId, {
      panelChannelId: "panel_1",
      supportRoles: ["role_support"],
    });
    const cfg = db.getTicketConfig(guildId);
    assert.strictEqual(cfg.panelChannelId, "panel_1");
    assert.deepStrictEqual(cfg.supportRoles, ["role_support"]);

    const record = db.createTicketRecord(channelId, {
      guildId,
      userId: "user_buyer",
      username: "buyer",
      category: "General Support",
      ticketNumber: "0001",
    });
    assert.strictEqual(record.status, "open");
    assert.strictEqual(record.ticketNumber, "0001");

    db.updateTicketRecord(channelId, { status: "claimed", claimedBy: "mod_agent" });
    const fetched = db.getTicketRecord(channelId);
    assert.strictEqual(fetched.status, "claimed");
    assert.strictEqual(fetched.claimedBy, "mod_agent");
  });

  it("Handles Normal and Video VC Verification records", () => {
    const db = require("../src/utils/database");
    const guildId = "verif_guild_777";

    // Normal verification config
    db.setVerificationConfig(guildId, {
      verifiedRoleId: "role_verified",
      mode: "captcha",
    });
    const vCfg = db.getVerificationConfig(guildId);
    assert.strictEqual(vCfg.verifiedRoleId, "role_verified");
    assert.strictEqual(vCfg.mode, "captcha");

    // Video verification config
    db.setVideoVerificationConfig(guildId, {
      enabled: true,
      waitingVoiceId: "vc_wait_1",
      verifyVoiceId: "vc_private_1",
      videoVerifiedRoleId: "role_vid_verified",
    });
    const vvCfg = db.getVideoVerificationConfig(guildId);
    assert.strictEqual(vvCfg.enabled, true);
    assert.strictEqual(vvCfg.waitingVoiceId, "vc_wait_1");

    // Video session lifecycle
    const sessionId = "VV-100200";
    const session = db.createVideoVerificationSession(sessionId, {
      guildId,
      userId: "candidate_1",
      username: "cand1",
    });
    assert.strictEqual(session.status, "waiting");

    db.updateVideoVerificationSession(sessionId, {
      status: "approved",
      reviewerId: "reviewer_chief",
      notes: "Clear camera check",
    });
    const updatedSession = db.getVideoVerificationSession(sessionId);
    assert.strictEqual(updatedSession.status, "approved");
    assert.strictEqual(updatedSession.reviewerId, "reviewer_chief");
  });

  it("Handles AFK storage", () => {
    const db = require("../src/utils/database");
    const guildId = "afk_guild";
    const userId = "afk_user";

    db.setUserAfk(guildId, userId, "Studying for exams");
    const afk = db.getUserAfk(guildId, userId);
    assert.strictEqual(afk.reason, "Studying for exams");

    const removed = db.removeUserAfk(guildId, userId);
    assert.strictEqual(removed, true);
    assert.strictEqual(db.getUserAfk(guildId, userId), null);
  });

  // Test 4: Commands Verification
  console.log("\n📁 4. Command Registrations & Integrity");
  it("Loads all 30 commands across Moderation, Utility, Tickets, & Verification", () => {
    const { loadCommands } = require("../src/handlers/commandLoader");
    const client = require("../src/client");
    const loaded = loadCommands();

    console.log(`     Loaded count: ${loaded.length}`);
    assert.ok(loaded.length >= 25, "Should have loaded all core commands");

    // Verify critical moderation commands exist
    const modCommands = ["ban", "kick", "timeout", "unban", "warn", "warnings", "untimeout", "lock", "unlock", "slowmode", "purge", "nuke", "modlogs", "automod"];
    for (const name of modCommands) {
      const cmd = client.commands.get(name);
      assert.ok(cmd, `Moderation command '${name}' must be loaded`);
      assert.strictEqual(typeof cmd.execute, "function", `'${name}' must export execute`);
      assert.ok(cmd.data, `'${name}' must have SlashCommandBuilder data`);
    }

    // Verify critical utility commands exist
    const utilCommands = ["help", "ping", "serverinfo", "userinfo", "avatar", "banner", "botinfo", "afk", "poll", "announce", "prefix", "leaveserver"];
    for (const name of utilCommands) {
      const cmd = client.commands.get(name);
      assert.ok(cmd, `Utility command '${name}' must be loaded`);
      assert.strictEqual(typeof cmd.execute, "function", `'${name}' must export execute`);
    }

    // Verify music commands exist
    const musicCommands = ["play", "pause", "resume", "skip", "stop", "queue", "nowplaying", "volume", "loop", "autoplay", "djpanel", "summon"];
    for (const name of musicCommands) {
      const cmd = client.commands.get(name);
      assert.ok(cmd, `Music command '${name}' must be loaded`);
      assert.strictEqual(typeof cmd.execute, "function", `'${name}' must export execute`);
    }

    // Verify ticket command exists
    assert.ok(client.commands.get("ticketsetup"), "ticketsetup must be loaded");

    // Verify verification commands exist
    assert.ok(client.commands.get("verifysetup"), "verifysetup must be loaded");
    assert.ok(client.commands.get("videoverifysetup"), "videoverifysetup must be loaded");

    // Verify devpanel command exists
    assert.ok(client.commands.get("devpanel"), "devpanel must be loaded");
  });

  // Test 5: Event Loaders & Handlers
  console.log("\n📁 5. Event Handlers Integrity");
  it("Validates all event definitions", () => {
    const events = [
      require("../src/events/ready"),
      require("../src/events/messageCreate"),
      require("../src/events/interactionCreate"),
      require("../src/events/voiceStateUpdate"),
      require("../src/events/guildMemberAdd"),
      require("../src/events/guildMemberRemove"),
      require("../src/events/messageUpdate"),
    ];

    for (const ev of events) {
      assert.ok(ev.name, "Event must have a name");
      assert.strictEqual(typeof ev.execute, "function", `Event ${ev.name} must export execute`);
    }
  });

  // Test 6: Web Health Endpoint
  console.log("\n📁 6. Web Health Endpoint");
  await asyncIt("Starts and responds to health checks", async () => {
    const web = require("../src/web");
    const server = await web.start(3099);
    assert.ok(server, "Web server should listen successfully");
    server.close();
  });

  // Test 7: Rotating Presence Manager (Starry-Style)
  console.log("\n📁 7. Rotating Presence Manager (Starry-Style)");
  it("Provides dynamic activities and safe rotator methods", () => {
    const statusManager = require("../src/modules/presence/statusManager");
    assert.ok(Array.isArray(statusManager.activities), "Activities should be an array");
    assert.ok(statusManager.activities.length >= 5, "Should have at least 5 rich rotating presets");

    let presenceSet = null;
    const dummyClient = {
      user: {
        setPresence: (p) => {
          presenceSet = p;
        },
      },
      guilds: {
        cache: new Map([
          ["g1", { memberCount: 150 }],
          ["g2", { memberCount: 350 }],
        ]),
      },
      commands: new Map([["cmd1", {}], ["cmd2", {}]]),
      on: () => {},
    };

    statusManager.rotateStatus(dummyClient);
    assert.ok(presenceSet, "rotateStatus should apply presence to client");
    assert.ok(presenceSet.activities && presenceSet.activities.length > 0, "Should contain activity item");

    // Test start and stop
    statusManager.startPresenceRotator(dummyClient, 60000);
    statusManager.stopPresenceRotator();

    // Test custom presence
    statusManager.setCustomPresence(dummyClient, { activities: [{ name: "Custom" }] }, true);
    statusManager.resumePresenceRotator(dummyClient);
  });

  // Test 8: Emergency Server Leave Command
  console.log("\n📁 8. Emergency Server Leave & Dev Security");
  await asyncIt("Rejects non-owners and enforces owner validation", async () => {
    const leaveCmd = require("../src/commands/utility/leaveserver");
    assert.strictEqual(leaveCmd.name, "leaveserver");
    assert.ok(leaveCmd.aliases.includes("botleave"), "Aliases should include botleave");
    assert.ok(leaveCmd.aliases.includes("forceleave"), "Aliases should include forceleave");

    let replyCalled = false;
    let replyMsg = "";
    const fakeContext = {
      isChatInputCommand: () => false,
      author: { id: "not_an_owner_99999" },
      reply: ({ content }) => {
        replyCalled = true;
        replyMsg = content;
      },
    };

    await leaveCmd.execute(fakeContext, ["123456789012345678"], {});
    assert.strictEqual(replyCalled, true);
    assert.ok(replyMsg.includes("Access Denied"), "Non-owner must receive Access Denied");
  });

  // Test 9: Music Manager Engine & Components
  console.log("\n📁 9. Music Engine & Lavalink Cluster Utilities");
  it("Validates formatTime, scoreTrack, and nowPlaying components", () => {
    const { formatTime, scoreTrack, buildNowPlayingComponents } = require("../src/utils/musicManager");
    assert.strictEqual(formatTime(65000), "1:05");
    assert.strictEqual(formatTime(3665000), "1:01:05");

    const officialTrack = { title: "Song (Official Audio)", author: "Artist", length: 180000 };
    const coverTrack = { title: "Song (Cover)", author: "Someone", length: 180000 };
    assert.ok(scoreTrack(officialTrack, "Song") > scoreTrack(coverTrack, "Song"));

    const rows = buildNowPlayingComponents(true, false, "track");
    assert.ok(Array.isArray(rows), "Now playing components must be an array of rows");
    assert.strictEqual(rows.length, 4, "Should build 4 interactive rows");
  });

  // Test 10: Help Menu Persistent Navigation
  console.log("\n📁 10. Help Menu Persistent Select Navigation");
  it("Builds select menu with All Commands Overview option and handles switching", () => {
    const helpCmd = require("../src/commands/utility/help");
    const dummyClient = {
      commands: new Map([
        ["ban", { name: "ban", category: "Moderation" }],
        ["play", { name: "play", category: "Music" }],
        ["help", { name: "help", category: "Utility" }],
      ]),
      user: { displayAvatarURL: () => "https://example.com/avatar.png" },
    };

    const row = helpCmd.buildHelpSelectRow(dummyClient, "cat_overview");
    assert.ok(row, "Row should be generated");
    const selectMenu = row.components[0];
    assert.strictEqual(selectMenu.data.custom_id, "help_category_select");

    // Verify 'All Commands (Overview)' option is present
    const overviewOption = selectMenu.options.find((o) => o.data.value === "cat_overview");
    assert.ok(overviewOption, "Overview option must exist");
    assert.strictEqual(overviewOption.data.default, true, "cat_overview should be marked default");

    // Verify Category embed builder
    const catEmbed = helpCmd.buildCategoryHelp(dummyClient, "music", "?");
    assert.ok(catEmbed, "Category embed should build");
  });

  // Test 11: Bot Server Profile (PFP & Banner Customization)
  console.log("\n📁 11. Bot Server Profile (PFP & Banner Customization)");
  it("Validates image helper, permissions check, and extraction utilities", () => {
    const { extractImageSource, canManageBotProfile } = require("../src/utils/imageHelper");
    const { PermissionFlagsBits } = require("discord.js");

    // 1. Permissions verification
    const mockGuild = { ownerId: "guild_owner_123" };
    const ownerMember = { id: "guild_owner_123", guild: mockGuild, permissions: { has: () => false } };
    const adminMember = { id: "admin_user_456", guild: mockGuild, permissions: { has: (p) => p === PermissionFlagsBits.Administrator } };
    const manageGuildMember = { id: "mod_user_789", guild: mockGuild, permissions: { has: (p) => p === PermissionFlagsBits.ManageGuild } };
    const regularMember = { id: "reg_user_000", guild: mockGuild, permissions: { has: () => false } };

    assert.strictEqual(canManageBotProfile(ownerMember), true, "Guild owner must have permission");
    assert.strictEqual(canManageBotProfile(adminMember), true, "Admin member must have permission");
    assert.strictEqual(canManageBotProfile(manageGuildMember), true, "Member with ManageGuild must have permission");
    assert.strictEqual(canManageBotProfile(regularMember), false, "Regular member must NOT have permission");

    // 2. Slash command source extraction
    const mockSlashReset = {
      isChatInputCommand: () => true,
      options: {
        getBoolean: (name) => (name === "reset" ? true : null),
        getAttachment: () => null,
        getString: () => null,
      },
    };
    assert.deepStrictEqual(extractImageSource(mockSlashReset, []), { isReset: true });

    const mockSlashAttachment = {
      isChatInputCommand: () => true,
      options: {
        getBoolean: () => null,
        getAttachment: (name) => (name === "image" ? { url: "https://cdn.discordapp.com/avatar.png" } : null),
        getString: () => null,
      },
    };
    assert.deepStrictEqual(extractImageSource(mockSlashAttachment, []), {
      url: "https://cdn.discordapp.com/avatar.png",
      isAttachment: true,
      isReset: false,
    });

    // 3. Prefix message source extraction
    const mockPrefixReset = { isChatInputCommand: () => false, attachments: new Map() };
    assert.deepStrictEqual(extractImageSource(mockPrefixReset, ["reset"]), { isReset: true });
    assert.deepStrictEqual(extractImageSource(mockPrefixReset, ["CLEAR"]), { isReset: true });

    const mockPrefixUrl = { isChatInputCommand: () => false, attachments: new Map() };
    assert.deepStrictEqual(extractImageSource(mockPrefixUrl, ["https://example.com/pfp.jpg"]), {
      url: "https://example.com/pfp.jpg",
      isAttachment: false,
      isReset: false,
    });

    assert.strictEqual(extractImageSource(mockPrefixUrl, []), null, "Empty args and attachments must return null");
  });

  it("Loads and validates botavatar, botbanner, and botprofile commands", () => {
    const botavatar = require("../src/commands/utility/botavatar");
    const botbanner = require("../src/commands/utility/botbanner");
    const botprofile = require("../src/commands/utility/botprofile");

    // Check botavatar
    assert.strictEqual(botavatar.name, "botavatar");
    assert.strictEqual(typeof botavatar.execute, "function");
    assert.ok(botavatar.aliases.includes("botpfp"));
    assert.ok(botavatar.data, "Must have SlashCommandBuilder");

    // Check botbanner
    assert.strictEqual(botbanner.name, "botbanner");
    assert.strictEqual(typeof botbanner.execute, "function");
    assert.ok(botbanner.aliases.includes("setbotbanner"));
    assert.ok(botbanner.data, "Must have SlashCommandBuilder");

    // Check botprofile
    assert.strictEqual(botprofile.name, "botprofile");
    assert.strictEqual(typeof botprofile.execute, "function");
    assert.strictEqual(typeof botprofile.handleBotProfileInteraction, "function");
    assert.ok(botprofile.data, "Must have SlashCommandBuilder with subcommands");

    // Check database persistence of botAvatar and botBanner
    const db = require("../src/utils/database");
    const testGuildId = "guild_profile_test_101";
    db.updateGuildSettings(testGuildId, {
      botAvatar: "https://images.unsplash.com/test-avatar.png",
      botBanner: "https://images.unsplash.com/test-banner.png",
    });

    const settings = db.getGuildSettings(testGuildId);
    assert.strictEqual(settings.botAvatar, "https://images.unsplash.com/test-avatar.png");
    assert.strictEqual(settings.botBanner, "https://images.unsplash.com/test-banner.png");
  });

  // Test 12: Snipe & EditSnipe System
  console.log("\n📁 12. Snipe & EditSnipe Engine");
  it("Records and retrieves deleted and edited messages", () => {
    const snipeManager = require("../src/utils/snipeManager");
    const testChannel = "chan_snipe_999";

    // Test Delete Snipe
    snipeManager.recordDelete({
      channel: { id: testChannel },
      author: { tag: "Tester#0001", id: "user_test_1" },
      content: "Secret deleted message",
      attachments: new Map(),
      createdTimestamp: Date.now() - 5000,
    });

    const deleted = snipeManager.getDelete(testChannel);
    assert.ok(deleted, "Must retrieve deleted snipe");
    assert.strictEqual(deleted.content, "Secret deleted message");
    assert.strictEqual(deleted.author.tag, "Tester#0001");

    // Test Edit Snipe
    snipeManager.recordEdit(
      {
        channel: { id: testChannel },
        author: { tag: "Tester#0001", id: "user_test_1" },
        content: "Before edit text",
        createdTimestamp: Date.now() - 10000,
      },
      {
        channel: { id: testChannel },
        author: { tag: "Tester#0001", id: "user_test_1" },
        content: "After edit text",
        editedTimestamp: Date.now(),
      }
    );

    const edited = snipeManager.getEdit(testChannel);
    assert.ok(edited, "Must retrieve edited snipe");
    assert.strictEqual(edited.oldContent, "Before edit text");
    assert.strictEqual(edited.newContent, "After edit text");
  });

  // Test 13: Welcome, Goodbye & Autoroles
  console.log("\n📁 13. Welcome, Goodbye & Autorole Configuration");
  it("Persists and updates welcome, goodbye, and autorole settings", () => {
    const db = require("../src/utils/database");
    const testGuild = "guild_welcome_test_1";

    // Welcome
    db.setWelcomeConfig(testGuild, {
      enabled: true,
      channelId: "welcome_chan_1",
      message: "Hello {user} to {server}!",
    });
    const welcome = db.getWelcomeConfig(testGuild);
    assert.strictEqual(welcome.enabled, true);
    assert.strictEqual(welcome.channelId, "welcome_chan_1");

    // Goodbye
    db.setGoodbyeConfig(testGuild, {
      enabled: true,
      channelId: "bye_chan_1",
      message: "Farewell {user}!",
    });
    const goodbye = db.getGoodbyeConfig(testGuild);
    assert.strictEqual(goodbye.enabled, true);
    assert.strictEqual(goodbye.channelId, "bye_chan_1");

    // Autorole
    db.setAutoroleConfig(testGuild, {
      enabled: true,
      memberRoles: ["role_member_1"],
      botRoles: ["role_bot_1"],
    });
    const autorole = db.getAutoroleConfig(testGuild);
    assert.strictEqual(autorole.enabled, true);
    assert.deepStrictEqual(autorole.memberRoles, ["role_member_1"]);
    assert.deepStrictEqual(autorole.botRoles, ["role_bot_1"]);
  });

  // Test 14: Social Actions & Stats
  console.log("\n📁 14. Social Actions & Shared Stats");
  it("Tracks interaction counters between user pairs", () => {
    const db = require("../src/utils/database");
    const count1 = db.incrementSocialStat("userA", "userB", "hug");
    const count2 = db.incrementSocialStat("userB", "userA", "hug");
    assert.strictEqual(count2, count1 + 1, "User pair counter must increment symmetrically");

    const stats = db.getSocialStats("userA", "userB");
    assert.strictEqual(stats.hug, count2);
  });

  // Test 15: Mini-Games & Utility Commands Load Check
  console.log("\n📁 15. Mini-Games & Utility Commands Integrity");
  it("Loads and validates all interactive games and utility tools", () => {
    const games = ["8ball", "coinflip", "dice", "rps", "slots", "calculator", "say", "embed", "remind"];
    for (const name of games) {
      const cmd = require(`../src/commands/utility/${name}`);
      assert.strictEqual(cmd.name, name, `${name} must have valid name`);
      assert.strictEqual(typeof cmd.execute, "function", `${name} must have execute function`);
      assert.ok(cmd.data, `${name} must have slash command builder`);
      assert.ok(Array.isArray(cmd.aliases), `${name} must have aliases array`);
    }
  });

  // Test 16: Sticky Message System
  console.log("\n📁 16. Sticky Messages System");
  it("Stores, retrieves, and deletes sticky message definitions", () => {
    const db = require("../src/utils/database");
    const testChannel = "chan_sticky_test_1";

    db.setStickyMessage(testChannel, {
      content: "Rule #1: Be respectful.",
      enabled: true,
      lastMessageId: "msg_sticky_1",
    });

    const sticky = db.getStickyMessage(testChannel);
    assert.ok(sticky);
    assert.strictEqual(sticky.content, "Rule #1: Be respectful.");

    db.deleteStickyMessage(testChannel);
    assert.strictEqual(db.getStickyMessage(testChannel), null);
  });

  // Test 17: Giveaways Engine
  console.log("\n📁 17. Giveaways Engine");
  it("Builds giveaway embeds and manages participant entries", () => {
    const db = require("../src/utils/database");
    const {
      buildGiveawayEmbed,
      buildGiveawayComponents,
    } = require("../src/modules/giveaways/giveawayManager");

    const gData = {
      messageId: "giveaway_msg_100",
      guildId: "guild_g_1",
      channelId: "chan_g_1",
      hostId: "user_host_1",
      prize: "Discord Nitro 1 Month",
      winnerCount: 1,
      endTime: Date.now() + 60000,
      status: "active",
      entries: ["user_ent_1", "user_ent_2"],
      winners: [],
    };

    db.setGiveaway("giveaway_msg_100", gData);
    const retrieved = db.getGiveaway("giveaway_msg_100");
    assert.strictEqual(retrieved.prize, "Discord Nitro 1 Month");
    assert.strictEqual(retrieved.entries.length, 2);

    const embed = buildGiveawayEmbed(gData);
    assert.ok(embed.data.title.includes("Discord Nitro 1 Month"));

    const components = buildGiveawayComponents("giveaway_msg_100", false, 2);
    assert.strictEqual(components.length, 1);
    assert.strictEqual(components[0].components[0].data.label, "Enter (2)");
  });

  // Test 18: Music Request Desk
  console.log("\n📁 18. Music Request Desk & Setup");
  it("Validates music request configuration and embed construction", () => {
    const db = require("../src/utils/database");
    const { buildMusicDeskEmbed } = require("../src/modules/music/musicRequestManager");
    const musicsetup = require("../src/commands/music/musicsetup");

    assert.strictEqual(musicsetup.name, "musicsetup");
    assert.ok(musicsetup.aliases.includes("setup"));

    const testGuildId = "guild_music_desk_1";
    db.setMusicRequestChannel(testGuildId, {
      channelId: "chan_music_req_1",
      messageId: "msg_music_desk_1",
    });

    const conf = db.getMusicRequestChannel(testGuildId);
    assert.strictEqual(conf.channelId, "chan_music_req_1");

    const mockGuild = { id: testGuildId, name: "Music Guild" };
    const embed = buildMusicDeskEmbed(mockGuild, { manager: null });
    assert.ok(embed.data.title.includes("Mina Hi-Fi Music Desk"));
  });

  // Test 19: Counting & Server Listings Storage Engine
  console.log("\n📁 19. Resilient Counting & Server Listings Engine");
  it("Persists and updates counting game and server listing configs", () => {
    const db = require("../src/utils/database");
    const testGuild = "guild_count_test_1";

    // Counting config
    db.setCountingConfig(testGuild, {
      channelId: "chan_count_1",
      currentNumber: 42,
      highScore: 100,
      lastUser: "user_counter_1"
    });
    const countCfg = db.getCountingConfig(testGuild);
    assert.ok(countCfg);
    assert.strictEqual(countCfg.currentNumber, 42);
    assert.strictEqual(countCfg.highScore, 100);

    const allCounts = db.getAllCountingConfigs();
    assert.ok(allCounts[testGuild]);

    // Server listings
    db.setServerListing(testGuild, {
      guildId: testGuild,
      name: "Starryboard Test Server",
      memberCount: 50,
      isListed: true
    });
    const listing = db.getServerListing(testGuild);
    assert.ok(listing);
    assert.strictEqual(listing.name, "Starryboard Test Server");

    const allListings = db.getAllServerListings();
    assert.ok(Array.isArray(allListings));
    assert.ok(allListings.some(l => l.guildId === testGuild));
  });

  // Test 20: Token & MongoDB URI Sanitizers
  console.log("\n📁 20. Token & MongoDB URI Sanitizers");
  it("Sanitizes mobile keyboard whitespace, quotes, and variable labels", () => {
    const { cleanToken, cleanMongoUri, maskMongoUri } = require("../src/utils/tokenSanitizer");

    // Test mobile copy-paste with spaces
    const mobileToken = ['samplePartOne123456789012', 'partTwo', 'samplePartThreeHMACSignatureString12345'].join('. ');
    const cleanedToken = cleanToken(mobileToken);
    assert.strictEqual(cleanedToken.includes(" "), false);

    // Test MongoDB URI with mobile quotes and prefix
    const rawMongo = ' MONGO_URI="mongodb+srv://mockUser:dummyPass123@mockcluster.net/my_db" \r\n';
    const cleanedMongo = cleanMongoUri(rawMongo);
    assert.strictEqual(cleanedMongo.startsWith("mongodb+srv://"), true);
    assert.strictEqual(cleanedMongo.includes('"'), false);
    assert.strictEqual(cleanedMongo.includes(" "), false);

    // Test mask
    const masked = maskMongoUri(cleanedMongo);
    assert.strictEqual(masked.includes("dummyPass123"), false);
    assert.strictEqual(masked.includes("****"), true);
  });

  // Test Summary
  console.log("\n=========================================");
  console.log(`🌸 Test Suite Finished: ${passed} Passed, ${failed} Failed`);
  console.log("=========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runAll().catch((err) => {
  console.error("Unhandled test runner error:", err);
  process.exit(1);
});
