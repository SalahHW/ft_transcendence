start:
	docker compose -f ./docker-compose.yml up -d

stop:
	docker compose -f ./docker-compose.yml down

restart: stop start

clean: stop
	docker system prune -af

re: clean start