FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

EXPOSE 4000

CMD ["sh", "-c", "npx knex migrate:latest && npx knex seed:run && node src/server.js"]
