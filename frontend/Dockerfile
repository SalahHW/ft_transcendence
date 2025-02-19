FROM alpine

RUN apk update && \
    apk add --no-cache nginx

RUN mkdir -p /var/log/nginx

EXPOSE 80

CMD [ "nginx", "-g", "daemon off;" ]