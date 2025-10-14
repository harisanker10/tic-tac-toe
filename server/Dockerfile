FROM node:alpine AS node-builder
RUN npm i -g pnpm

WORKDIR /backend

COPY package.json .
COPY pnpm-lock.yaml .
RUN pnpm install

COPY tsconfig.json .
COPY src/*.ts src/
RUN pnpm run build

FROM registry.heroiclabs.com/heroiclabs/nakama:3.22.0

COPY --from=node-builder /backend/dist/*.js /nakama/data/modules/build/
COPY config.yml /nakama/data/
