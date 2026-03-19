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

## Контекст на 2026-03-18 (для следующей нейронки)

### Что уже сделано по текстовому чату

- Текущее окно чата: всегда `50` сообщений.
- При прокрутке вверх до края: старые сообщения догружаются в ту же ленту без отдельного `history mode`.
- Лента держит bounded window и буферы `before/after`, чтобы не рендерить слишком большой DOM при длинных каналах и картинках.
- Переходы из поиска и закрепов грузят окно вокруг цели (`50`), центрируют целевое сообщение и позволяют вернуться к текущим сообщениям через `jump to present`.
- Для отправки GIF из picker-а добавлен усиленный автоскролл вниз (несколько отложенных вызовов), чтобы низ чата удерживался даже при поздней дорисовке медиа.
- Для сообщений добавлены настраиваемые лимиты контента:
  - лимиты `символов/строк` вынесены в `Настройки сервера -> Общие`;
  - значения по умолчанию: `1024` символа и `32` строки;
  - лимиты применяются на `send` и `edit`, и проверяются и на клиенте, и на сервере.
- Для фронт-ассетов добавлена серверная cache-стратегия:
  - `index.html` всегда без кеша (`no-store/no-cache`);
  - hashed `js/css` в `assets` кэшируются долго (`immutable`, `max-age=31536000`);
  - за счёт этого после обновления сервера браузер подтягивает новый `index.html` и переключается на новые asset-hash файлы без ручной очистки кеша.
- Для изображений добавлены thumbnail-превью:
  - сервер отдаёт thumbnail по `?thumb=1` для `jpg/png/webp`;
  - генерация thumbnail переведена на `jimp` (pure JS), чтобы стабильно работать и в Windows `.exe`, и на Ubuntu;
  - в ленте чата рендерится thumbnail или временная заглушка, затем автоматически подмена на thumbnail после готовности;
  - при открытии изображения в fullscreen всегда используется оригинал.
- Для вложений в сообщениях обновлён UI:
  - у изображений в сообщении убрана лишняя подложка, оставлены overlay-кнопки действий поверх самого превью;
  - `скачать` на изображениях доступно всем, `удалить` — автору сообщения и пользователям с `MANAGE_MESSAGES`;
  - сетка картинок и файлов теперь адаптивная и раскладывается по ширине сообщения до `3` колонок.

### Что уже сделано по GIF/emoji picker

- В emoji picker добавлена 3-я вкладка `Gifs` с поиском и выдачей до 10 элементов.
- Без поискового запроса вкладка загружает featured/random GIF.
- Интеграция Tenor переведена на серверный прокси `GET /tenor`:
  - сначала используется Tenor v2;
  - при проблемах ключа/доступа включается fallback на v1.
- При клике на GIF сообщение отправляется сразу (без ручного Enter).
- Для Tenor GIF в рендере сообщений скрыт сырой URL, отображается только сама GIF.
- Вкладка табов picker-а компактно ужата (фиксированная высота, truncate текста, равные кнопки).

### Что уже сделано по голосу

- Найден и исправлен критичный UX-баг: hidden `<audio>` для удалённых потоков ранее рендерились внутри левого сайдбара.
- Поскольку сайдбар размонтируется при закрытии (особенно на mobile), входящий звук пропадал до повторного открытия меню.
- Плейбек удалённых voice/external audio вынесен в постоянный слой внутри `VoiceProvider` (`VoiceAudioHost`), не зависящий от сайдбаров.
- В `VoiceProvider` дополнительно исправлен race-condition: `onended` старого media track теперь закрывает только свой producer instance и не может закрыть новый producer после рестарта устройства/потока.
- Для карточек видео/демонстрации добавлен fullscreen-триггер в левом верхнем углу.
- Во fullscreen добавлен поворот `90°` (повторным нажатием по кругу), чтобы на мобильных было удобно смотреть горизонтальное видео.
- Кнопки `fullscreen / pin / zoom` в voice-карточках приведены к единому стилю верхней панели (та же подложка, рамка, hover).
- Кнопка громкости в voice-карточках тоже приведена к этому же единому стилю контролов.
- Видимость fullscreen-кнопки синхронизирована с панелью hover-кнопок (desktop), чтобы она не висела постоянно.
- Для мобильной версии добавлен tap-показ контролов карточек (аналог hover через `focus/active`), чтобы кнопки появлялись по нажатию на карточку.
- Нижняя панель звонка на mobile переведена на схему со стрелкой: по тапу раскрываются `микрофон / видео / экран / отключиться`.
- Для fullscreen у `screen share`, `external video` и `external stream` расширено управление медиа:
  - desktop: zoom по колесу мыши + pan перетаскиванием;
  - mobile: `pinch-to-zoom` + drag одним пальцем после увеличения.
