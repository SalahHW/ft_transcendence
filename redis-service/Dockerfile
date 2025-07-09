FROM alpine:3.21

RUN apk add --no-cache redis bash

COPY ./config/redis.conf /etc/redis/redis.conf

COPY ./script/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]