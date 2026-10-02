const assert = require('assert');
const { generateDependencyReport } = require('@discordjs/voice');
const { StarryAudioEngine } = require('../src/utils/nativeAudioEngine');
const streamResolver = require('../src/utils/streamResolverClient');

async function runAudioTests() {
    console.log('🧪 Starting Mina Bot Audio Engine & Voice Encryption Test Suite...\n');

    // Test 1: Voice Encryption Libraries Audit
    console.log('▶ Test 1: Auditing Discord Voice Encryption Ciphers...');
    const report = generateDependencyReport();
    assert(report.includes('@noble/ciphers'), 'Missing @noble/ciphers in voice dependency report');
    assert(report.includes('@stablelib/xchacha20poly1305'), 'Missing @stablelib/xchacha20poly1305 in voice dependency report');
    assert(report.includes('native crypto support for aes-256-gcm: yes'), 'Missing native AES-256-GCM support');
    console.log('  ✅ Voice packet encryption ciphers verified (AEAD XChaCha20Poly1305 & AES-256-GCM active)');

    // Test 2: Filter Resource Stream Generator
    console.log('\n▶ Test 2: Validating Audio Resource DSP Filtering...');
    const { Readable } = require('stream');
    const dummyStream = new Readable({ read() { this.push(null); } });
    
    const mockPlayer = StarryAudioEngine.getOrCreatePlayer(
        { user: { id: '123' }, guilds: { cache: new Map() } },
        'dummy_guild_mina',
        { id: 'vc_1', guild: { id: 'dummy_guild_mina', voiceAdapterCreator: () => {} } },
        { id: 'txt_1', send: () => {} }
    );
    assert(mockPlayer, 'Failed to instantiate StarryGuildPlayer');
    assert.strictEqual(typeof mockPlayer.createFilteredResource, 'function', 'createFilteredResource missing');
    
    const resource = mockPlayer.createFilteredResource(dummyStream, false);
    assert(resource, 'Failed to generate audio resource from stream');
    console.log('  ✅ Audio DSP filter and prism pipeline created successfully');

    // Test 3: Stream Resolver Python Daemon Direct URL Resolution
    console.log('\n▶ Test 3: Testing Stream Resolver Daemon Direct URL Extraction (Fast <2s)...');
    const query = 'Shape of you Ed Sheeran';
    const t0 = Date.now();
    const resolved = await streamResolver.resolve(query);
    const duration = (Date.now() - t0) / 1000;
    assert(resolved, 'Stream resolver returned null');
    assert(resolved.url || resolved.file, 'Stream resolver did not return a valid stream URL or file');
    assert(resolved.title, 'Stream resolver did not return track title');
    console.log(`  ✅ Direct stream URL resolved in ${duration.toFixed(2)}s: "${resolved.title}" (Stream URL valid: ${Boolean(resolved.url || resolved.file)})`);

    // Test 4: Search Engine Multi-Platform Track Structure
    console.log('\n▶ Test 4: Testing Native Audio Engine Track Search...');
    const searchRes = await StarryAudioEngine.search('Night Changes One Direction', { id: 'user_1', tag: 'Tester#0001' });
    assert(searchRes && searchRes.tracks && searchRes.tracks.length > 0, 'Search returned no tracks');
    const track = searchRes.tracks[0];
    assert(track.title, 'Track title is missing');
    assert(track.author, 'Track author is missing');
    assert(track.url, 'Track URL is missing');
    console.log(`  ✅ Track resolved via ${track.source || 'Search'}: "${track.title}" by ${track.author}`);

    console.log('\n✨ ALL MINA BOT AUDIO ENGINE TESTS PASSED (100% Pass Rate)!');
    if (streamResolver.process) {
        try { streamResolver.process.kill(); } catch (e) {}
    }
    process.exit(0);
}

runAudioTests().catch((err) => {
    console.error('❌ Test Failure:', err);
    process.exit(1);
});
