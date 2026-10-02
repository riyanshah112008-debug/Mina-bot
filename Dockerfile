# Dockerfile for Mina Bot - Node 20 on Debian slim
FROM node:20-bullseye-slim

WORKDIR /usr/src/app
ENV NODE_ENV=production

# Install system deps required by audio/stream modules, canvas, and ffmpeg
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential python3 python3-pip pkg-config libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev ffmpeg \
  && pip3 install --no-cache-dir --break-system-packages yt-dlp \
  && rm -rf /var/lib/apt/lists/*

# Copy package manifest and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps || npm install --omit=dev --legacy-peer-deps

# Copy application code
COPY . .

EXPOSE 3000
CMD ["node", "src/boot.js"]
