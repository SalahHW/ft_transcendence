COMPOSE_FILE = ./docker-compose.yml
DOCKER_COMPOSE = COMPOSE_BAKE=true  docker compose -f $(COMPOSE_FILE)

start:
	@$(DOCKER_COMPOSE) up -d

stop:
	@$(DOCKER_COMPOSE) down

restart: stop start

build:
	@$(DOCKER_COMPOSE) build

rebuild-%:
	@$(DOCKER_COMPOSE) up -d --build $*

rebuild-nginx:
	@$(DOCKER_COMPOSE) up -d --build nginx

rebuild-users:
	@$(DOCKER_COMPOSE) up -d --build users

rebuild-jwt:
	@$(DOCKER_COMPOSE) up -d --build jwt

rebuild-redis:
	@$(DOCKER_COMPOSE) up -d --build redis

rebuild-game:
	@$(DOCKER_COMPOSE) up -d --build game

rebuild-blockchain:
	@$(DOCKER_COMPOSE) up -d --build blockchain

rebuild-avatars:
	@$(DOCKER_COMPOSE) up -d --build avatars

rebuild-friends:
	@$(DOCKER_COMPOSE) up -d --build friends

rebuild-presences:
	@$(DOCKER_COMPOSE) up -d --build presences
		
clean: stop
	@$(DOCKER_COMPOSE) down --remove-orphans

clean-images: clean
	@$(DOCKER_COMPOSE) down --rmi local

re: clean start

.PHONY: start images stop restart clean re