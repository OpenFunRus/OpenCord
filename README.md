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

1. Установить Docker Engine, Docker Compose Plugin и Git.
2. Склонировать репозиторий и перейти в его директорию.
3. В `docker-compose.yml` указать реальный публичный IP или домен в `OPENCORD_WEBRTC_ANNOUNCED_ADDRESS`.
4. Открыть нужные порты в firewall.
5. Из корня проекта выполнить:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable --now docker

git clone https://github.com/OpenFunRus/OpenCord.git
cd OpenCord
```

Если на сервере включён `ufw`, открыть:

```bash
sudo ufw allow 4991/tcp
sudo ufw allow 40000/tcp
sudo ufw allow 40000/udp
```

Запуск:

```bash
docker compose up -d --build
docker compose logs -f
```

После старта интерфейс будет доступен по адресу `http://SERVER_IP:4991`.

Данные сервера сохраняются в `./data` и монтируются в `/home/bun/.config/opencord`.

## Порты

- `4991/tcp` - веб-интерфейс OpenCord и основной HTTP-сервер
- `40000/tcp` - WebRTC fallback / signalling transport для mediasoup
- `40000/udp` - основной voice/media трафик WebRTC

Для production на Ubuntu эти порты должны быть открыты наружу и на уровне облачного firewall, и на уровне локального firewall сервера.

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

