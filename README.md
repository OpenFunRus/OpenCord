# OpenCord

Минимально очищенный репозиторий OpenCord под два сценария:

- Windows test build
- production-запуск на Ubuntu 22.04.5 через Docker

Основные документы проекта:

- `README.md` - быстрый старт и deployment
- `ONBOARDING.md` - подробный вход в проект для нового человека или нейронки
- `ROADMAP.md` - история изменений и направления развития
- `PROJECT_STRUCTURE.md` - краткая карта репозитория и ключевых путей

## Что оставлено

- `apps/client` и `apps/server`
- `packages/shared`, `packages/ui`, `packages/plugin-sdk`
- Windows-сборка через `apps/server/build/build-windows.ts`
- Linux production path через `Dockerfile`, `docker-entrypoint.sh` и `docker-compose.yml`
- снапшот исходного состояния рядом с проектом: `../sharkord-development.zip`

## Быстрый production запуск на Ubuntu 22.04.5

1. Установить Docker Engine, `docker-compose-v2` и Git.
2. Склонировать репозиторий и перейти в его директорию.
3. В `docker-compose.yml` указать реальный публичный IP или домен в `OPENCORD_WEBRTC_ANNOUNCED_ADDRESS`.
4. Открыть нужные порты в firewall.
5. Из корня проекта выполнить:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git
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

Контейнер настроен с `restart: unless-stopped`, поэтому после перезагрузки Ubuntu он должен подниматься автоматически, если сервис Docker включён через `systemctl enable docker`.

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
- В Docker builder уже добавлены зависимости, нужные `mediasoup`, поэтому для Ubuntu 22.04.5 не требуется вручную ставить `python`, `invoke` или компиляторы на хост-систему.
- В текстовом чате используется гибридная пагинация:
  - текущий режим: окно всегда `100` последних сообщений
  - при прокрутке вверх до края сразу включается history mode с окном `100` (`-50/+50` от якоря)
  - в history каждый шаг пагинации также работает по схеме `-50/+50` с центровкой
  - переходы из закрепов/поиска якорятся по `messageId` с позиционированием сообщения по центру
- По voice/media на 2026-03-18:
  - входящий аудио-плейбек вынесен из левого сайдбара в постоянный слой `VoiceProvider`, чтобы звук не зависел от открытия/закрытия меню
  - добавлена защита от race-condition в producer lifecycle (`onended` старого трека больше не закрывает новый producer)
  - требуются ручные регрессионные тесты (Chrome Windows, Chrome Android, голос/видео/демо экрана)
- По GIF-интеграции на 2026-03-18:
  - в emoji picker добавлена вкладка `Gifs` (рандом + поиск до 10 результатов)
  - клиент работает через серверный маршрут `/tenor` (прокси к Tenor с fallback), чтобы не упираться в client-side API key/CORS
  - клик по GIF отправляет сообщение сразу, без ручного Enter
  - для Tenor GIF скрыт сырой URL в теле сообщения (в чате рендерится сама GIF)
- Если проект открывает новый человек или новая нейронка, сначала смотри `ONBOARDING.md`.
- Для общего контекста и истории изменений используй `ROADMAP.md`.
- Для быстрого понимания состава репозитория и ключевых папок смотри `PROJECT_STRUCTURE.md`.

