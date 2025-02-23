FROM alpine:3.21

RUN apk update && apk add --no-cache nodejs npm

WORKDIR /app

RUN npm install fastify

COPY ./app/ /app/

EXPOSE 3000

CMD [ "node", "server.js" ]