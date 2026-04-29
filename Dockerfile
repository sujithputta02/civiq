FROM node:20-alpine
WORKDIR /app

# Copy the core dependencies
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/types/package*.json ./packages/types/

# Install the monorepo dependencies
RUN npm ci

# Copy the rest of the workspace files
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

EXPOSE 3005

# Use tsx to run the TS code directly, avoiding monorepo compilation mismatches
CMD ["npx", "tsx", "apps/api/src/index.ts"]
