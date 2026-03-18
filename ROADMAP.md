# OpenCord Roadmap

## 2026-03-18

### Voice/video UX: fullscreen и rotate для mobile

- Для карточек видео и screen-share добавлена отдельная кнопка fullscreen в левом верхнем углу.
- Во fullscreen добавлен поворот видео на `90°` (по кругу), чтобы удобно смотреть поток на мобильных экранах.
- Кнопки `fullscreen`, `pin` и `zoom` в voice-карточках визуально унифицированы под стиль кнопок верхней панели (подложка, рамка, hover).

### Текстовый чат: снижение live/history окна для производительности

- Размер текущего окна чата уменьшен с `100` до `50` сообщений.
- History mode также уменьшен до окна `50` с шагом `25` (`-25/+25`) для более лёгкого DOM при медианагрузке.
- Цель изменения: снизить тормоза при массовой отправке изображений и уменьшить нагрузку на рендер/скролл.

### Текстовый чат: лимиты сообщения стали серверной настройкой

- Лимиты символов и строк вынесены в `Настройки сервера -> Общие`.
- Дефолтные значения изменены на `1024` символа и `32` строки.
- Ограничения применяются и на клиенте, и на сервере, включая редактирование сообщений.

### Изображения: thumbnail в чате и оригинал в fullscreen

- Для изображений добавлена выдача thumbnail через `GET /public/...&thumb=1`.
- В ленте чата показывается thumbnail или временная заглушка, затем автоматическое переключение на thumbnail после готовности.
- При клике по изображению fullscreen открывает оригинальный файл, а не thumbnail.
- Генерация thumbnail переведена с `sharp` на `jimp` (pure JS), чтобы работать стабильно в Windows `.exe` и Ubuntu 22.04.5.

### Текстовый чат: упрощение пагинации до постоянного окна

- Логика текущего окна чата переведена на постоянные `100` сообщений.
- При достижении верхней границы чата history mode включается сразу, без промежуточного накопления больших окон.
- В history mode закреплена модель загрузки `-50/+50` относительно якоря (окно `100`) с позиционированием по центру.
- Переходы из поиска и закреплённых сообщений синхронизированы с этой же моделью (`100`, центр, подсветка цели).
- Для live-потока сообщений добавлено удержание окна `100` вне history mode (при приходе нового сообщения старейшее сообщение вытесняется).

### Текстовый чат: лимиты длины сообщения

- Добавлены Discord-like ограничения для контента сообщения:
  - максимум `4096` символов текста;
  - максимум `20` строк.
- Лимиты включены для отправки новых сообщений и для inline-редактирования существующих сообщений.
- Проверка сделана на двух уровнях:
  - клиент — быстрый UX-фидбек до отправки запроса;
  - сервер — финальная защита от обхода через прямые вызовы API.

### Frontend cache-control: корректное обновление html/js/css

- На серверной раздаче интерфейса включена cache-политика для безопасных обновлений клиентов:
  - `index.html`: `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`;
  - Vite hashed assets (`assets/*-hash.js|css`): `Cache-Control: public, max-age=31536000, immutable`;
  - прочая статика интерфейса: короткий кеш `max-age=3600`.
- Практический результат: браузер всегда запрашивает свежий shell (`index.html`) и после деплоя автоматически подхватывает новые версии `js/css` по новым hash-именам без принудительного hard refresh.

### Voice: устранён баг зависимости звука от бокового меню

- Найдена реальная причина симптома "звук появляется только после открытия левого меню":
  hidden `<audio>` элементы входящих voice потоков рендерились в компоненте левого сайдбара, который размонтируется при закрытии.
- Удалённые voice/external audio-потоки вынесены в постоянный слой `VoiceProvider` через отдельный `VoiceAudioHost`, чтобы playback не зависел от UI-состояния сайдбаров.
- В `VoiceProvider` дополнительно исправлен producer lifecycle race:
  обработчики `track.onended` теперь закрывают только "свой" producer instance и не могут закрывать новый producer после рестартов/переключений устройств.

### Требуются дополнительные ручные тесты (после фикса)

- Windows + Chrome: двусторонний voice (2 клиента), проверка стабильности без открытия меню.
- Android + Chrome: двусторонний voice (2 клиента), проверка что звук не появляется/исчезает от открытия/закрытия меню.
- Регрессия по webcam/screen-share: старт/стоп, смена устройств, переключение каналов.
- Длительный voice smoke-test 2-5 минут на предмет обрыва через 1-2 секунды.

### GIF picker и Tenor интеграция

- В emoji picker добавлена вкладка `Gifs`:
  - featured/random выдача при пустом поиске,
  - до 10 результатов по поисковому запросу.
- Клиентская интеграция с Tenor переведена на серверный прокси `/tenor`, чтобы убрать зависимость от client-side API key и CORS-поведения.
- В серверном `/tenor` реализована двухступенчатая схема:
  - попытка Tenor v2;
  - fallback на Tenor v1 при ошибках (включая `API_KEY_INVALID`).
- Клик по GIF теперь отправляет сообщение сразу, без ручного Enter.
- Для Tenor-ссылок в тексте сообщений скрыт raw URL: в чате показывается только GIF-медиа.
- UI табов `Эмодзи / Пользовательские / Gifs` в picker-е доведён до компактного строгого вида:
  - одинаковые размеры,
  - truncate текста,
  - фиксы переполнения и выезда за границы поповера.
- После отправки GIF добавлен усиленный автоскролл вниз (несколько delayed-scroll шагов), чтобы низ чата удерживался даже при поздней дорисовке медиа.

## 2026-03-17

### Пагинация чата и history mode (финализация UX)

- В клиенте доведена гибридная пагинация текстового чата:
  - текущий режим загружает `50 -> 100 -> 150` сообщений,
  - после достижения границы включается history mode.
- Для history mode внедрено окно из `100` сообщений со сдвигом `50`, чтобы переходы были в формате перекрытия (`100-200 -> 150-250 -> 200-300`) вместо скачков целыми чанками.
- Логика выхода из history mode исправлена:
  - внизу history сначала работает обратная пагинация,
  - выход в текущий чат срабатывает только при достижении верхней границы текущего окна.
- Позиционирование при догрузке стабилизировано по `data-message-id` (якорный элемент), чтобы убрать отскоки скролла после загрузки следующей страницы.
- Переходы из закрепов/поиска используют якорение по `messageId` и стабильное центрирование целевого сообщения.
- На сервере пагинация сообщений закреплена на `id`-курсоре (вместо `createdAt`), что устраняет пропуски сообщений на границах страниц.
- Для владельца сервера отключён лимит отправки сообщений (`15/мин`) через bypass rate limiter на маршруте `messages.send`.

## 2026-03-16

### Жёсткая чистка репозитория и production-подготовка

- Репозиторий агрессивно сокращён до минимального рабочего состава под два сценария: Windows test build и production-запуск на Ubuntu 22.04.5 через Docker.
- Удалены лишние GitHub workflows, второстепенная документация, Nix/dev-only файлы, `packages/e2e`, старые helper-скрипты и прочий балласт, который не нужен для текущего OpenCord workflow.
- Полный брендинг `Sharkord -> OpenCord` доведён в оставшемся рабочем репозитории: package scopes, env-переменные, data paths, runtime/build naming и user-facing строки.
- `LICENSE` удалён из репозитория как ненужный файл старого проекта.
- Версия проекта снижена до `0.0.1` как стартовая точка уже очищенного OpenCord.

