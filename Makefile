SERVICE_DIRS := $(shell find . -maxdepth 1 -type d -name '*-service' -o -name 'nginx' -o -name 'redis' -o -name 'game' -o -name 'jwt' -o -name 'blockchain' -o -name 'presences' -o -name 'avatars' -o -name 'friends')
SERVICE_SRC := $(shell find $(SERVICE_DIRS) -type f \( -name '*.js' -o -name '*.ts' -o -name '*.json' -o -name '*.sol' \))

start: .images
	@docker compose -f ./docker-compose.yml up -d

.images: $(SERVICE_SRC)
	@COMPOSE_BAKE=true docker compose -f ./docker-compose.yml build
	@touch .images

stop:
	@docker compose -f ./docker-compose.yml down

restart: stop start

clean: stop
	@docker system prune -af
	@rm -f .images

re: clean start

.PHONY: start stop images restart clean re