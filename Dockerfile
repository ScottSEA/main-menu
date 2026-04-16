FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npx vite build

FROM node:20-alpine
WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY server/ ./server/
COPY templates/ ./templates/
COPY .env.example ./.env
COPY --from=client-build /app/client/dist ./client/dist

RUN mkdir -p uploads published

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server/src/index.js"]
