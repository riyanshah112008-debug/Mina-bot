# Dockerfile for Mina Bot - Node 20 on Debian Bookworm slim (Debian 12 active stable)
FROM node:20-bookworm-slim

WORKDIR /usr/src/app
ENV NODE_ENV=production

# Install essential runtime tools: ffmpeg for audio DSP, python3 & curl for stream resolver
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg python3 curl ca-certificates \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && rm -rf /var/lib/apt/lists/*

# Copy package manifest and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps || npm install --omit=dev --legacy-peer-deps

# Copy application code
COPY . .

EXPOSE 3000
CMD ["node", "src/boot.js"]
