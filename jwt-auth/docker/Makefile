SERVICE_NAME=jwt-auth-service
CONTAINER_NAME=my-jwt-auth

.PHONY: build up down exec clean all

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

clean:
	docker-compose down --volumes --remove-orphans
	docker system prune -a --volumes -f

exec:
	docker exec -ti $(CONTAINER_NAME) bash

all: build up exec