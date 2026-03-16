# OpenCord Project Structure

Короткий обзор репозитория OpenCord для быстрого входа в проект.

## Что это

OpenCord сейчас поддерживает два основных сценария:

- локальная Windows test build через `opencord-server.exe`
- production-запуск на Ubuntu 22.04.5 через Docker

Репозиторий уже вычищен под эти два сценария, без лишних workflow и второстепенного dev-мусора.

## Корень репозитория

- `README.md`
  Короткая точка входа: установка, порты, Ubuntu Docker deployment.
- `ROADMAP.md`
  История изменений, решения и крупные этапы проекта.
- `PROJECT_STRUCTURE.md`
  Этот файл: быстрый обзор состава репозитория.
- `Dockerfile`
  Production builder/runtime образ для Ubuntu Docker-сценария.
- `docker-compose.yml`
  Основной production-first запуск OpenCord на сервере.
- `docker-entrypoint.sh`
  Точка входа контейнера.
- `package.json`
  Корневой workspace Bun monorepo.
- `bun.lock`
  Lockfile зависимостей.
- `tsconfig.json`
  Общая базовая TypeScript-конфигурация workspace.

## Основные директории

- `apps/client`
  Веб-клиент OpenCord на React/Vite.
- `apps/server`
  Сервер OpenCord на Bun/TypeScript, HTTP, WebSocket, mediasoup, Drizzle.
- `packages/shared`
  Общие типы, схемы, enums, shared-утилиты между клиентом и сервером.
- `packages/ui`
  Общие UI-компоненты и примитивы интерфейса.
- `packages/plugin-sdk`
  SDK для серверных/клиентских плагинов.

## Где что искать

### Клиент

- `apps/client/src/screens`
  Основные экраны приложения.
- `apps/client/src/components`
  UI-компоненты, чат, сайдбары, диалоги, настройки.
- `apps/client/src/features`
  Состояние приложения, actions, selectors, subscriptions.
- `apps/client/src/i18n`
  Локализация.

### Сервер

- `apps/server/src/index.ts`
  Основная точка входа сервера.
- `apps/server/src/http`
  HTTP-маршруты и обработчики.
- `apps/server/src/routers`
  tRPC/WS роутеры и бизнес-логика.
- `apps/server/src/db`
  БД, схема, queries, mutations, seed.
- `apps/server/src/utils`
  Служебная логика, WebSocket, mediasoup, shutdown.
- `apps/server/src/runtimes`
  Voice runtimes и связанный runtime-слой.

### Сборка и deployment

- `apps/server/build/build-windows.ts`
  Windows test build.
- `apps/server/build/build.ts`
  Linux production build.
- `apps/server/build/helpers.ts`
  Общие helper-функции сборки.

## Что реально используется в текущем workflow

### Для Windows test build

- исходники из `apps/client`, `apps/server`, `packages/*`
- build-скрипт `apps/server/build/build-windows.ts`
- итоговый файл `apps/server/build/out/opencord-server.exe`

### Для Ubuntu production

- `Dockerfile`
- `docker-compose.yml`
- `docker-entrypoint.sh`
- директория `./data`, которую создаёт Docker volume bind mount

## Ключевые команды

### Локальная проверка типов

```bash
bun run check-types
```

### Сборка Windows test exe

```bash
cd apps/server
bun run build:windows
```

### Production на Ubuntu 22.04.5

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f
```

## Порты production-сервера

- `4991/tcp` — веб-интерфейс и HTTP
- `40000/tcp` — WebRTC fallback
- `40000/udp` — voice/media трафик

## Что важно помнить

- OpenCord сейчас намеренно минимализирован под реальный deployment/use-case.
- Основная живая документация: `README.md` и `ROADMAP.md`.
- Если нужно быстро понять, где лежит конкретная логика, сначала смотри в `apps/client/src` или `apps/server/src`, а затем в `packages/shared`.
