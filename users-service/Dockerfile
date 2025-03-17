FROM alpine:3.21

RUN apk update && apk add --no-cache nodejs npm

WORKDIR /app/

COPY /src /app/

RUN npm install

CMD [ "npm", "start" ]