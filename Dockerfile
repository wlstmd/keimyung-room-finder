FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN node --test tests/visitor-counter.test.mjs && npm run lint && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./server.mjs
COPY --from=builder /app/visitor-counter.mjs ./visitor-counter.mjs
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
