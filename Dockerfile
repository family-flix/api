FROM node:16

ENV PORT 8000
ENV OUTPUT_PATH /output
ENV DATABASE_PATH file:///output/data/family-flix.db?connection_limit=1

WORKDIR /app
COPY package*.json ./
RUN yarn config set registry https://registry.npm.taobao.org/
RUN yarn
COPY . .
RUN node scripts/ncc.js
RUN yarn prisma generate
RUN yarn build
EXPOSE 8000
CMD yarn prisma migrate deploy --schema ./prisma/schema.prisma && yarn start
