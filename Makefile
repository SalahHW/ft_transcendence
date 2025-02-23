DOCKERFILES = ./frontend/Dockerfile

start: images
	@docker compose -f ./docker-compose.yml up -d

images: $(DOCKERFILES)
	@docker compose -f ./docker-compose.yml build
	@touch .images

stop:
	@docker compose -f ./docker-compose.yml down

restart: stop start

clean: stop
	@docker system prune -af
	@rm -f .images

re: clean start

.PHONY: start images stop restart clean re