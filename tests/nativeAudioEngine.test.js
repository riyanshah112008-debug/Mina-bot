'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const audio = require('../src/utils/nativeAudioEngine');
const Player = audio.NovaBotGuildPlayer || audio.StarryGuildPlayer;
const getExternalCatalogSearchUrls = audio.getExternalCatalogSearchUrls;
const resolver = require('../src/utils/streamResolverClient');
test.after(() => { try { resolver.process?.kill(); } catch (_) {} });

test('one failed audio track advances the queue only once', () => {
    const player = new Player(null, 'test-guild', null, null);
    player.currentTrack = { title: 'Test track' };
    let advances = 0;
    player.handleTrackEnd = () => { advances += 1; };

    assert.equal(player.finishTrackOnce(), true);
    assert.equal(player.finishTrackOnce(), false);
    assert.equal(advances, 1);
    player.destroy();
});

test('track end guard ignores seeking and destroyed players', () => {
    const player = new Player(null, 'test-guild-2', null, null);
    player.currentTrack = { title: 'Test track' };
    let advances = 0;
    player.handleTrackEnd = () => { advances += 1; };

    player._isSeeking = true;
    assert.equal(player.finishTrackOnce(), false);
    player._isSeeking = false;
    player.destroyed = true;
    assert.equal(player.finishTrackOnce(), false);
    assert.equal(advances, 0);
});

test('Deezer and Apple Music catalogue fallbacks build encoded search URLs', () => {
    const urls = getExternalCatalogSearchUrls('A & B');
    assert.equal(urls.deezer, 'https://api.deezer.com/search?q=A%20%26%20B&limit=8');
    assert.equal(urls.appleMusic, 'https://itunes.apple.com/search?term=A%20%26%20B&entity=song&limit=8');
});
