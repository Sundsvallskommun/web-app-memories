# Install dependencies only when needed
FROM node:20-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Rebuild the source code only when needed
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_ vars are baked into the browser bundle at build time.
# The default "/api" is relative, so the browser calls the backend on the same
# host it loaded the page from. On OpenShift a Route on the frontend host sends /api
# to the backend, so one image works in stage and production alike.
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_APP_NAME=Sundsvallsminnen
ARG NEXT_PUBLIC_BASE_PATH=
# next.config.js validates these during the build, so they need values here too.
# They are read again at runtime by /api/health/up, where they can be overridden.
ARG HEALTH_AUTH=false
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH \
    HEALTH_AUTH=$HEALTH_AUTH \
    HEALTH_USERNAME= \
    HEALTH_PASSWORD= 

RUN yarn build

# Production image, copy all the files and run next
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# OpenShift runs the container as a random user id that belongs to group 0 (root group).
# Give that group the same rights as the owner so Next.js can write .next/cache
# (image optimization, ISR). Works the same under plain Docker.
RUN mkdir -p .next/cache \
    && chgrp -R 0 /app \
    && chmod -R g=u /app

USER 1001

# OpenShift does not allow ports below 1024. The platform's Service expects 3000.
EXPOSE 3000

CMD ["node", "server.js"]
