// Boot entry point for Render and Node.js
require('dotenv').config();

try {
  require('./index');
} catch (err) {
  console.error('[boot] Failed to start Starry engine:', err);
}