### Build и runtime слой

- `apps/server/build/build.ts`
  Multi-target release build ужат до Linux x64 production build.
- `apps/server/build/build-windows.ts`
  Оставлен отдельный Windows-only сценарий для тестовой пересборки `opencord-server.exe`.
- `apps/server/build/helpers.ts`
  Сборочный helper переведён на OpenCord naming и metadata; Windows metadata version синхронизирована с текущей версией `0.0.1`.
- `apps/server/src/utils/shutdown.ts`
  Добавлен единый graceful shutdown для штатного завершения `opencord-server.exe`, WebSocket/HTTP, voice runtimes и `mediasoup-worker`.
- `apps/server/src/utils/mediasoup.ts`
  Для Windows test build зафиксирован более безопасный localhost-only режим WebRTC, чтобы тестовый запуск не торчал наружу без необходимости.

### Документация и deployment

- `README.md`
  Полностью переписан как короткая русская точка входа для OpenCord, без хвостов Sharkord.
- `ONBOARDING.md`
  Добавлен отдельный подробный onboarding-документ для нового человека или нейронки, с упором на Windows test build, структуру репозитория и быстрый вход в рабочий контекст.
- `PROJECT_STRUCTURE.md`
  Добавлен отдельный обзорный документ по составу репозитория, чтобы новый человек мог быстро понять, где клиент, где сервер, где сборка и что реально участвует в Windows/Docker workflow.
- `docker-compose.yml`
  Добавлен минимальный production-first сценарий запуска OpenCord на Ubuntu 22.04.5 через Docker.
- `Dockerfile`, `docker-entrypoint.sh`
  Доведены до Docker-first production path.
- В README теперь явно описаны шаги развёртывания на Ubuntu 22.04.5, а также обязательные порты:
  - `4991/tcp` для веб-интерфейса
  - `40000/tcp` для WebRTC fallback
  - `40000/udp` для основного voice/media трафика

### Что подтверждено

- `bun run check-types`
  Проходит успешно по всему workspace.
- `apps/server/build/out/opencord-server.exe`
  Основной Windows test build пересобирается и используется как актуальный локальный артефакт.
- GitHub-репозиторий `OpenFunRus/OpenCord`
  Уже приведён к чистому OpenCord состоянию и используется как основной remote.

## 2026-03-13

Старт проекта `OpenCord`.

