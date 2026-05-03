FROM node:20.11.0-alpine AS base
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy the core dependencies
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs apps/api/package*.json ./apps/api/
COPY --chown=nodejs:nodejs packages/types/package*.json ./packages/types/

# Install the monorepo dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy the rest of the workspace files
COPY --chown=nodejs:nodejs packages/ ./packages/
COPY --chown=nodejs:nodejs apps/api/ ./apps/api/

# Switch to non-root user
USER nodejs

EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use tsx to run the TS code directly, avoiding monorepo compilation mismatches
CMD ["npx", "tsx", "apps/api/src/index.ts"]
