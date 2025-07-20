SERVICE_DIRS := $(shell find . -maxdepth 1 -type d -name '*-service' -o -name 'nginx' -o -name 'redis' -o -name 'game' -o -name 'jwt' -o -name 'blockchain' -o -name 'presences' -o -name 'avatars' -o -name 'friends')
SERVICE_DOCK := $(shell find . $(SERVICE_DIRS) -name 'Dockerfile' -type f)
SERVICE_SRC := $(shell find $(SERVICE_DIRS) -type f \( -name '*.js' -o -name '*.ts' -o -name '*.json' -o -name '*.sol' \))
DIRS := $(shell find . -type d)

start: envs .images
	@docker compose -f ./docker-compose.yml up -d
	chmod +x ./launch-scripts/openBrowser.sh
	@./launch-scripts/openBrowser.sh

envs:
	@./launch-scripts/initEnvs.sh

dbs:
	@rm -rf ./avatars-service/database
	@rm -rf ./friends-service/database
	@rm -rf ./users-service/database

.images: envs $(SERVICE_SRC) $(SERVICE_DOCK) docker-compose.yml .env
	@COMPOSE_BAKE=true docker compose -f ./docker-compose.yml build && touch .images

stop:
	@if [ ! -f ./jwt-service/.env ]; then \
		echo "SECRET_KEY=very_long_password_or_not_because_basic_one" > ./jwt-service/.env; \
	fi
	@docker compose -f ./docker-compose.yml down

restart: stop start

clean: stop dbs
	@if [ -f ./jwt-service/.env ]; then \
		echo "Jwt key removed"; \
		rm ./jwt-service/.env; \
	else \
		echo "no jwt .env found"; \
	fi
	@docker system prune -af
	@rm -f .images

re: clean start

.PHONY: start stop images restart clean re