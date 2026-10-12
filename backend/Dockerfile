# Stage 1: Dependencies
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Stage 2: Build
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build \
    && yarn install --production --frozen-lockfile --ignore-scripts --prefer-offline

# Stage 3: Production
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# OpenShift runs the container as a random user id that belongs to group 0 (root group).
# The app writes log files under data/, so give group 0 write access there.
RUN mkdir -p data/logs data/sessions \
    && chgrp -R 0 /app \
    && chmod -R g=u /app

USER 1001

# OpenShift does not allow ports below 1024. The platform's Service expects 3000.
EXPOSE 3000

CMD ["node", "./dist/server.js"]
