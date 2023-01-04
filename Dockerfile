FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build


# Second stage
FROM node:18-alpine

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

WORKDIR /app

COPY package.json ./
COPY --from=builder /app/package-lock.json ./
RUN npm ci

COPY conf ./conf
COPY --from=builder /app/dist/ ./dist

CMD [ "node", "dist/index.js", "conf/default.json" ]