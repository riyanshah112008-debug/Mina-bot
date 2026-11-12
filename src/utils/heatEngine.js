'use strict';

const DEFAULT_WEIGHTS = Object.freeze({
  repeated: 35,
  flood: 30,
  mentions: 35,
  attachments: 12,
  invite: 100,
  suspiciousLink: 100,
  blockedWord: 100,
  webhook: 1.5
});

function scoreHeat(previous, signals, now, config = {}) {
  const threshold = Number.isFinite(config.threshold) ? Math.max(1, config.threshold) : 100;
  const decay = Number.isFinite(config.decayPerSecond) ? Math.max(0, config.decayPerSecond) : 2;
  const weights = { ...DEFAULT_WEIGHTS, ...(config.weights || {}) };
  const elapsedSeconds = previous?.at ? Math.max(0, (now - previous.at) / 1000) : 0;
  const cooled = Math.max(0, Number(previous?.heat || 0) - elapsedSeconds * decay);
  const additions = signals.map(signal => ({
    type: signal.type,
    amount: Math.max(0, Number(signal.amount ?? weights[signal.type] ?? 0))
  }));
  const multiplier = signals.some(signal => signal.type === 'webhook') ? weights.webhook : 1;
  const added = additions.reduce((sum, signal) => sum + signal.amount, 0) * multiplier;
  const heat = Math.min(threshold * 2, cooled + added);
  return {
    heat,
    previousHeat: cooled,
    addedHeat: added,
    threshold,
    triggered: heat >= threshold,
    signals: additions.map(signal => signal.type)
  };
}

module.exports = { DEFAULT_WEIGHTS, scoreHeat };