- Обновлён стиль toast-уведомлений под dark theme (цветные жирные тексты в success/error/info/warning).
- Добавлена локализация типовых media-device ошибок в popup, включая `Requested device not found`.

### Что уже сделано по модерации и карточкам пользователя (2026-03-19)

- В `User Moderation Panel` шапка отделена от контента:
  - верхний блок с аватаром/действиями закреплён;
  - при длинном контенте прокручивается только центральная часть.
- Вложенное контекстное меню пользователя в правой панели участников исправлено под стандартный OpenCord `ContextMenuTrigger` (как у каналов):
  - `Информация` открывает user card;
  - `Написать` открывает DM;
  - `Модерация` показывается только с нужными правами.
- В user popover быстрые действия переведены в икон-кнопки единого стиля (`DM` + `Модерация`) без текстовых дублей.
- Серые устаревшие close-рамки (`X`) в модалках заменены на единый tabler-like стиль OpenCord во всех ключевых диалогах/настройках.
- В `packages/ui` скорректирован базовый `Dialog` close-control:
  - убрано лишнее серое hover/focus свечение;
  - выровнено центрирование иконки `X` в кнопке закрытия.
- Табы в `Настройках сервера` и `Настройках пользователя` приведены к общей тёмной палитре OpenCord по hover/active-состояниям без изменения остального layout.
- Для tab-кнопок и кнопки удаления файлов добавлены жёсткие color overrides, чтобы hover/focus/active не проваливались в дефолтные системные оттенки.
- Кнопка удаления в карточках прикреплённых файлов переведена на тот же hover/focus-стиль, что и остальные action-кнопки OpenCord.

### Что нужно проверить вручную (обязательно)

1. Windows + Chrome: два пользователя в voice, стабильный двусторонний звук без открытия меню.
2. Android + Chrome: два пользователя в voice, звук не зависит от открытия левого меню.
3. Переключение каналов и открытие/закрытие меню во время звонка не ломает аудио.
4. Видео и screen share не ломаются после переключений устройств и повторного старта.
5. Проверить 2-5 минут стабильного разговора без обрыва через 1-2 секунды.
6. Проверить fullscreen + rotate для видео и screen share на Android Chrome (портрет/ландшафт).
7. Проверить, что на Android tap по карточке показывает верхние/нижние контролы карточки (и они не висят постоянно).
8. Проверить, что мобильная стрелка внизу раскрывает/скрывает `mic/video/screen/disconnect`.
9. Проверить русские тексты всплывающих media-device ошибок.

### Как передать контекст новой нейронке

- Сразу укажи, что последние правки были в:
  - `apps/client/src/components/voice-provider/index.tsx`
  - `apps/client/src/components/voice-provider/voice-audio-host.tsx`
  - `apps/client/src/components/left-sidebar/voice-control.tsx`
  - `apps/client/src/features/server/messages/hooks.ts`
  - `apps/client/src/components/emoji-picker/index.tsx`
  - `apps/client/src/components/emoji-picker/gifs-tab.tsx`
  - `apps/server/src/http/tenor.ts`
  - `apps/client/src/components/channel-view/text/renderer/serializer.tsx`
- И дай формулировку: "Проверь, что voice playback не зависит от UI-окон и sidebar-mount/unmount".
- Для GIF добавь формулировку: "Проверь, что Gifs-tab загружается, не вылезает из поповера и отправляет GIF с автоскроллом вниз".

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
