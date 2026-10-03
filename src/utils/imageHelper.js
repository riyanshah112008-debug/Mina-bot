const { PermissionFlagsBits } = require("discord.js");
const config = require("../config");

/**
 * Supported image MIME types for Discord avatars & banners
 */
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

/**
 * Maximum image size allowed by Discord (10 MB)
 */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/**
 * Download and validate an image from an HTTP/HTTPS URL
 * @param {string} url - Direct image URL
 * @param {number} maxBytes - Max allowed byte size (default: 10MB)
 * @returns {Promise<{ ok: boolean, buffer?: Buffer, contentType?: string, size?: number, error?: string }>}
 */
async function downloadAndValidateImage(url, maxBytes = MAX_IMAGE_SIZE) {
  if (!url || typeof url !== "string") {
    return { ok: false, error: "Invalid URL provided." };
  }

  const cleanUrl = url.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    return { ok: false, error: "Image URL must begin with http:// or https://" };
  }

  try {
    const res = await fetch(cleanUrl, {
      headers: {
        "User-Agent": "MinaBot/2.0 (DiscordBot; +https://github.com/riyanshah112008-debug/Mina-bot)",
        Accept: "image/png,image/jpeg,image/webp,image/gif,image/*;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return {
        ok: false,
        error: `Could not fetch image from the provided link (HTTP ${res.status}). Ensure the link is publicly accessible.`,
      };
    }

    const contentType = (res.headers.get("content-type") || "").toLowerCase().split(";")[0].trim();
    if (!ALLOWED_MIME_TYPES.has(contentType) && !contentType.startsWith("image/")) {
      return {
        ok: false,
        error: `The provided link is not an image (Content-Type: \`${contentType || "unknown"}\`). Supported formats: **PNG**, **JPG/JPEG**, **WEBP**, **GIF**.`,
      };
    }

    const contentLength = Number(res.headers.get("content-length") || 0);
    if (contentLength > maxBytes) {
      return {
        ok: false,
        error: `The image is too large (${(contentLength / 1024 / 1024).toFixed(1)} MB). Discord limits avatars & banners to 10 MB.`,
      };
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return { ok: false, error: "The downloaded image file is empty (0 bytes)." };
    }

    if (buffer.length > maxBytes) {
      return {
        ok: false,
        error: `The image is too large (${(buffer.length / 1024 / 1024).toFixed(1)} MB). Discord limits avatars & banners to 10 MB.`,
      };
    }

    return {
      ok: true,
      buffer,
      contentType: contentType || "image/png",
      size: buffer.length,
    };
  } catch (err) {
    if (err.name === "TimeoutError") {
      return { ok: false, error: "Connection timed out while downloading the image. Please use a faster or direct link." };
    }
    return { ok: false, error: `Failed to download image: ${err.message}` };
  }
}

/**
 * Extract image source or reset intention from command context (Slash or Prefix)
 * @param {import("discord.js").ChatInputCommandInteraction | import("discord.js").Message} context
 * @param {string[]} args
 * @param {string} attachmentOptionName
 * @returns {{ url?: string, isReset: boolean, isAttachment?: boolean } | null}
 */
function extractImageSource(context, args = [], attachmentOptionName = "image") {
  const isSlash = typeof context.isChatInputCommand === "function" && context.isChatInputCommand();

  if (isSlash) {
    const isReset = context.options.getBoolean("reset") === true;
    if (isReset) return { isReset: true };

    const attachment = context.options.getAttachment(attachmentOptionName);
    if (attachment && attachment.url) {
      return { url: attachment.url, isAttachment: true, isReset: false };
    }

    const stringUrl = context.options.getString("url")?.trim();
    if (stringUrl) {
      if (/^(reset|remove|clear|default)$/i.test(stringUrl)) {
        return { isReset: true };
      }
      return { url: stringUrl, isAttachment: false, isReset: false };
    }

    return null;
  }

  // Prefix message handling
  const firstAttachment = typeof context.attachments?.first === "function"
    ? context.attachments.first()
    : context.attachments?.values?.().next?.()?.value;

  if (firstAttachment && firstAttachment.url) {
    const ct = (firstAttachment.contentType || "").toLowerCase();
    if (ALLOWED_MIME_TYPES.has(ct) || ct.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(firstAttachment.name || "")) {
      return { url: firstAttachment.url, isAttachment: true, isReset: false };
    }
  }

  if (args && args.length > 0) {
    const firstArg = args[0].trim();
    if (/^(reset|remove|clear|default)$/i.test(firstArg)) {
      return { isReset: true };
    }
    if (/^https?:\/\//i.test(firstArg)) {
      return { url: firstArg, isAttachment: false, isReset: false };
    }
  }

  return null;
}

/**
 * Check whether a guild member has permission to manage the bot's server profile
 * @param {import("discord.js").GuildMember} member
 * @returns {boolean}
 */
function canManageBotProfile(member) {
  if (!member || !member.guild) return false;
  if (member.id === member.guild.ownerId) return true;
  if (config.isOwner && config.isOwner(member.id)) return true;
  return (
    member.permissions.has(PermissionFlagsBits.ManageGuild) ||
    member.permissions.has(PermissionFlagsBits.Administrator)
  );
}

module.exports = {
  ALLOWED_MIME_TYPES,
  MAX_IMAGE_SIZE,
  downloadAndValidateImage,
  extractImageSource,
  canManageBotProfile,
};
