COMPOSE_FILE = ./docker-compose.yml
DOCKER_COMPOSE = docker compose -f $(COMPOSE_FILE)

start:
	@$(DOCKER_COMPOSE) up -d

stop:
	@$(DOCKER_COMPOSE) down

restart: stop start

build:
	@COMPOSE_BAKE=true $(DOCKER_COMPOSE) build

rebuild-%:
	@$(DOCKER_COMPOSE) up -d --build $*

clean: stop
	@docker system prune -af
	@rm -f .images

re: clean start

.PHONY: start images stop restart clean re