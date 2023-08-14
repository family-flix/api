FROM node:16

ENV PORT 8000
# ENV OUTPUT_PATH /output
# ENV DATABASE_PATH file:///output/data/family-flix.db?connection_limit=1

WORKDIR /app
COPY package*.json ./
RUN npm config set registry https://registry.npm.taobao.org
RUN npm config set disturl https://npm.taobao.org/dist
RUN npm install
COPY . .
RUN node scripts/ncc.js
RUN npx prisma migrate dev
RUN npm run build
EXPOSE 8000
ENTRYPOINT ["npm", "start"]
