FROM node:20-slim

# Install Chrome dependencies needed by Puppeteer's bundled Chromium
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    wget \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install deps (Puppeteer will auto-download Chromium here)
COPY package*.json ./
COPY .puppeteerrc.cjs ./
RUN npm install

# Copy all source code
COPY . .

# Create writable session folder
RUN mkdir -p .wwebjs_auth

EXPOSE 5001

CMD ["node", "index.js"]
