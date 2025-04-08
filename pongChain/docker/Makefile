SERVICE_NAME=hardhat

.PHONY: build up down shell

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

clean:
	docker-compose down --volumes --remove-orphans
	docker system prune -a --volumes -f
	rm -rf ../artifacts/contracts
	rm -rf ../addresses.json

exec:
	docker exec -ti my-hardhat bash

all: build up exec

