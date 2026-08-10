FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --filter @voiceify/api...

FROM deps AS build
RUN pnpm --filter @voiceify/api... build

FROM base AS runner
ARG GIT_SHA=unknown
ARG BUILT_AT=unknown
ENV NODE_ENV=production
ENV GIT_SHA=$GIT_SHA
ENV BUILT_AT=$BUILT_AT
WORKDIR /app
COPY --from=build /app /app
COPY docker/api-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3001/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/entrypoint.sh"]
