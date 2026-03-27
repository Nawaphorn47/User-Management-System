FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies first (cache layer)
COPY package*.json ./
RUN npm install --omit=dev

# Copy source
COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/app.js"]
