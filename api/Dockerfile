FROM node:24-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Le volume Railway doit etre monte sur /data
ENV DATA_DIR=/data
EXPOSE 8787
CMD ["node", "src/server.ts"]
