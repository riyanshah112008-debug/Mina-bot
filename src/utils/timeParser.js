/**
 * Parses a duration string (e.g. "10m", "1h", "2d", "30s") into milliseconds.
 * Returns null if invalid or exceeds max duration.
 */
function parseDuration(input) {
  if (!input) return null;
  const match = String(input).trim().match(/^(\d+)\s*(s|m|h|d|w)?$/i);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = (match[2] || "m").toLowerCase();

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "w":
      return value * 7 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

/**
 * Formats milliseconds into a human-readable duration string.
 */
function formatDuration(ms) {
  if (!ms || ms < 1000) return "0s";
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);

  return parts.join(" ") || "0s";
}

module.exports = { parseDuration, formatDuration };
