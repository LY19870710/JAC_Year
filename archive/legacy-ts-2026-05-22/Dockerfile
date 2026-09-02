# ============================================================
# JAC Year Manager — Production Docker Image
# Build:  docker build -t jac-year .
# Run:    docker run -d -p 3000:3000 --name jac-year jac-year
# ============================================================
FROM node:22-alpine

LABEL maintainer="JAC Editor"
LABEL description="Journal of Advanced Ceramics - Year Article Manager"

WORKDIR /app

# Install Playwright system deps (Chromium for scraping)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && npx playwright install chromium --with-deps > /dev/null 2>&1 \
    || true

# Copy package files
COPY package*.json ./

# Install production deps only
RUN npm ci --omit=dev

# Copy source + views + static + DB
COPY src/ ./src/
COPY views/ ./views/
COPY public/ ./public/
COPY dist/ ./dist/
COPY jac_articles.db ./

# Env defaults
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# Graceful shutdown handled in server.ts (SIGTERM/SIGINT)
CMD ["node", "dist/server.js"]
