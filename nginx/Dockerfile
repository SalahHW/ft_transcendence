FROM alpine:3.21

RUN apk update && apk add --no-cache nginx npm

# Nginx configuration
RUN mkdir -p /var/log/nginx
RUN rm -rf /etc/nginx/http.d/*
COPY ./nginx-config/default.conf /etc/nginx/http.d/

WORKDIR /app
COPY package.json .
RUN npm cache clean --force && npm install
COPY . .
RUN npm run build

CMD [ "nginx", "-g", "daemon off;" ]