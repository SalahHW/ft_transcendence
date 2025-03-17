DOCKERFILES = ./nginx/Dockerfile					\
			  			./users-service/Dockerfile

start: images
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

.PHONY: start images stop restart clean re