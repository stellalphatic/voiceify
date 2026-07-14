FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/web ./apps/web
COPY apps/widget ./apps/widget
RUN pnpm install --frozen-lockfile --filter @voiceify/web... --filter @voiceify/widget...
RUN pnpm --filter @voiceify/web build
RUN pnpm --filter @voiceify/widget build

FROM nginx:1.27-alpine AS runner
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
# Embed snippet expects /widget.js
COPY --from=build /app/apps/widget/dist/voiceify-widget.umd.js /usr/share/nginx/html/widget.js
COPY docker/web-nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
