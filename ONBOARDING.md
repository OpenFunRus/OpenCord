# OpenCord Onboarding

Подробный onboarding-документ для нового человека или нейронки, которая впервые открыла репозиторий OpenCord.

## Что это за проект

OpenCord сейчас собран вокруг двух реальных сценариев:

- локальная Windows test build через `opencord-server.exe`
- production-запуск на Ubuntu 22.04.5 через Docker

Репозиторий уже вычищен под эти два сценария, без старых workflow, лишней документации и второстепенного dev-слоя.

## Какие документы читать в первую очередь

- `README.md`
  Быстрый старт, Ubuntu deployment, Docker, порты.
- `ONBOARDING.md`
  Этот файл. Подробный вход в проект для нового человека/нейронки.
- `PROJECT_STRUCTURE.md`
  Краткая карта репозитория и ключевых директорий.
- `ROADMAP.md`
  История изменений, ключевые решения и развитие проекта.

## Что лежит в корне репозитория

- `apps/`
  Основные приложения OpenCord.
- `packages/`
  Общие workspace-пакеты.
- `Dockerfile`
  Production builder/runtime образ.
- `docker-compose.yml`
  Production-first Docker-запуск OpenCord.
- `docker-entrypoint.sh`
  Entrypoint контейнера.
- `package.json`
  Корневой Bun workspace.
- `bun.lock`
  Lockfile зависимостей.
- `README.md`
  Быстрый старт.
- `PROJECT_STRUCTURE.md`
  Краткий обзор структуры репозитория.
- `ROADMAP.md`
  История и roadmap проекта.

## Основные директории

### `apps/client`

Веб-клиент OpenCord на React + Vite.

Ключевые подпапки:

- `apps/client/src/screens`
  Основные экраны.
- `apps/client/src/components`
  UI, чат, диалоги, боковые панели, настройки.
- `apps/client/src/features`
  Состояние приложения, actions, selectors, subscriptions.
- `apps/client/src/i18n`
  Локализация.

### `apps/server`

Сервер OpenCord на Bun + TypeScript.

Ключевые подпапки:

- `apps/server/src/index.ts`
  Основная точка входа сервера.
- `apps/server/src/http`
  HTTP-маршруты и обработчики.
- `apps/server/src/routers`
  tRPC/WS-роутеры и бизнес-логика.
- `apps/server/src/db`
  БД, схема, seed, queries, mutations.
- `apps/server/src/utils`
  Служебная логика, WebSocket, mediasoup, shutdown.
- `apps/server/src/runtimes`
  Voice runtime-слой.

### `packages/shared`

Общие типы, enums, схемы и shared-логика между клиентом и сервером.

### `packages/ui`

Общие UI-компоненты и примитивы.

### `packages/plugin-sdk`

SDK для плагинов.

## Что реально используется сейчас

### Для Windows test build

Используется:

- `apps/client`
- `apps/server`
- `packages/shared`
- `packages/ui`
- `packages/plugin-sdk`
- `apps/server/build/build-windows.ts`

Результат сборки:

```text
apps/server/build/out/opencord-server.exe
```

### Для Ubuntu production

Используется:

- `Dockerfile`
- `docker-compose.yml`
- `docker-entrypoint.sh`
- bind mount `./data`

## Что нужно на новом Windows-компьютере

Минимум:

1. `Git`
2. `Bun`
3. PowerShell или Windows Terminal

Желательно:

- стабильный интернет
- обычная пользовательская Windows-сессия с правом запускать `taskkill`

## Как собрать OpenCord на Windows

### 1. Скачать проект

```bash
git clone https://github.com/OpenFunRus/OpenCord.git
cd OpenCord
```

### 2. Установить зависимости

Из корня проекта:

```bash
bun install
```

Проверка:

```bash
bun --version
```

Если `bun` не найден, значит Bun не установлен или не добавлен в `PATH`.

### 3. Проверить типы

Из корня:

