DOCKERFILES = ./nginx/Dockerfile					\
			  			./users-service/Dockerfile

USER_DB_PATH=./users-service/database/user.db
GEN_SECRET_SCRIPT=./generate-secret.sh

prepare-jwt:
	@echo "Checking if user DB exists at $(USER_DB_PATH)..."
	@if [ ! -f $(USER_DB_PATH) ]; then \
		echo "DB not found. Running secret generation script..."; \
		$(GEN_SECRET_SCRIPT); \
	else \
		echo "DB already present."; \
	fi

start: prepare-jwt images 
	@docker compose -f ./docker-compose.yml up -d

images: $(DOCKERFILES)
	@COMPOSE_BAKE=true docker compose -f ./docker-compose.yml build
	@touch .images

stop:
	@docker compose -f ./docker-compose.yml down

restart: stop start

clean: stop
	@docker system prune -af
	@rm -f .images

re: clean start

.DEFAULT_GOAL := start

.PHONY: start prepare-jwt images stop restart clean re
