FROM ghcr.io/puppeteer/puppeteer:latest

USER root
WORKDIR /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source code
COPY . .

# Ensure the session folder has write permissions
RUN mkdir -p .wwebjs_auth && chown -R pptruser:pptruser .wwebjs_auth

# Switch back to non-root user for security
USER pptruser

EXPOSE 5001

CMD ["node", "index.js"]
