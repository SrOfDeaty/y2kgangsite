FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY worker.mjs ./worker.mjs
USER node

CMD ["node", "worker.mjs"]
