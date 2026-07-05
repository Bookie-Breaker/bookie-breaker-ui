# build: compile the SvelteKit app with adapter-node
FROM node:22-slim AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build && pnpm prune --prod

# runtime: node server (health checks live in compose; slim has no wget/curl)
FROM node:22-slim

RUN useradd --uid 10001 --create-home appuser

WORKDIR /app

COPY --from=builder --chown=appuser:appuser /app/build ./build
COPY --from=builder --chown=appuser:appuser /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appuser /app/package.json ./package.json

USER appuser

ENV NODE_ENV=production PORT=3000

EXPOSE 3000

CMD ["node", "build"]
