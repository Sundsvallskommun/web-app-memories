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

# NEXT_PUBLIC_ vars are baked into the built files. These two are built as placeholders
# and replaced by entrypoint.sh when the container starts, so each environment can set
# its own values in the Deployment and one image works in test and production alike.
ARG NEXT_PUBLIC_API_URL=NEXT_PUBLIC_API_URL_PLACEHOLDER
ARG NEXT_PUBLIC_APP_NAME=NEXT_PUBLIC_APP_NAME_PLACEHOLDER
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
COPY entrypoint.sh ./

# OpenShift runs the container as a random user id that belongs to group 0 (root group).
# Give that group the same rights as the owner so entrypoint.sh can rewrite the files in
# .next and Next.js can write .next/cache. Works the same under plain Docker.
# The sed strips Windows line endings, in case the image is built from a Windows checkout.
RUN sed -i 's/\r$//' entrypoint.sh \
    && chmod 0555 entrypoint.sh \
    && mkdir -p .next/cache \
    && chgrp -R 0 /app \
    && chmod -R g=u /app

USER 1001

# OpenShift does not allow ports below 1024. The platform's Service expects 3000.
EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server.js"]
