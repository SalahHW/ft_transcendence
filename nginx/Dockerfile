FROM alpine:3.21

RUN apk update && apk add --no-cache nginx

RUN mkdir -p /var/log/nginx
RUN rm -rf /etc/nginx/http.d/*
COPY ./nginx-config/default.conf /etc/nginx/http.d/
COPY ./html/ /html/

EXPOSE 80

CMD [ "nginx", "-g", "daemon off;" ]