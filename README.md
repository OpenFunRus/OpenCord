# OpenCord

Минимально очищенный репозиторий OpenCord под два сценария:

- Windows test build
- production-запуск на Ubuntu 22.04.5 через Docker

Основной документ проекта: `ROADMAP.md`.

## Что оставлено

- `apps/client` и `apps/server`
- `packages/shared`, `packages/ui`, `packages/plugin-sdk`
- Windows-сборка через `apps/server/build/build-windows.ts`
- Linux production path через `Dockerfile`, `docker-entrypoint.sh` и `docker-compose.yml`
- снапшот исходного состояния рядом с проектом: `../sharkord-development.zip`

## Быстрый production запуск на Ubuntu

1. Установить Docker Engine и Docker Compose Plugin.
2. В `docker-compose.yml` указать реальный публичный IP или домен в `OPENCORD_WEBRTC_ANNOUNCED_ADDRESS`.
3. Из корня проекта выполнить:

```bash
docker compose up -d --build
```

После старта интерфейс будет доступен по адресу `http://SERVER_IP:4991`.

Данные сервера сохраняются в `./data` и монтируются в `/home/bun/.config/opencord`.

## Windows test build

Выполнить из `apps/server`:

```bash
bun run build:windows
```

Результат сборки: `apps/server/build/out/opencord-server.exe`.

## Переменные окружения

- `OPENCORD_PORT`
- `OPENCORD_DEBUG`
- `OPENCORD_WEBRTC_PORT`
- `OPENCORD_WEBRTC_ANNOUNCED_ADDRESS`
- `OPENCORD_WEBRTC_MAX_BITRATE`
- `OPENCORD_DATA_PATH`

## Примечания

- При первом запуске OpenCord автоматически создаёт `config.ini` и структуру данных.
- Для общего контекста, списка задач и истории изменений используй `ROADMAP.md`.
- Лицензия проекта находится в `LICENSE`.

