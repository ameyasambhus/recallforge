FROM node:22-alpine

WORKDIR /app

COPY package.json ./

RUN npm run build

COPY . .

CMD [ "npm","run", "start" ]