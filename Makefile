.PHONY: up down restart clean logs ps

up:
	docker compose -f docker-compose.prod.yml up --build -d

down:
	docker compose -f docker-compose.prod.yml down

restart:
	docker compose -f docker-compose.prod.yml down
	docker compose -f docker-compose.prod.yml up --build -d

clean:
	docker compose -f docker-compose.prod.yml down --volumes --rmi all

logs:
	docker compose -f docker-compose.prod.yml logs -f

ps:
	docker compose -f docker-compose.prod.yml ps
