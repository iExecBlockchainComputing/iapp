FROM node:22-alpine3.21
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENTRYPOINT ["node", "--disable-wasm-trap-handler", "/app/src/app.js"]
