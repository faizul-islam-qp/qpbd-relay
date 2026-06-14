# QPBD Relay — Backend

NestJS API server. Env file lives at `apps/backend/.env` (this folder).

---

## Setup

```bash
npm install
npm run start:dev   # http://localhost:3001/api
```

---

## Environment Variables

Create `.env` in this folder (`apps/backend/.env`):

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
# For Neon: postgresql://owner:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require

# JWT
JWT_SECRET=long-random-string-here
JWT_EXPIRES_IN=7d

# Web Push (VAPID)
# Generate: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:admin@questionpro.com

# Telegram Bot (optional — OTP falls back to console if not set)
TELEGRAM_BOT_TOKEN=        # from @BotFather
TELEGRAM_BOT_USERNAME=     # e.g. qpbd_office_bot (without @)

# Admin seed (created on first boot)
ADMIN_EMAIL=admin@questionpro.com
ADMIN_PASSWORD=Admin@1234
ADMIN_NAME=Admin

# Email OTP (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password   # Gmail: Settings → Security → App passwords

# CORS / Server
CORS_ORIGINS=http://localhost:3000   # comma-separated; use * for public/ngrok
PORT=3001
```

### Variable reference

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Any long random string |
| `JWT_EXPIRES_IN` | No | Default `7d` |
| `VAPID_PUBLIC_KEY` | Yes | Web Push — generate once, never change |
| `VAPID_PRIVATE_KEY` | Yes | Paired with public key above |
| `VAPID_EMAIL` | Yes | Contact for push service |
| `TELEGRAM_BOT_TOKEN` | No | OTP via Telegram DM |
| `TELEGRAM_BOT_USERNAME` | No | Shown on staff login page |
| `ADMIN_EMAIL` | No | Default `admin@questionpro.com` |
| `ADMIN_PASSWORD` | No | Default `Admin@1234` |
| `SMTP_HOST` | No | Email OTP fallback |
| `SMTP_PORT` | No | Default `465` |
| `SMTP_SECURE` | No | Default `true` |
| `SMTP_USER` | No | Gmail address |
| `SMTP_PASS` | No | Gmail app password |
| `CORS_ORIGINS` | No | Default `http://localhost:3000`. Set `*` for ngrok/public access |
| `PORT` | No | Default `3001` |

---

## ngrok (public access)

```bash
# 1. Set CORS_ORIGINS=* in .env, restart backend
# 2. Start frontend dev server (port 3000)
# 3. Run ngrok on frontend port — single tunnel covers everything
ngrok http 3000
```

Vite dev server proxies `/api` and `/socket.io` to backend (3001). Only one ngrok tunnel needed.

---

## Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

Copy output into `.env`. Do this once — changing keys invalidates all existing push subscriptions.
