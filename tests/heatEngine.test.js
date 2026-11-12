'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreHeat } = require('../src/utils/heatEngine');

test('heat accumulates weighted signals and triggers at threshold', () => {
  const result = scoreHeat({ heat: 40, at: 1000 }, [{ type: 'repeated' }], 2000);
  assert.equal(result.heat, 73);
  assert.equal(result.triggered, false);
  const triggered = scoreHeat({ heat: 80, at: 2000 }, [{ type: 'repeated' }], 2000);
  assert.equal(triggered.triggered, true);
});

test('heat decays over time and never becomes negative', () => {
  const result = scoreHeat({ heat: 20, at: 1000 }, [], 11000, { decayPerSecond: 3 });
  assert.equal(result.heat, 0);
  assert.equal(result.triggered, false);
});

test('webhook signals receive the configured multiplier', () => {
  const result = scoreHeat(null, [{ type: 'repeated' }, { type: 'webhook' }], 1000);
  assert.equal(result.addedHeat, 54.75);
});

test('custom thresholds and weights are respected', () => {
  const result = scoreHeat(null, [{ type: 'repeated' }], 1000, {
    threshold: 30,
    weights: { repeated: 40 }
  });
  assert.equal(result.heat, 40);
  assert.equal(result.triggered, true);
});
