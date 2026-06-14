# QPBD Relay

Internal office request management system — real-time notifications, commenting, OTP-based staff login, and Telegram integration.

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
- Notifications: Web Push API (VAPID) + in-app bell + Telegram Bot
- Auth: Email + password (employees/admin), Phone + OTP via Telegram (staff)

**Roles:**

| Role | Login | Can do |
|------|-------|--------|
| Admin | Email + password | Manage users, categories, assign requests, update any status |
| Employee | Email + password | Create / edit / cancel own requests, comment |
| Staff | Phone + OTP → set password | View all requests, update status, re-open closed requests, comment |

---

## Local Development

Postgres in Docker, backend and frontend run directly on host.

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
# Edit apps/backend/.env — see apps/backend/README.md for full variable reference
```

Generate VAPID keys (one-time):
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
# App at http://localhost:3000
```

---

## Public Access via ngrok

Single tunnel on port 3000 — Vite proxies `/api` and `/socket.io` to backend (3001).

```bash
# 1. Set CORS_ORIGINS=* in apps/backend/.env, restart backend
# 2. Start frontend dev server (port 3000)
# 3. Run ngrok
ngrok http 3000
# Share the HTTPS URL — works for all team members
```

---

## Full Docker Dev

```bash
cp .env.example .env.docker
# Edit .env.docker

docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001/api

> Note: if Telegram bot fails inside Docker, run backend locally instead.

---

## Production / Local Network Deployment

### Makefile commands

| Command | Does |
|---------|------|
| `make up` | Build + start in background |
| `make down` | Stop containers |
| `make restart` | Stop + rebuild + start |
| `make clean` | Stop + remove containers, volumes, images + prune dangling |
| `make logs` | Tail all logs |
| `make ps` | Show container status |

### Setup

Edit `apps/backend/.env.prod` (see [apps/backend/README.md](apps/backend/README.md)):
- Set `DATABASE_URL`, `JWT_SECRET`, `VAPID_*`, `TELEGRAM_*`, `SMTP_*`
- Set `CORS_ORIGINS=*` for open local network access

Then build and start:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

- Frontend: `http://localhost` (port 80)
- Backend: `http://localhost:3001/api`
- **From any device on the same network:** `http://<your-machine-ip>`

nginx proxies `/api` and `/socket.io` to the backend container — no IP needs to be baked into the build. Works from any device on the LAN automatically.

Put Caddy or Nginx in front for HTTPS on a public server.

---

## Environment Variables

Full reference: [`apps/backend/README.md`](apps/backend/README.md)

Quick summary:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Long random string |
| `VAPID_PUBLIC_KEY` | Yes | Web Push public key |
| `VAPID_PRIVATE_KEY` | Yes | Web Push private key |
| `VAPID_EMAIL` | Yes | Contact email for push service |
| `TELEGRAM_BOT_TOKEN` | No | From @BotFather — OTP via Telegram DM |
| `TELEGRAM_BOT_USERNAME` | No | Shown on staff login page |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | No | Email OTP fallback |
| `ADMIN_EMAIL` | No | Seeded admin — default `admin@questionpro.com` |
| `ADMIN_PASSWORD` | No | Seeded admin password — default `Admin@1234` |
| `CORS_ORIGINS` | No | Comma-separated origins. Use `*` for ngrok/LAN access |
| `PORT` | No | Backend port — default `3001` |

---

## Default Admin

Seeded automatically on first boot:

```
Email:    admin@questionpro.com
Password: Admin@1234
```

Override via `ADMIN_EMAIL` / `ADMIN_PASSWORD` before first boot.

---

## Telegram Bot Setup

1. Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy token into `TELEGRAM_BOT_TOKEN`
2. Start backend — logs `Telegram bot @yourbot initialized`
3. Staff login page shows deep link: `https://t.me/yourbot?start=PHONEDIGITS`
4. Staff taps link → presses **Start** in Telegram → account linked
5. OTP messages arrive in Telegram DM on each login
6. After first OTP, staff sets a password — subsequent logins use phone + password directly

**Without Telegram:** OTP falls back to email (SMTP) or console log.

---

## Request Lifecycle

```
Employee creates request → PENDING (auto-assigned to least-loaded staff → ASSIGNED)
  Staff accepts → ASSIGNED
    Staff begins work → IN_PROGRESS
      Staff marks done → DONE
      Staff rejects → REJECTED (can be re-opened: Re-queue / Accept / Start Now)
  Employee can cancel (PENDING or ASSIGNED only)
  Cancelled/Rejected → staff can re-open to PENDING / ASSIGNED / IN_PROGRESS
```

Real-time updates via Socket.io. Web Push when browser closed. Comments on each request visible to employee, staff, and admin.

---

## Project Structure

```
apps/backend/src/
  auth/           JWT auth, OTP flow, staff password login
  users/          User CRUD, admin seeding
  requests/       Request lifecycle, comments, employee cancel/edit
  categories/     Admin-managed request categories
  notifications/  In-app notification store
  push/           Web Push VAPID subscriptions
  events/         Socket.io gateway (rooms + event emission)
  telegram/       Bot polling, OTP delivery, chat ID auto-capture
  email/          SMTP OTP fallback
  admin/          Admin stats endpoint
  common/         JWT guard, roles guard, exception filter

apps/frontend/src/
  pages/
    auth/         Login (email/password + phone OTP/password for staff)
    admin/        Dashboard, Requests, Users, Categories
    employee/     Dashboard, Create Request, Request Detail
    staff/        Dashboard (queue), Request Detail (actions + timeline + comments)
  components/
    common/       NotificationBell, RequestComments, StatusBadge, PriorityBadge
    layout/       AppLayout (header with notification bell + dark mode)
  api/            Axios wrappers (auth, requests, admin, push, notifications)
  store/          Zustand (auth, theme, unread comments)
  hooks/          useSocket (realtime), usePush (web push subscribe)
```
