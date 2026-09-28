# 🚀 S&T Indicator Studio — Руководство по Развертыванию на Сервере / VPS

Полное руководство по установке, запуску и настройке серверной части **Sync & Trade (S&T) AI Indicator Studio** на виртуальных серверах (VPS/VDS) и выделенных машинах под управлением Linux (Ubuntu, Debian, CentOS, Rocky, Alpine) или Docker.

---

## ⚡ Быстрый старт в 1 команду (Quick Start)

Если у вас чистый сервер Ubuntu 20.04/22.04/24.04 или Debian:

```bash
# Клонируйте репозиторий и перейдите в папку
git clone <URL_ВАШЕГО_РЕПОЗИТОРИЯ> st-indicator-studio
cd st-indicator-studio

# Запустите автоматический установщик
chmod +x deploy.sh
./deploy.sh
```

Скрипт автоматически:
1. Проверит и установит **Node.js 22 LTS** и зависимости.
2. Создаст рабочий файл `.env` из шаблона.
3. Соберет оптимизированный фронтенд (Vite) и бэкенд (`dist/server.cjs`).
4. Предложит выбрать менеджер процессов: **PM2**, **Docker Compose** или **Systemd**.
5. Запустит сервис и выдаст готовые ссылки для доступа.

---

## 📦 Вариант 1: Запуск через Docker Compose (Рекомендуется)

Идеальный вариант для изоляции, автоматического перезапуска при падении и простого обновления.

```bash
# 1. Скопируйте и настройте переменные окружения
cp .env.production.example .env
nano .env

# 2. Запустите сборку и старт контейнера в фоне
docker compose up -d --build

# 3. Проверка статуса
docker compose ps
docker compose logs -f
```

Остановка и обновление:
```bash
docker compose down
git pull
docker compose up -d --build
```

---

## 🛠️ Вариант 2: Запуск через PM2 (Node.js Process Manager)

Оптимально для серверов без Docker:

```bash
# 1. Установите PM2 глобально
npm install -g pm2

# 2. Установите зависимости и соберите проект
npm install
npm run build

# 3. Запустите приложение с файлом конфигурации
pm2 start ecosystem.config.cjs

# 4. Сохраните процесс для автозапуска после перезагрузки сервера
pm2 save
pm2 startup
```

Полезные команды PM2:
```bash
pm2 status                  # Статус процесса
pm2 logs st-indicator-studio # Просмотр логов в реальном времени
pm2 restart st-indicator-studio # Перезапуск
pm2 stop st-indicator-studio    # Остановка
```

---

## 🛡️ Вариант 3: Запуск через системную службу Linux (Systemd)

```bash
# 1. Скопируйте файл службы в systemd
sudo cp st-indicator-studio.service /etc/systemd/system/

# 2. Укажите актуальный путь к проекту в WorkingDirectory
sudo nano /etc/systemd/system/st-indicator-studio.service

# 3. Перезагрузите демоны и включите службу
sudo systemctl daemon-reload
sudo systemctl enable --now st-indicator-studio

# 4. Проверка статуса
sudo systemctl status st-indicator-studio
```

---

## 🌐 Настройка Домена и SSL (HTTPS)

### А. Через Caddy (Самый простой вариант с автоматическим SSL)
1. Установите Caddy: `sudo apt install -y caddy`
2. Отредактируйте `Caddyfile`: укажите ваш домен вместо `your-domain.com`.
3. Запустите: `sudo systemctl restart caddy`. Caddy сам бесплатно выпустит и продлит сертификат Let's Encrypt!

### Б. Через Nginx и Certbot
1. Скопируйте конфиг:
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/st-indicator-studio
   sudo ln -s /etc/nginx/sites-available/st-indicator-studio /etc/nginx/sites-enabled/
   ```
2. Проверьте и перезапустите:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```
3. Выпустите бесплатный SSL-сертификат:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

---

## ⚡ Настройка TradingView Webhook & Telegram Бота

### 1. Webhook URL для алертов TradingView:
```
https://your-domain.com/api/webhook/tradingview?token=st_secret_tradingview_token
```

### 2. Шаблон сообщения для алерта в TradingView:
```json
{
  "ticker": "{{ticker}}",
  "action": "{{strategy.order.action}}",
  "price": {{close}},
  "timeframe": "{{interval}}",
  "comment": "{{strategy.order.comment}}",
  "time": "{{time}}"
}
```

Когда TradingView отправляет алерт на этот адрес:
1. Сервер валидирует секретный токен.
2. Фиксирует сигнал в реестре и журнале.
3. Проводит мгновенный ИИ-аудит (через Gemini или автономный квант-движок).
4. Отправляет структурированное уведомление в Telegram (и/или Discord).
