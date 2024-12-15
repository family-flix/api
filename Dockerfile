FROM docker.unsee.tech/node:20

ENV PORT 8000
ENV GENERATE_SOURCEMAP=false
ENV NODE_OPTIONS=--max_old_space_size=2048

WORKDIR /app
COPY dist .
RUN npm config set registry https://registry.npmmirror.com/
RUN npm install
RUN npx prisma generate 
EXPOSE 8000
CMD yarn prisma migrate deploy --schema ./prisma/schema.prisma && npm run start
