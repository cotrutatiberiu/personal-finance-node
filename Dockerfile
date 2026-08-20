# ==========================================
# Base stage: Install pnpm & set working dir
# ==========================================
FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# ==========================================
# Dependencies stage: Install node_modules
# ==========================================
FROM base AS deps

# Copy dependency files first to leverage Docker layer caching
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install dependencies including devDependencies (needed for Prisma CLI & build tools)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ==========================================
# Build stage: Generate Prisma client & compile
# ==========================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client types
RUN pnpm exec prisma generate

# ==========================================
# Production Runner stage
# ==========================================
FROM base AS runner

ENV NODE_ENV=production

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

# Copy generated Prisma Client and node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app ./

USER expressjs

EXPOSE 3000

CMD ["node", "index.js"]