```bash
bun run check-types
```

Это не обязательно для каждого запуска, но полезно как быстрая проверка среды.

### 4. Собрать Windows `.exe`

Перейти в серверную папку:

```bash
cd apps/server
bun run build:windows
```

Что делает этот скрипт:

- собирает клиент через Vite
- упаковывает интерфейс в `interface.zip`
- упаковывает миграции БД в `drizzle.zip`
- подготавливает `mediasoup-worker`
- собирает итоговый Windows executable через Bun

### 5. Где лежит результат

```text
apps/server/build/out/opencord-server.exe
```

### 6. Как запускать

Из PowerShell:

```powershell
cd apps/server/build/out
.\opencord-server.exe
```

Или просто двойным кликом через Проводник.

### 7. Что должно произойти

При успешном запуске сервер обычно пишет:

- версию OpenCord
- порт
- адрес интерфейса

После этого интерфейс можно открыть в браузере:

```text
http://localhost:4991
```

или по локальному IP этой Windows-машины.

## Что важно знать про mediasoup на Windows

`mediasoup-worker.exe` — это штатный нативный воркер OpenCord для голосовой части.

Это нормально, что:

- он может быть виден отдельным процессом в диспетчере задач
- Windows Firewall может спросить разрешение при первом запуске

В нормальном сценарии он должен:

- запускаться вместе с `opencord-server.exe`
- завершаться вместе с ним

## Частые проблемы на Windows

### `bun` не найден

Проверка:

```bash
bun --version
```

Если не работает, нужно установить Bun или исправить `PATH`.

### Зависимости не установлены

Запустить из корня:

```bash
bun install
```

### `opencord-server.exe` уже запущен

Если сборка упирается в работающий файл или старый процесс:

```powershell
taskkill /F /T /IM opencord-server.exe
taskkill /F /T /IM mediasoup-worker.exe
```

Потом повторить:

```powershell
cd apps/server
bun run build:windows
```

### Порт `4991` уже занят

Обычно это значит, что уже висит старый экземпляр OpenCord.

Нужно закрыть:

- `opencord-server.exe`
- `mediasoup-worker.exe`

И затем запустить новый экземпляр.

### Windows Firewall спрашивает разрешение

Это нормально для первого запуска, особенно если путь до `.exe` или имя процесса изменились.

## Полезные команды

### Установка зависимостей

```bash
bun install
```

### Проверка типов

```bash
bun run check-types
```

### Сборка Windows test build

```bash
cd apps/server
bun run build:windows
```

### Ручной запуск `.exe`

```powershell
cd apps/server/build/out
.\opencord-server.exe
```

### Принудительно закрыть зависшие процессы

```powershell
taskkill /F /T /IM opencord-server.exe
taskkill /F /T /IM mediasoup-worker.exe
```

## Что нейронка должна считать источником правды

Если новая нейронка разбирается в проекте, лучше смотреть в таком порядке:

1. `README.md`
2. `ONBOARDING.md`
3. `PROJECT_STRUCTURE.md`
4. `ROADMAP.md`
5. `apps/server/package.json`
6. `apps/server/build/build-windows.ts`

## Production на Ubuntu 22.04.5

Для Ubuntu уже есть отдельный готовый сценарий через Docker:

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f
```

Порты production-сервера:

- `4991/tcp` — веб-интерфейс и HTTP
- `40000/tcp` — WebRTC fallback
- `40000/udp` — voice/media трафик

Подробности смотри в `README.md`.

## Итог

Если новый человек или нейронка видит этот репозиторий впервые, базовый путь такой:

1. Прочитать `README.md`
2. Прочитать `ONBOARDING.md`
3. При необходимости открыть `PROJECT_STRUCTURE.md`
4. Для Windows-сборки:
   - `bun install`
   - `bun run check-types`
   - `cd apps/server`
   - `bun run build:windows`
5. Для Ubuntu deployment использовать `docker-compose.yml`
