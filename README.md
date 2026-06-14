# Wick Office

Internal office request management system with real-time notifications, OTP-based staff login, and Telegram integration.

---

## Architecture

```
apps/
  backend/    NestJS + TypeORM + Socket.io + Web Push + Telegram Bot
  frontend/   React + Vite + TanStack Query + Zustand + Tailwind + PWA
devops/
  backend/    Dockerfile, Dockerfile.prod
  frontend/   Dockerfile, Dockerfile.prod, nginx.conf
docker-compose.yml        Dev (Postgres in Docker, app on host)
docker-compose.prod.yml   Production (all services containerized)
```

**Stack:**
- Backend: NestJS, PostgreSQL 16, Passport JWT, class-validator, Socket.io
- Frontend: React 18, Vite, TanStack Query v5, Zustand, Radix UI, Tailwind CSS, PWA
- Realtime: Socket.io with JWT handshake, rooms: `role:admin` / `role:staff` / `user:{id}`
- Notifications: Web Push API (VAPID) + Telegram Bot API
- Auth: Email + password (employees/admin), Phone + OTP via Telegram (staff)

**Roles:**

| Role | Login | Can do |
|------|-------|--------|
| Admin | Email + password | Manage users, assign requests, update any status |
| Employee | Email + password | Create / edit / cancel own requests |
| Staff | Phone + OTP (Telegram) | View assigned requests, update status to IN_PROGRESS / DONE |

---

## Local Development (Recommended)

Postgres in Docker, backend and frontend run directly on host. Telegram bot works on most networks.

### Prerequisites

- Node.js 20+
- Docker Desktop

### 1. Start Postgres

```bash
docker compose up -d postgres
```

### 2. Configure backend

```bash
cp .env.example apps/backend/.env
# Edit apps/backend/.env
# Minimum required: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
# Optional but recommended: TELEGRAM_BOT_TOKEN
```

Generate VAPID keys if you don't have them:
```bash
cd apps/backend && npx web-push generate-vapid-keys
```

### 3. Run backend

```bash
cd apps/backend
npm install
npm run start:dev
# API ready at http://localhost:3001/api
```

### 4. Run frontend

```bash
cd apps/frontend
npm install
npm run dev
# App ready at http://localhost:3000
```

---

## Full Docker Dev

All services containerized. Requires `.env.docker`.

```bash
cp .env.example .env.docker
# Edit .env.docker

docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001/api

> Note: if Telegram bot fails to connect inside Docker, run backend locally (Option 1) instead.

---

## Production Deployment

### 1. Prepare env

```bash
cp .env.example .env.prod
# Edit .env.prod:
#   DATABASE_URL=postgresql://... (Neon or self-hosted Postgres)
#   JWT_SECRET=<long random string>
#   VAPID_PUBLIC_KEY=...
#   VAPID_PRIVATE_KEY=...
#   TELEGRAM_BOT_TOKEN=...
#   CORS_ORIGINS=https://your-frontend-domain.com
#   VITE_API_URL=https://your-api-domain.com  (for frontend build)
```

### 2. Deploy

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Frontend served by nginx on port 80. Backend on port 3001.

Put Caddy or Nginx in front for HTTPS termination.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Long random string for signing tokens |
| `JWT_EXPIRES_IN` | No | Token TTL — default `7d` |
| `VAPID_PUBLIC_KEY` | Yes | Web Push public key |
| `VAPID_PRIVATE_KEY` | Yes | Web Push private key |
| `VAPID_EMAIL` | Yes | Contact email for push service |
| `TELEGRAM_BOT_TOKEN` | No | From @BotFather. Without it, OTP logs to console |
| `ADMIN_EMAIL` | No | Seeded admin email — default `admin@questionpro.com` |
| `ADMIN_PASSWORD` | No | Seeded admin password — default `Admin@1234` |
| `ADMIN_NAME` | No | Seeded admin name — default `Admin` |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `PORT` | No | Backend port — default `3001` |
| `VITE_API_URL` | Prod only | Public backend URL for frontend build |

---

## Default Admin

Seeded automatically on first boot:

```
Email:    admin@questionpro.com
Password: Admin@1234
```

Override via `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars before first boot.

---

## Telegram Bot Setup

1. Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy token into `TELEGRAM_BOT_TOKEN`
2. Start backend — logs `Telegram bot @yourbot initialized (polling)`
3. Staff login page shows a deep link: `https://t.me/yourbot?start=PHONEDIGITS`
4. Staff taps link → presses **Start** in Telegram → account linked automatically
5. OTP messages arrive in Telegram DM on each login

**Without Telegram configured:** OTP is printed to backend console and returned as `debug_otp` in API responses (dev mode only).

---

## Request Lifecycle

```
Employee creates request → PENDING
  Admin assigns to staff → ASSIGNED
    Staff begins work → IN_PROGRESS
      Staff marks done → DONE

Employee can: cancel (PENDING or ASSIGNED), edit title/description/priority (PENDING only)
Admin can: update status at any point, reassign staff
```

Real-time updates via Socket.io on all connected clients. Web Push when browser is closed. Telegram message to employee on status change (if linked).

---

## Project Structure

```
apps/backend/src/
  auth/         JWT auth, OTP flow, Telegram bot info
  users/        User CRUD, admin seeding
  requests/     Request lifecycle, employee cancel/update
  categories/   Admin-managed request categories
  notifications/ In-app notification store
  push/         Web Push VAPID subscriptions
  events/       Socket.io gateway (rooms + event emission)
  telegram/     Bot polling, OTP sending, chat ID auto-capture
  admin/        Admin stats endpoint
  common/       JWT guard, roles guard, exception filter

apps/frontend/src/
  pages/
    auth/       Login (email/password + phone OTP)
    admin/      Dashboard, Requests, Users, Categories
    employee/   Dashboard, Create Request, Request Detail
    staff/      Dashboard (assigned requests, status update)
  components/
    common/     NotificationBell, UserAvatar, StatusBadge
    layout/     AppLayout (header with notifications + dark mode toggle)
  api/          Axios wrappers (auth, requests, admin, push, notifications)
  store/        Zustand (auth sync-loaded from localStorage, theme)
  hooks/        useSocket (room-based realtime), usePush (web push subscribe)
```
