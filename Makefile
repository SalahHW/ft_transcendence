COMPOSE_FILE = ./docker-compose.yml
DOCKER_COMPOSE = docker compose -f $(COMPOSE_FILE)

start:
	@$(DOCKER_COMPOSE) up -d

stop:
	@$(DOCKER_COMPOSE) down

restart: stop start

build:
	@COMPOSE_BAKE=true $(DOCKER_COMPOSE) build

rebuild-nginx:
	@$(DOCKER_COMPOSE) up -d --build nginx

rebuild-redis:
	@$(DOCKER_COMPOSE) up -d --build redis

rebuild-users:
	@$(DOCKER_COMPOSE) up -d --build users

rebuild-jwt:
	@$(DOCKER_COMPOSE) up -d --build jwt

rebuild-blockchain:
	@$(DOCKER_COMPOSE) up -d --build blockchain

rebuild-game:
	@$(DOCKER_COMPOSE) up -d --build game

rebuild-avatars:
	@$(DOCKER_COMPOSE) up -d --build avatars

rebuild-friends:
	@$(DOCKER_COMPOSE) up -d --build friends

rebuild-presences:
	@$(DOCKER_COMPOSE) up -d --build presences

clean: stop
	@docker system prune -af
	@rm -f .images

re: clean start

.PHONY: start images stop restart clean re