В качестве базы взят `Sharkord` версии `0.0.12`.
Ориентир по публичному релизу: `2026-03-06`.
Исходный проект: [Sharkord](https://github.com/Sharkord/sharkord).

## Что начато

- Начата переделка локализации: переход на схему `RU/EN`, где русский язык становится основным для `OpenCord`.
- Начат ребрендинг интерфейса: в пользовательских строках и заголовках стартовала замена `Sharkord` на `OpenCord`.
- Начата подготовка UI к дальнейшей переделке под более удобную web/mobile-версию.

## Что уже изменено

### Ядро локализации

- `apps/client/src/i18n/index.ts`
  Добавлен язык `ru`, русский сделан языком по умолчанию, список языков переведён в формат `RU/EN`.
- `apps/client/src/hooks/use-date-locale.ts`
  Обновлена логика выбора локали дат под новый язык.
- `apps/client/src/components/language-switcher/index.tsx`
  Переключатель языка адаптирован под корректную работу с `resolvedLanguage`.
- `apps/client/src/helpers/storage.ts`
  Ключ хранения языка перенесён на `opencord-language`, чтобы новый клиент не тянул старое языковое состояние от `Sharkord`.

### Новые русские словари

- `apps/client/src/i18n/locales/ru/common.json`
  Добавлены общие русские строки интерфейса.
- `apps/client/src/i18n/locales/ru/connect.json`
  Добавлены русские тексты экрана входа.
- `apps/client/src/i18n/locales/ru/disconnected.json`
  Добавлены русские тексты экрана отключения.
- `apps/client/src/i18n/locales/ru/sidebar.json`
  Добавлены русские тексты боковой панели и voice controls.
- `apps/client/src/i18n/locales/ru/topbar.json`
  Добавлены русские тексты верхней панели.
- `apps/client/src/i18n/locales/ru/dialogs.json`
  Добавлены русские тексты диалогов, поиска и команд плагинов.
- `apps/client/src/i18n/locales/ru/settings.json`
  Добавлены русские тексты настроек пользователя, сервера, ролей, хранилища и прав.

### Обновление английских словарей под OpenCord

- `apps/client/src/i18n/locales/en/common.json`
  Добавлены недостающие общие ключи, обновлены brand-aware строки под `OpenCord`.
- `apps/client/src/i18n/locales/en/connect.json`
  Обновлён текст загрузки приложения на `OpenCord`.
- `apps/client/src/i18n/locales/en/sidebar.json`
  Добавлены ключи для voice controls и навигации.
- `apps/client/src/i18n/locales/en/topbar.json`
  Добавлены ключи для настроек потока и громкости.
- `apps/client/src/i18n/locales/en/dialogs.json`
  Добавлены ключи для helper values и аргументов команд.
- `apps/client/src/i18n/locales/en/settings.json`
  Добавлены ключи для брендинга, профиля, логотипа, device controls и channel permissions.

### Экран входа и базовый брендинг

- `apps/client/src/screens/connect/index.tsx`
  Заменены видимые упоминания `Sharkord` на `OpenCord` на стартовом экране.
- `apps/client/src/components/routing/index.tsx`
  Обновлён `document.title` под бренд `OpenCord`.

### Первый вход и обязательное имя на сервере

- `apps/server/src/http/login.ts`
  Логика первого входа изменена: новый пользователь больше не получает автогенерируемое имя вида `SharkordUser12345`. Для первичной регистрации теперь обязательно передать желаемое отображаемое имя на сервере.
- `apps/client/src/screens/connect/index.tsx`
  На экране входа добавлен обязательный шаг: если пользователь входит впервые, показывается отдельное окно с запросом имени на сервере перед завершением регистрации.
- `apps/client/src/i18n/locales/ru/connect.json`
  Добавлены русские тексты для обязательного окна ввода имени на сервере и перевод ошибки обязательного имени.
- `apps/client/src/i18n/locales/en/connect.json`
  Добавлены английские тексты для обязательного окна ввода имени на сервере и fallback-перевод ошибки обязательного имени.
- `apps/server/src/http/__tests__/login.test.ts`
  Обновлены тесты первого входа, приглашений и регистрации под новый обязательный параметр имени.
- `apps/server/src/__tests__/helpers.ts`
  Тестовый helper логина расширен поддержкой параметра `name`.

### Поведение страницы входа

- `apps/client/src/screens/connect/index.tsx`
  При включённой галочке `Запомнить меня` логин теперь сохраняется в `localStorage` и автоматически подставляется при следующем открытии страницы входа. При отключённой галочке сохранённый логин очищается.

### Заголовок окна и брендирование вкладки

- `apps/client/index.html`
  Базовый title приложения заменён с `Sharkord` на `OpenCord`.
- `apps/client/src/features/app/actions.ts`
  Runtime-брендирование вкладки и mobile web app title переведено на постоянный заголовок `OpenCord`.
- `apps/client/src/components/routing/index.tsx`
  Убрана логика заголовка вида `<server name> - OpenCord`, чтобы после подключения вкладка тоже оставалась с названием `OpenCord`.

### Левая панель и дефолтные названия сервера

- `apps/client/src/components/left-sidebar/index.tsx`
  В левой панели добавлено отображаемое имя `OpenCord` для дефолтных названий сервера (`Sharkord Server`, `OpenCord Server`), чтобы существующие базы сразу выглядели в новом бренде без ручной правки БД.
- `apps/client/src/components/left-sidebar/categories.tsx`
  Для системных категорий добавлено отображаемое переименование через i18n: `Text Channels` -> `Текстовые каналы` / `Text Channels`, `Voice Channels` -> `Голосовые каналы` / `Voice Channels`.
- `apps/client/src/i18n/locales/ru/sidebar.json`
  Добавлены ключи `defaultTextChannels` и `defaultVoiceChannels` для русской боковой панели.
- `apps/client/src/i18n/locales/en/sidebar.json`
  Добавлены ключи `defaultTextChannels` и `defaultVoiceChannels` для английской боковой панели.
- `apps/server/src/db/seed.ts`
  Для новых баз дефолтное имя сервера изменено с `OpenCord Server` на `OpenCord`.

### Компоненты, переведённые с захардкоженных строк на i18n

- `apps/client/src/components/channel-view/voice/controls-bar.tsx`
  Переведены подписи кнопок voice controls.
- `apps/client/src/components/channel-view/voice/stream-settings-popover.tsx`
  Переведены подписи настроек потока и громкости.
- `apps/client/src/components/voice-provider/floating-pinned-card.tsx`
  Переведены действия закреплённой voice-card.
- `apps/client/src/components/plugin-slot-renderer/error-boundary.tsx`
  Переведены тексты ошибок плагинов и кнопка копирования деталей.
- `apps/client/src/components/paginated-list/index.tsx`
  Переведены поиск, пагинация и пустые состояния.
- `apps/client/src/components/date-picker/index.tsx`
  Переведены тексты выбора даты, форматирование дат сделано языко-зависимым.
- `apps/client/src/components/image-picker/index.tsx`
  Переведены подписи изображения и удаления.
- `apps/client/src/components/channel-view/text/overrides/image.tsx`
  Переведена ссылка открытия изображения в новой вкладке.
- `apps/client/src/components/tiptap-input/plugins/mentions/suggestion.tsx`
  Переведена accessibility-подпись списка упоминаний.
- `apps/client/src/components/dialogs/plugin-commands/args.tsx`
  Переведены placeholder и булевы значения аргументов.
- `apps/client/src/components/dialogs/plugin-commands/helpers.tsx`
  Переведены helper values в командах плагинов.

### Профиль, настройки устройств и логотип

- `apps/client/src/components/server-screens/user-settings/profile/banner-manager.tsx`
  Переведены действия баннера и уведомления.
- `apps/client/src/components/server-screens/user-settings/profile/avatar-manager.tsx`
  Переведены действия аватара и уведомления.
- `apps/client/src/components/server-screens/user-settings/devices/resolution-fps-control.tsx`
  Переведены подписи разрешения и частоты кадров.
- `apps/client/src/components/server-screens/user-settings/devices/microphone-test-level-bar.tsx`
  Переведена accessibility-подпись шумового порога.
- `apps/client/src/components/server-screens/user-settings/devices/index.tsx`
  Переведён пункт `Auto` в выборе кодека.
- `apps/client/src/components/server-screens/server-settings/general/logo-manager.tsx`
  Переведены действия логотипа и стартована подготовка к дальнейшему ребрендингу логотипа.

### Права и разрешения

- `apps/client/src/components/server-screens/channel-settings/permissions/channel-permission-list.tsx`
  Переведены названия и описания channel permissions через i18n.
- `apps/client/src/components/permissions-list/index.tsx`
  Переведены badge-списки прав и подпись `+N more`.

### Дополнительные фиксы после первой тестовой сборки

- `apps/client/src/i18n/index.ts`
  Убрано влияние языка браузера на первый запуск `OpenCord`: теперь новый клиент стартует на `RU`, если язык ещё не выбирался вручную.
- `apps/client/src/components/tiptap-input/plugins/mentions/suggestion.tsx`
  Исправлен импорт `i18n`, который ломал production build клиента.

### Сборка Windows `.exe`

- `apps/server/build/build-windows.ts`
  Добавлен отдельный Windows-only build-скрипт для тестовой сборки `OpenCord.exe`, чтобы не упираться в сборку Linux/macOS таргетов. Позже скрипт обновлён: дефолтный выходной файл теперь `opencord-server.exe`, а перед сборкой выполняется принудительный `taskkill /F /T /IM opencord-server.exe`, чтобы пересборка не падала на lock/`EPERM`.
- `apps/server/build/helpers.ts`
  В Windows compile-сборку добавлена подстановка иконки `.exe` через `Bun --windows-icon`, а также metadata `OpenCord` для Windows-бинаря.
- `apps/server/build/out/opencord-windows-x64.exe`
  Собран первый тестовый Windows-бинарь `OpenCord`.
- `apps/server/build/out/opencord-windows-x64-first-login-name.exe`
  Собрана отдельная тестовая Windows-сборка с новой логикой обязательного имени при первом входе.
- `apps/server/build/out/opencord-server.exe`
  Собран основной Windows-бинарь с актуальным именем файла для локальной работы и повторных пересборок. После обновления build-скрипта подтверждена рабочая пересборка с принудительным `taskkill` перед заменой файла.
- `apps/server/build/out/release.json`
  Сгенерирована metadata-информация по собранному Windows-артефакту.

### Иконки и бренд-ассеты

- `apps/client/public/logo.webp`
  Перерисован основной логотип `OpenCord`.
- `apps/client/public/icon-192.png`
  Обновлена иконка приложения 192x192.
- `apps/client/public/icon-512.png`
  Обновлена иконка приложения 512x512.
- `apps/client/public/icon-1024.png`
  Подготовлена крупная версия иконки для бренд-ассетов и дальнейших экспортов.
- `apps/client/public/favicon.ico`
  Обновлён favicon и источник иконки для Windows `.exe`.

### Основной экран и мобильный shell

- `apps/client/src/screens/server-view/index.tsx`
  Главный shell переведён в монолитный full-screen режим без карточного разреза. Добавлены верхние кнопки показа/скрытия левого и правого меню, убрана swipe-навигация, настроены единые анимации открытия/закрытия боковых панелей, зафиксировано поведение по брейкпоинтам: на мобильных экранах оба меню по умолчанию закрыты, на desktop левая панель открыта, правая восстанавливается из сохранённого состояния. Также добавлены корректные слои `z-index`: шапка выше боковых панелей и центрального контента.
- `apps/client/src/components/top-bar/index.tsx`
  Верхняя шапка переделана под мобильный и desktop shell: поиск `Поиск по содержимому` теперь остаётся доступным и на мобильной версии, а левая кнопка меню визуально приведена к той же логике, что и правая, с зеркальной иконкой.
- `apps/client/src/components/top-bar/server-search.tsx`
  Поисковый контрол адаптирован под узкую ширину мобильной шапки без выпадения из layout.
- `apps/client/src/components/resizable-sidebar/index.tsx`
  Уточнены transition-правила ширины/границ, чтобы левая и правая панели закрывались и открывались одинаково плавно.
- `apps/client/src/screens/server-view/content-wrapper.tsx`
  Пустое состояние центральной области обновлено: теперь на мобильной и desktop версии отображается текст `Добро пожаловать в OpenCord`, убраны упоминания `Sharkord`, удалён красный mobile warning и инструкции про свайпы, вместо этого добавлена нейтральная подсказка про кнопки, которые позволяют показывать или скрывать списки каналов и участников.
- `apps/client/src/i18n/locales/ru/common.json`
  Обновлена русская подсказка для мобильного shell: формулировка изменена на `показывать или скрывать`.
- `apps/client/src/i18n/locales/en/common.json`
  Английская версия той же подсказки синхронизирована с новым поведением shell.
- `apps/client/src/index.css`
  Все scrollbars переведены в более тонкий тёмный стиль, ближе к визуальному языку Tabler.
- Поведение mobile-меню
  На мобильной версии после выбора текстового или голосового канала боковые меню автоматически закрываются, чтобы фокус сразу возвращался в центральный чат.
- `apps/client/src/components/channel-view/text/message.tsx`
  Hover сообщений и выделение упоминаний переведены на более tabler-like сине-сланцевый стиль вместо старых нейтральных/коричневых акцентов.
- `apps/client/src/components/channel-view/text/message-actions.tsx`
  Облако быстрых действий сообщения (`reply`, `edit`, `delete`, `pin`, реакции) приведено к единому тёмному стилю; из внутреннего hover у кнопок убраны лишние дефолтные серые/синие подложки.
- `apps/client/src/components/message-compose/index.tsx`
  Правая группа кнопок в composer (`emoji`, `attach`, `send`) получила постоянную tabler-like подложку и корректный hover без возврата к базовому серому `ghost`.
- `apps/client/src/components/tiptap-input/index.tsx`
  Обновлены цвета рамки editor input, кнопки emoji и expand/collapse в стиле основного shell.
- `apps/client/src/components/emoji-picker/index.tsx`
  Emoji picker перекрашен под OpenCord dark shell.
- `apps/client/src/components/emoji-picker/native-emoji-tab.tsx`
  Панель категорий emoji и её hover-состояния переведены на tabler-like тёмный фон вместо серого.
- `apps/client/src/components/emoji-picker/custom-emoji-tab.tsx`
  Пустое состояние и подписи custom emoji синхронизированы с новым тёмным стилем picker-а.
- `apps/client/public/twemoji`
  В проект добавлен локальный emoji-pack на базе `Twemoji`-совместимых ассетов, чтобы стандартные emoji больше не зависели от системных шрифтов Windows и не рендерились квадратами.
- `apps/client/src/components/emoji-picker/emoji-data.ts`
  Стандартный emoji dataset переведён на локальные fallback-картинки из `Twemoji`, добавлены дедупликация и стабильные ключи для picker-сетки.
- `apps/client/src/helpers/message-emojis.tsx`
  Добавлен общий helper для канонизации emoji в сообщениях: стандартные emoji перед отправкой сохраняются как Unicode-текст, кастомные emoji как текстовые токены `:name:`, а на рендере обе категории снова отображаются локальными картинками.
- `apps/client/src/components/channel-view/text/renderer/index.tsx`
  Рендерер сообщений научен отображать emoji из канонического текста и подменять copy-to-clipboard на текстовый формат, чтобы emoji снова можно было копировать из чата и вставлять обратно в composer.
- `apps/client/src/components/channel-view/text/index.tsx`
  Обычная отправка сообщений переведена на каноническую emoji-модель перед `prepareMessageHtml`, чтобы новые сообщения сохранялись в виде, пригодном для повторной вставки и дальнейшей миграции.
- `apps/client/src/components/thread-sidebar/thread-compose.tsx`
  Та же канонизация emoji применена и для ответов в тредах.
- `apps/client/src/components/thread-sidebar/index.tsx`
  Треды больше не открываются отдельной правой колонкой: `ThreadSidebar` переведён в режим полного overlay поверх центрального канала, чтобы при входе в тред пользователь видел отдельный экран поверх `#GeneralChat` с тем же header и крестиком закрытия.
- `apps/client/src/screens/server-view/content-wrapper.tsx`
  Overlay треда встроен внутрь центральной области `main`, поэтому тред накрывает именно содержимое канала, а не весь shell целиком и не конфликтует с левым/правым меню.
- `apps/client/src/components/channel-view/text/message-edit-inline.tsx`
  Inline-редактирование сообщений синхронизировано с новой моделью хранения emoji, чтобы после правки сообщения не возвращались к старому HTML-only формату.
- `apps/client/src/features/server/hooks.ts`
  Plugin API `sendMessage()` также переведён на тот же канонический формат emoji, чтобы плагины не обходили новую логику сохранения сообщений.
- `apps/client/src/components/dialogs/search/index.tsx`
  Окно `Поиск по содержимому` приведено к той же палитре: новый header, input, empty-state и pagination-зоны.
- `apps/client/src/components/dialogs/confirm-action/index.tsx`
  Универсальное окно подтверждения действий переведено на tabler-like тёмный стиль: обновлены фон, рамки, типографика и кнопки; для destructive-сценариев подтверждение теперь может отображаться в более заметном danger-цвете.
- `packages/ui/src/components/sonner.tsx`
  Глобальные toast-уведомления переведены на tabler-like dark палитру, чтобы `success`, `error`, `warning`, `info` и обычные уведомления использовали единый OpenCord-стиль хотя бы по цветам и границам.
- `apps/client/src/components/dialogs/search/search-result-message.tsx`
  Карточки найденных сообщений обновлены под текущий tabler-like стиль.
- `apps/client/src/components/dialogs/search/search-result-file.tsx`
  Карточки файлов из поиска также приведены к той же палитре.
- `apps/client/src/features/server/messages/helpers.ts`
  Highlight сообщения после перехода из поиска заменён на синий tabler-like акцент вместо старого дефолтного фона.
- `apps/client/src/helpers/get-avatar-fallback-style.ts`
  Добавлен helper для детерминированного выбора fallback-цвета аватарки по нику пользователя.
- `apps/client/src/components/user-avatar/index.tsx`
  Стандартные аватарки пользователей теперь получают устойчивый цвет по нику, ближе по ощущению к Discord.
- `apps/client/src/components/server-screens/channel-settings/permissions/overrides-list.tsx`
  Те же fallback-цвета аватарок применены и в списках пользователей внутри настроек прав канала.
- `apps/client/src/components/left-sidebar/user-control.tsx`
  Кнопки `микрофон`, `наушники`, `настройки` в блоке пользователя переведены на тот же tabler-like hover без серого фона.
- `apps/client/src/components/top-bar/index.tsx`
  Верхние кнопки показа/скрытия левого и правого меню, а также кнопка voice chat получили принудительную tabler-like подложку и hover без возврата к серому базовому стилю.
- `apps/client/src/components/top-bar/server-search.tsx`
  Из строки `Поиск по содержимому` убрана подсказка `Ctrl+K`, так как этот shortcut не должен отображаться пользователю.
- `apps/client/src/components/left-sidebar/voice-control.tsx`
  Кнопки voice control после подключения (`Отключиться`, камера, шаринг экрана) приведены к принудительному tabler-like hover без серого фона.
- `apps/client/src/components/left-sidebar/server-dropdown.tsx`
  Кнопка и popover настроек сервера обновлены: меню теперь открывается по иконке-шестерёнке и использует тёмную tabler-like палитру без серого фона.
- `apps/client/src/components/user-popover/index.tsx`
  Карточка пользователя по клику переведена на tabler-like dark стиль: обновлены фон, рамки, баннерная шапка, статусная зона и кнопки быстрых действий.
- `apps/client/src/components/role-badge/index.tsx`
  Таблетки ролей/групп пользователя получили более строгий тёмный стиль с аккуратной рамкой и цветовым акцентом роли вместо старого базового badge-вида.
- `apps/client/src/components/channel-view/voice/index.tsx`
  Экран голосового канала переведён на tabler-like фон и пустое состояние, чтобы voice-view визуально совпадал с новым full-screen shell.
- `apps/client/src/components/channel-view/voice/voice-grid.tsx`
  Сетка и pinned-layout голосового канала обновлены: увеличены отступы, нижняя лента карточек и разделители переведены на ту же тёмную палитру.
- `apps/client/src/components/channel-view/voice/voice-user-card.tsx`
  Карточки участников голосового канала получили новый tabler-like контейнер, обновлённую нижнюю подпись и цветовые индикаторы микрофона/камеры/шаринга.
- `apps/client/src/components/channel-view/voice/external-stream-card.tsx`
  Карточки внешних потоков приведены к той же dark-палитре, включая контейнер, фон видеопотока и нижнюю информационную панель.
- `apps/client/src/components/channel-view/voice/screen-share-card.tsx`
  Карточка screen share синхронизирована с новым voice-стилем: обновлены фон, подпись, zoom-индикатор и нижняя overlay-панель.
- `apps/client/src/components/channel-view/voice/card-controls.tsx`
  Hover-панель карточных действий (`pin`, `volume`, `zoom`, `settings`) собрана в отдельный tabler-like floating bar вместо старого набора голых иконок.
- `apps/client/src/components/channel-view/voice/control-toggle-button.tsx`
  Базовый стиль toggle-кнопок голосового overlay обновлён под OpenCord: тёмная подложка, единая рамка и цветовые active-состояния без серого фона.
- `apps/client/src/components/channel-view/voice/controls-bar.tsx`
  Нижняя панель управления звонком (`mic`, `camera`, `share`, `disconnect`) приведена к единому tabler-like виду с обновлёнными hover/active-состояниями.
- `apps/client/src/components/channel-view/voice/stream-settings-popover.tsx`
  Popover настроек отдельного потока теперь использует ту же тёмную палитру, что и остальная voice-зона.
- `apps/client/src/components/top-bar/voice-options-controller.tsx`
  Окно voice options в верхней панели переведено на tabler-like dark стиль вместе с кнопкой открытия и блоками переключателей.
- `apps/client/src/components/top-bar/volume-controller.tsx`
  Общий popover управления громкостью удалённых потоков обновлён под OpenCord: тёмный контейнер, новые кнопки и строки потоков.
- `apps/client/src/components/channel-view/voice/volume-button.tsx`
  Локальный volume popover на карточках участников/потоков синхронизирован с общим тёмным стилем voice UI.
- `apps/client/src/components/channel-view/voice/pin-button.tsx`
  Кнопка закрепления карточек получила tabler-like inactive/active состояния без возврата к стандартным UI-вариантам.
- `apps/client/src/components/left-sidebar/stats-popover.tsx`
  Окно статистики голосового транспорта переведено на ту же dark-палитру, чтобы всплывающее окно после подключения к voice не выбивалось из общего стиля.
- `apps/client/src/components/voice-chat-sidebar/index.tsx`
  Чат голосового канала больше не открывается узкой боковой колонкой: `VoiceChatSidebar` переведён в режим полного overlay поверх центральной области, по аналогии с тредами, с сохранением штатного закрытия через кнопку в header.
- `apps/client/src/screens/server-view/content-wrapper.tsx`
  Overlay голосового чата перенесён внутрь центрального `main`, поэтому при открытии chat-view из voice channel он теперь занимает всю рабочую область контента, а не только часть shell рядом с правой панелью.
- `apps/client/src/screens/server-view/index.tsx`
  Отдельная внешняя колонка `VoiceChatSidebar` удалена из корневого server shell, чтобы voice chat overlay рендерился строго внутри основной области контента.
- `apps/client/src/components/channel-view/voice/pin-button.tsx`
  У кнопки `pin` в карточках голосового канала убран лишний локальный фон/обводка, чтобы иконка не выглядела как отдельный кружок поверх общей панели действий.
- `apps/client/src/components/channel-view/text/pinned-messages-popover.tsx`
  Кнопка и окно закреплённых сообщений переведены на tabler-like dark стиль: обновлены trigger, контейнер popover, карточки pinned-сообщений и кнопка перехода к сообщению.
- `apps/client/src/components/user-popover/index.tsx`
  Кнопка перехода в личный чат внутри карточки пользователя больше не отображается как голая иконка: она переведена в явный tabler-like button с иконкой и подписью.
- `apps/client/src/components/role-badge/index.tsx`
  Таблетки ролей дополнительно доработаны под OpenCord-стиль: смягчён фон, обновлена рамка и добавлен цветовой индикатор роли внутри badge.
- `apps/client/src/components/channel-view/text/text-top-bar.tsx`
  Заголовок direct message больше не захардкожен на английском: `Direct Message` переведён через i18n и корректно отображается в `RU/EN`.
- `apps/server/src/db/seed.ts`
  Стартовое наполнение сервера переориентировано под OpenCord: при первом запуске создаются текстовые каналы `OpenCord` и `Главный`, голосовые каналы `OpenCord` и `Общий`, а также системный пользователь `OpenCord`, который публикует приветственное русскоязычное сообщение в первый текстовый канал.
- `apps/server/src/http/login.ts`
  Старый owner-onboarding через секретный токен заменён на автоматическую логику: первый реально зарегистрированный пользователь получает роль `Создатель` (`OWNER_ROLE_ID`) автоматически, а все последующие пользователи регистрируются без owner-прав, пока их не назначат вручную.
- `apps/server/src/routers/others/use-secret-token.ts`
  Система повышения прав через secret token отключена: route больше не выдаёт owner-права и возвращает явное сообщение, что в OpenCord роль создателя назначается первому зарегистрированному пользователю.
- `apps/client/src/features/server/actions.ts`
  Старый debug-hook `window.useToken()` синхронизирован с новой логикой и больше не обещает включение owner-режима через секретный токен.
- `apps/server/src/http/__tests__/login.test.ts`
  Добавлен тест на автоматическую выдачу owner-роли первому зарегистрированному пользователю при отсутствии текущего owner.
- `apps/server/src/routers/__tests__/others.test.ts`
  Тесты secret token обновлены под новую модель: и невалидный, и валидный токен теперь корректно отклоняются, потому что token-onboarding отключён.
- `apps/client/src/components/server-screens/user-settings/index.tsx`
  Модалка настроек пользователя дополнительно ужата до более строгого и почти квадратного формата: уменьшена ширина, ослаблены декоративные эффекты, табы сделаны более прямоугольными и плотными, а внутренние `card/button/input/select/textarea/switch/alert` приведены к более строгому Tabler-подобному стилю с квадратными углами и едиными рамками.
- `apps/client/src/components/server-screens/user-settings/index.tsx`
  Из заголовка модалки убрано дополнительное описание, а внутренний контейнер получил ещё более жёсткие OpenCord/Tabler-override-стили для `focus`, `select-item`, `switch`, `slider` и интерактивных состояний, чтобы избавиться от серых стандартных акцентов внутри user settings.
- `apps/client/src/components/server-screens/user-settings/profile/banner-manager.tsx`
  Баннер профиля сделан адаптивным: вместо жёсткой фиксированной ширины используется responsive-блок с контролируемым соотношением сторон и tabler-like overlay при наведении.
- `apps/client/src/components/server-screens/user-settings/devices/index.tsx`
  Экран устройств существенно доработан по responsiveness: убраны фиксированные ширины у `Вывод звука`, `Микрофон`, `Webcam`, `Codec`, `Slider`, перестроены switch-блоки и тестовые секции под мобильные колонки, а серые кнопки теста/предпросмотра/сохранения заменены на tabler-like состояния.
- `apps/client/src/components/server-screens/user-settings/devices/resolution-fps-control.tsx`
  Блок выбора `Resolution / FPS` переведён с жёсткой горизонтальной раскладки на responsive-grid, чтобы селекты не ломали модалку на мобильной ширине.
- `apps/client/src/components/server-screens/user-settings/profile/index.tsx`
  Кнопки `Сохранить` / `Отмена` в профиле переведены на адаптивную tabler-like раскладку и стиль.
- `apps/client/src/components/server-screens/user-settings/password/index.tsx`
  Кнопки `Сохранить` / `Отмена` в смене пароля также приведены к адаптивному tabler-like виду.
- `packages/ui/src/components/select.tsx`
  Базовый `Select` для OpenCord дополнительно очищен от серых дефолтных состояний: popup-меню, label и highlighted item теперь используют tabler-like тёмно-синий стиль вместо стандартного серого фона.
- `apps/client/src/components/server-screens/user-settings/devices/microphone-test-level-bar.tsx`
  База полосы проверки микрофона переведена с серого `muted`-тона на tabler-like тёмно-синий фон, а порог noise gate оформлен в более подходящий акцентный оттенок.
- `apps/client/src/components/server-screens/server-settings/index.tsx`
  Настройки сервера переведены со старого full-screen `ServerScreenLayout` на полноценную modal-shell архитектуру по образцу user settings: blur overlay, tabler-like header, прямоугольные responsive-tabs и единый набор OpenCord-override-стилей для `card/button/input/select/slider/switch/textarea/alert`.
- `apps/client/src/components/server-screens/server-settings/general/index.tsx`
  Блок общих настроек сервера получил адаптивный tabler-like footer с новыми кнопками `Сохранить / Отмена`.
- `apps/client/src/components/server-screens/server-settings/storage/index.tsx`
  Storage-настройки стали адаптивнее: секции с лимитами и overflow-action больше не завязаны на жёсткие ширины, а нижние action-кнопки приведены к новому tabler-like формату.
- `apps/client/src/components/server-screens/server-settings/storage/storage-size-control.tsx`
  Контрол лимитов storage переработан под мобильную ширину: slider, число и preset-кнопки теперь корректно переносятся и не ломают layout модалки.
- `apps/client/src/components/server-screens/server-settings/updates/index.tsx`
  Раздел обновлений приведён к тому же responsive/footer-стилю, что и остальные секции серверной модалки.
- `apps/client/src/components/server-screens/server-settings/roles/index.tsx`
  Экран ролей теперь адаптивен: layout переведён с жёсткой горизонтальной схемы на responsive `column -> row`.
- `apps/client/src/components/server-screens/server-settings/roles/roles-list.tsx`
  Список ролей стилизован под OpenCord/Tabler: новые состояния выбора, hover и кнопка добавления роли.
- `apps/client/src/components/server-screens/server-settings/roles/update-role.tsx`
  Редактор роли стал адаптивнее и строже: action-иконки, цветовые поля и footer-кнопки приведены к новому modal-style.
- `apps/client/src/components/server-screens/server-settings/invites/index.tsx`
  Заголовок раздела инвайтов и кнопка создания инвайта сделаны responsive и tabler-like.
- `apps/client/src/components/server-screens/server-settings/plugins/index.tsx`
  Раздел плагинов получил более строгую tabler-like стилизацию карточек, кнопок, пустых состояний и responsive-layout для action-групп.
- `apps/client/src/components/server-screens/server-settings/emojis/index.tsx`
  Экран эмодзи переведён на адаптивную раскладку `column -> row`, чтобы не ломаться внутри модалки на узких размерах.
- `apps/client/src/components/paginated-table/index.tsx`
  Общая paginated-table, используемая в серверных настройках, приведена к tabler-like цветам и получила горизонтальный scroll-safe контейнер для узких экранов.
- `apps/client/src/components/server-screens/server-settings/users/table-user.tsx`
  Строки таблицы пользователей и action-кнопка обновлены под tabler-like hover и тёмные состояния без серых дефолтов.
- `apps/client/src/components/server-screens/server-settings/invites/table-invite.tsx`
  Строки таблицы инвайтов, кнопка копирования и action-menu также приведены к новой tabler-like palette.
- `apps/client/src/components/server-screens/server-settings/index.tsx`
  Вкладка `Обновления` полностью убрана из server settings modal, так как OpenCord переходит на собственную систему обновлений и больше не показывает встроенный auto-update UI.
- `apps/client/src/features/server/admin/hooks.ts`
  Клиентские admin-hooks для проверки/запуска обновления сервера (`useAdminUpdates`, `useHasUpdates`) удалены вместе с привязкой к старому updater flow.
- `apps/server/src/routers/others/index.ts` и `apps/server/src/index.ts`
  Серверный updater flow отключён на уровне runtime и router: удалены `getUpdate/updateServer` из `othersRouter`, а автоподключение `./utils/updater` при старте сервера убрано.
- `apps/server/src/routers/others/get-update.ts`, `apps/server/src/routers/others/update-server.ts`, `apps/server/src/utils/updater.ts`, `apps/client/src/components/server-screens/server-settings/updates/index.tsx`
  Старые файлы встроенной системы обновлений удалены из проекта, чтобы OpenCord больше не содержал legacy-механику server auto-update.
- `packages/ui/src/components/dropdown-menu.tsx`
  Базовый dropdown menu очищен от серых фонов: popup, hover и destructive-state переведены в tabler-like тёмно-синюю палитру, что сразу исправило меню с `тремя точками` в таблицах.
- `apps/client/src/components/server-screens/server-settings/storage/metrics.tsx`
  Блок дисковой статистики в `Хранилище` переработан под tabler-like вид: новая карточка метрик, синяя шкала использования и тёмный фон без стандартного серого оформления.
- `apps/client/src/components/server-screens/server-settings/emojis/emoji-list.tsx`
  Кнопка `плюс` в списке эмодзи и состояние выбранных элементов приведены к tabler-like стилю, серый hover убран.
- `apps/client/src/components/server-screens/server-settings/emojis/upload-emoji.tsx`
  Основная кнопка `Загрузить эмодзи` теперь оформлена в фирменной OpenCord/Tabler палитре вместо стандартного серого варианта.
- `apps/client/src/components/server-screens/server-settings/users/table-user.tsx`
  В таблице пользователей дополнительно ограничена длинная bio-подпись, чтобы системный текст OpenCord не ломал ширину строки, а кнопка `три точки` переведена на жёсткий tabler-like hover без серого ghost-фона.
- `apps/client/src/components/server-screens/server-settings/roles/roles-list.tsx`
  Кнопка `+` в ролях теперь использует принудительный tabler-like hover через `!bg`, чтобы полностью убрать серый ghost-эффект.
- `apps/client/src/components/server-screens/server-settings/emojis/emoji-list.tsx`
  Кнопка `+` в эмодзи также переведена на принудительный tabler-like hover без серой подложки.
- `apps/client/src/components/image-picker/index.tsx`
  Базовый `ImagePicker`, который используется в логотипе сервера, сделан адаптивным: вместо фиксированного `80x24` блока теперь используется responsive-контейнер с контролируемым aspect-ratio и tabler-like overlay.
- `apps/client/src/components/mod-view-sheet/index.tsx`, `apps/client/src/components/mod-view-sheet/mod-view-content.tsx`, `apps/client/src/components/mod-view-sheet/header.tsx`
  Модерация пользователя больше не открывается боковым sheet: теперь это отдельная вложенная tabler-like модалка поверх `Server Settings`, с тем же moderation-flow, blur-overlay и унифицированными action-кнопками.
- `apps/client/src/components/server-screens/server-settings/index.tsx`
  Родительская модалка `Server Settings` больше не схлопывается при открытии вложенных dialog-окон (`moderate user`, `create invite`, `delete user`, confirm-dialog), поэтому вложенные сценарии редактирования теперь работают поверх неё, а не вместо неё.
- `apps/client/src/components/dialogs/create-invite-dialog/index.tsx`
  Окно создания приглашения переведено в tabler-like nested modal: новый header/footer, тёмная палитра OpenCord, responsive-ширина и корректное открытие поверх текущих настроек сервера.
- `apps/client/src/components/dialogs/delete-user/index.tsx`
  Удаление пользователя переведено в полноценную tabler-like destructive modal без промежуточного confirm-step, чтобы удаление открывалось поверх текущего окна и выглядело консистентно с остальными nested dialog-сценариями.
- `apps/client/src/components/server-screens/server-settings/invites/table-invite.tsx`
  Копирование ссылки приглашения теперь работает и в локальной HTTP-сборке: добавлен fallback через временный `textarea`/`execCommand`, а кнопки copy/menu/delete приведены к ожидаемому tabler-like поведению внутри модалки приглашений.
- `apps/client/src/components/mod-view-sheet/server-activity/index.tsx`, `apps/client/src/components/mod-view-sheet/details/index.tsx`, `apps/client/src/components/mod-view-sheet/server-activity/messages.tsx`, `apps/client/src/components/mod-view-sheet/server-activity/links.tsx`
  Внутренний контент модерации пользователя дополнительно очищен от legacy-стилей Sharkord: карточки, строки активности, детальные поля, вложенные списки сообщений/ссылок и скрывающие action-кнопки теперь оформлены в общей tabler-like палитре OpenCord.
- `apps/client/src/components/dialogs/confirm-action/index.tsx`, `apps/client/src/components/dialogs/text-input/index.tsx`, `apps/client/src/components/dialogs/delete-user/index.tsx`
  Nested confirm/text/destructive dialogs внутри модерации приведены к единому modal-style OpenCord: убраны смешанные радиусы, добавлены tabler-like header/footer, корректный `overflow-hidden` и консистентные destructive/info-кнопки.
- `apps/client/src/components/server-screens/server-settings/invites/table-invite.tsx`, `apps/client/src/i18n/locales/ru/settings.json`, `apps/client/src/i18n/locales/en/settings.json`
  Копирование invite-link усилено повторно: ссылка теперь формируется от фактического `window.location`, а текст уведомления уточнён, чтобы UI явно сообщал именно о копировании полной ссылки приглашения, а не одного кода.
- `apps/client/src/components/dialogs/assign-role/index.tsx`
  Окно `Назначить роль` приведено к тому же tabler-like nested modal-style, что и остальные server-settings dialogs: новый header/footer, тёмная палитра OpenCord, корректные select/alert-состояния и единые action-кнопки.
- `apps/client/src/components/server-screens/server-settings/invites/table-invite.tsx`
  Invite-copy упрощён до более надёжной схемы: теперь ссылка собирается напрямую через `protocol + host + /?invite=...`, а fallback-копирование дополнительно форсирует `focus/select`, чтобы работать стабильнее в локальной HTTP-среде OpenCord.
- `apps/client/src/components/server-screens/server-settings/invites/table-invite.tsx`
  Clipboard fallback для invite-link усилен ещё раз: вместо слепого доверия `execCommand('copy')` теперь сначала используется явный `copy` event с `clipboardData.setData('text/plain', ...)`, и только затем textarea-reserve, чтобы исключить ложные toast-успехи при пустом буфере обмена.
- `apps/client/src/components/date-picker/index.tsx`
  `DatePicker`, используемый в создании приглашения, приведён к tabler-like виду: input, календарная кнопка, popover и dropdown-календарь теперь используют палитру OpenCord вместо стандартного light/default оформления.
- `apps/client/src/components/dialogs/create-channel/index.tsx`
  Модалка создания канала переведена на единый nested modal-style OpenCord: новый header/footer, строгие tabler-like кнопки, тёмные input-поля и переработанные карточки выбора текстового/голосового типа канала.
- `apps/client/src/components/dialogs/create-category/index.tsx`
  Модалка добавления категории также переведена на tabler-like nested modal-shell, чтобы сценарий `Добавить категорию` визуально совпадал с остальными системными окнами OpenCord.
- `packages/ui/src/components/context-menu.tsx`
  Базовый `ContextMenu` для правого клика по каналам переведён на ту же tabler-like палитру, что и dropdown/open menus: popup, label, separator, hover и destructive-state больше не используют серый стандартный фон.
- `apps/client/src/components/channel-view/text/hooks/use-scroll-controller.ts`, `apps/client/src/components/channel-view/text/index.tsx`, `apps/client/src/i18n/locales/ru/common.json`, `apps/client/src/i18n/locales/en/common.json`
  В обычном текстовом чате добавлена плавающая кнопка прокрутки вниз в стиле Discord/OpenCord, а отправка собственного сообщения теперь принудительно возвращает пользователя вниз даже если он был наверху истории.
- `apps/client/src/components/left-sidebar/hooks.ts`, `apps/client/src/features/server/channels/actions.ts`
  Исправлен баг переключения из текстового окна голосового канала в обычный канал: при смене выбранного канала voice text overlay теперь закрывается централизованно, и основной чат открывается сразу без зависшего поверх слоя.
- `apps/client/src/features/server/channels/actions.ts`, `apps/client/src/components/left-sidebar/hooks.ts`
  После регрессионной проверки логика закрытия voice text overlay сделана снова локальной, а не глобальной: это вернуло нормальный вход в голосовые каналы по клику и сохранило фикс переключения из voice text overlay в обычный текстовый канал.
- `apps/client/src/components/channel-view/text/index.tsx`
  Scroll-area текстового канала возвращён в корректный `min-h-0` layout, чтобы область сообщений снова прокручивалась нормально и не растягивала экран вниз до исчезновения поля ввода.
- `apps/client/src/components/server-screens/channel-settings/index.tsx`
  `Изменить канал` из контекстного меню теперь открывается в tabler-like модальном окне OpenCord вместо бокового server-screen, с новой modal-оболочкой, tab-navigation и общей тёмной палитрой.
- `apps/client/src/components/pin-action-button.tsx`
  Добавлен единый tabler-like `pin`-button с собственным clean `push pin` glyph без круглого артефакта, чтобы закрепление во всех сценариях выглядело одинаково и не зависело от проблемного стандартного значка.
- `apps/client/src/components/channel-view/voice/pin-button.tsx`
  Voice-карточки переведены на общий `pin`-button, поэтому закрепление в голосовом канале сохраняет привычный вид `pin`, но больше не рисует лишний кружок за значком.
- `apps/client/src/components/channel-view/text/message-actions.tsx`
  Кнопка закрепления сообщений в обычных текстовых каналах, текстовом чате голосового канала и тредах теперь использует тот же общий `pin`-button, поэтому все `pin`-действия в action-bar отображаются как полноценные кнопки OpenCord.
- `apps/client/src/components/channel-view/text/message-actions.tsx`
  `Pin` в hover-облачке над обычным текстовым сообщением дополнительно упрощён по визуалу: вместо отдельной tabler-like кнопочной подложки он теперь отображается как чистая иконка в одном стиле с `reply/edit/delete`, сохраняя только цвет активного состояния.
- `apps/client/src/components/channel-view/text/pinned-messages-popover.tsx`
  Trigger закреплённых сообщений и служебный значок в блоке `Pinned by` также переведены на тот же `pin`-стиль для полной консистентности всех pin-сценариев.
- `apps/server/src/http/public.ts`, `apps/server/src/db/queries/messages.ts`, `apps/server/src/db/queries/files.ts`, `apps/server/src/routers/messages/search.ts`
  В простом защитном варианте все файлы, прикреплённые к сообщениям каналов, теперь всегда прячутся за `accessToken`: токен больше не зависит от `private/public`, поэтому прямой доступ по URL без параметра заблокирован и для обычных текстовых каналов. При этом аватарки, баннеры, эмодзи и прочие не-message файлы пока оставлены публичными, чтобы не усложнять архитектуру.
- `apps/server/src/http/__tests__/public.test.ts`
  Серверные тесты `/public` обновлены под новую схему доступа: отдельно проверяются public/private channel attachments, корректная работа `Content-Disposition`, `Range` и `404`-сценариев при обязательном `accessToken`.
- `apps/client/src/components/tiptap-input/index.tsx`, `apps/client/src/components/tiptap-input/plugins/mentions/index.ts`, `apps/client/src/components/tiptap-input/plugins/mentions/suggestion.tsx`, `apps/client/src/features/server/users/selectors.ts`, `apps/client/src/features/server/users/hooks.ts`
  Для OpenCord добавлен Discord-like MVP упоминаний по `@`: в общем редакторе сообщений заработал единый mention-flow для обычного чата, тредов и inline-редактирования, dropdown пользователей стал искать и по публичному имени, и по логину/identity, а в список упоминаний теперь попадает и собственный пользователь, чтобы сценарий с одним участником сервера тоже работал.
- `apps/client/src/components/mention-chip/index.tsx`, `apps/client/src/components/channel-view/text/message.tsx`, `apps/client/src/components/channel-view/text/overrides/mention.tsx`, `apps/client/src/components/channel-view/text/renderer/serializer.tsx`
  Визуал и рендер mentions доведены до Discord-like UX: mention-chip стал заметнее, собственные упоминания подсвечиваются золотистым оттенком, а сообщение с mention текущего пользователя получает отдельную highlight-подложку. Дополнительно label упоминания сохраняется как fallback при рендере, чтобы старые сообщения не теряли читаемость.
- `apps/client/src/components/tiptap-input/plugins/mentions/suggestion.tsx`, `apps/client/src/components/tiptap-input/plugins/command-suggestion.ts`, `apps/client/src/components/tiptap-input/plugins/suggestions.ts`
  Исправлена регрессия с невидимыми suggestion-popup в редакторе: mention/emoji/slash dropdown теперь позиционируются через `fixed` с повышенным `z-index` и middleware `offset/flip/shift`, поэтому список больше не прячется под интерфейсом и корректно остаётся в пределах экрана.
- `apps/server/build/out/opencord-server.exe`
  После серии правок shell, hover-состояний, picker/search цветов, fallback-аватарок и последних cleanup-фиксов верхней шапки/voice controls повторно подтверждена успешная пересборка основного Windows-бинаря `OpenCord`.

## Как билдить OpenCord под Windows

### Подготовка

- Установить `Bun`.
- Открыть терминал в корне проекта `d:\\Cursor\\Sharkord\\sharkord-development`.
- Установить зависимости командой:

```powershell
bun install
```

### Обычная тестовая сборка Windows

Из папки `apps/server` выполнить:

```powershell
bun ./build/build-windows.ts
```

По умолчанию сборка создаёт файл `opencord-server.exe` и перед началом автоматически завершает уже запущенный процесс с этим именем.

### Что делает эта сборка

- собирает клиент через `Vite`;
- упаковывает web-интерфейс внутрь бинаря;
- упаковывает `drizzle` migrations;
- скачивает и встраивает `mediasoup-worker.exe`;
- подставляет Windows-иконку из `apps/client/public/favicon.ico`;
- выпускает готовый Windows `.exe`.

### Куда попадает готовый файл

```text
apps/server/build/out/opencord-server.exe
```

### Примечание по штатной сборке Sharkord

Стандартный `apps/server/package.json -> bun run build` запускает multi-target release build и пытается собрать Linux/macOS/Windows сразу.
Для локальных тестов `OpenCord` сейчас удобнее использовать:

```powershell
bun ./build/build-windows.ts
```

## Следующие обновления этого файла

Позже сюда будут добавляться:

- этапы редизайна под Discord-like web-интерфейс;
- этапы мобильной адаптации;
- обновления логотипа и фирменного стиля;
- ключевые архитектурные решения по `OpenCord`.
