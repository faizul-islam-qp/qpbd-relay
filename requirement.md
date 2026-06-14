# Wick Office — Internal Request System
## Hackathon #1 | Deadline: June 15, 2026, 10am BDT

---

## Product Vision

Internal office request portal — web app (PWA installable on Android/iOS) where employees submit requests and staff receive **instant push notifications on their phones**, even when browser is closed. Full lifecycle: create → assign → resolve.

---

## User Roles

| Role | Auth Method | Creation |
|------|-------------|----------|
| **Admin** | Email + password (`*@questionpro.com`) | Seeded on first run |
| **Employee** | Email + password (`*@questionpro.com`) | Self-register or admin creates |
| **Staff** | Phone number + OTP (via Telegram Bot) | Admin only |

### Auth Rules
- Email login: domain must be `@questionpro.com` — rejected otherwise
- Staff login: enter phone → OTP sent to registered Telegram → verify → JWT
- Staff phone + Telegram linked at creation time by admin
- JWT expiry: 7 days (refresh on activity)
- All roles: role-based route guards on frontend + NestJS guards on backend

---

## Panels

### Admin Panel
- Dashboard: stats (pending, in-progress, done today, avg resolution time)
- User management: create/edit/deactivate employees and staff
- Category management: add/edit/reorder/toggle categories
- Requests overview: all requests, filters (status/category/priority/assignee/date), bulk assign
- Push notification log: see who got notified

### Employee Panel
- Dashboard: my open requests, recent activity
- Create request: category picker, title, description, priority selector, optional photo upload
- Request detail: status timeline, staff notes, ETA
- Notification bell: in-app + OS push (if opted in)

### Staff Panel
- Dashboard: request queue (assigned to me + unassigned), sortable by priority/time
- Request card: accept, start, complete, reject (with note)
- Status update triggers real-time update for employee
- Notification bell: in-app
- **Phone push**: OS-level notification when new request arrives (even browser closed)

---

## Request Flow

```
Employee creates request
        │
        ▼
  Status: PENDING
        │
        ├──▶ [WebSocket emit] Employee sees "submitted"
        │
        └──▶ [Web Push] All active staff phones notified instantly
                        (works when browser closed/backgrounded)
        │
Admin/Staff assigns to staff member
        │
        ▼
  Status: ASSIGNED → Staff accepts → IN_PROGRESS → DONE
                                                  └──▶ REJECTED (with note)
        │
        └──▶ [WebSocket] Employee sees live status updates
```

---

## Push Notification Strategy

Two independent channels — both active simultaneously:

| Channel | When | Works when browser closed? |
|---------|------|--------------------------|
| **Web Push (VAPID)** | Request created, assigned, status change | YES — OS-level via service worker |
| **In-app (Socket.io)** | Any event while app is open | No — requires open tab |
| **Telegram Bot OTP** | Staff login OTP delivery | Yes — Telegram app |

Web Push flow:
1. Staff logs in → browser prompts "Allow notifications?"
2. Staff allows → subscription object sent to `POST /push/subscribe`
3. Subscription stored in `push_subs` table
4. On request create → backend iterates all staff subscriptions → sends Web Push
5. Service worker intercepts → shows OS notification with title, category, priority
6. Staff taps notification → opens app to that request

---

## Request Categories (default seed)

| Icon | Name |
|------|------|
| ☕ | Tea / Coffee |
| 🍿 | Chanachur / Snacks |
| 🖨️ | Office Supplies |
| 🔧 | Maintenance |
| 💻 | IT Support |
| 📦 | Delivery / Courier |
| 🚗 | Transport |
| ❓ | Other |

Admin can add/edit/remove categories.

---

## Database Schema

### `users`
```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(255) UNIQUE,
  phone       VARCHAR(20) UNIQUE,
  telegram_chat_id VARCHAR(50),
  role        VARCHAR(20) NOT NULL CHECK (role IN ('admin','employee','staff')),
  password_hash VARCHAR(255),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### `categories`
```sql
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL,
  icon       VARCHAR(10) NOT NULL,
  sort_order INT DEFAULT 0,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `requests`
```sql
CREATE TABLE requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID NOT NULL REFERENCES users(id),
  category_id  UUID NOT NULL REFERENCES categories(id),
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  priority     VARCHAR(10) NOT NULL DEFAULT 'NORMAL'
                 CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
  status       VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING','ASSIGNED','IN_PROGRESS','DONE','REJECTED')),
  assigned_to  UUID REFERENCES users(id),
  photo_url    VARCHAR(500),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### `request_logs`
```sql
CREATE TABLE request_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  actor_id     UUID NOT NULL REFERENCES users(id),
  old_status   VARCHAR(20),
  new_status   VARCHAR(20) NOT NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### `push_subscriptions`
```sql
CREATE TABLE push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint     TEXT NOT NULL UNIQUE,
  p256dh       TEXT NOT NULL,
  auth         TEXT NOT NULL,
  user_agent   VARCHAR(500),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### `notifications`
```sql
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id   UUID REFERENCES requests(id) ON DELETE SET NULL,
  title        VARCHAR(255) NOT NULL,
  body         TEXT,
  is_read      BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### Redis Keys
```
otp:{phone}          → {code, attempts}   TTL: 5min
otp:cooldown:{phone} → 1                  TTL: 60s (rate limit)
session:{userId}     → {lastSeen}         TTL: 7d
```

---

## API Endpoints

### Auth
```
POST   /api/auth/register          Employee self-register (@questionpro.com)
POST   /api/auth/login             Admin/Employee login (email+password)
POST   /api/auth/staff/otp/send    Send OTP to staff phone via Telegram
POST   /api/auth/staff/otp/verify  Verify OTP → return JWT
GET    /api/auth/me                Get current user profile
POST   /api/auth/logout            Invalidate session
```

### Users (Admin only)
```
GET    /api/users                  List all users (filter by role)
POST   /api/users/staff            Create staff user (phone + telegram_chat_id)
POST   /api/users/employee         Create employee user
PATCH  /api/users/:id              Update user
DELETE /api/users/:id              Deactivate user
```

### Categories
```
GET    /api/categories             List active categories (all roles)
POST   /api/categories             Create category (admin)
PATCH  /api/categories/:id         Update category (admin)
DELETE /api/categories/:id         Deactivate category (admin)
```

### Requests
```
GET    /api/requests               List requests (role-scoped: employee=own, staff/admin=all)
POST   /api/requests               Create request (employee)
GET    /api/requests/:id           Get request detail + logs
PATCH  /api/requests/:id/status    Update status (staff/admin)
PATCH  /api/requests/:id/assign    Assign to staff (admin/staff)
```

### Push Notifications
```
GET    /api/push/vapid-public-key  Get VAPID public key for browser subscription
POST   /api/push/subscribe         Store push subscription
DELETE /api/push/unsubscribe       Remove subscription
```

### Notifications (in-app)
```
GET    /api/notifications          Get user notifications (paginated)
PATCH  /api/notifications/read-all Mark all read
PATCH  /api/notifications/:id/read Mark one read
```

### Admin Dashboard
```
GET    /api/admin/stats            Pending count, done today, avg resolution, top categories
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS (Node 20) + TypeORM |
| Frontend | React 18 + Vite + Wick UI lib |
| Database | PostgreSQL 16 |
| Cache / OTP | Redis 7 |
| Auth | JWT (access token, 7d) + bcrypt |
| OTP Delivery | Telegram Bot API (free, no limits) |
| Real-time | Socket.io |
| Push Notifications | Web Push API (VAPID) via `web-push` npm |
| PWA | `vite-plugin-pwa` (Workbox) |
| File Upload | Multer → local volume (Docker) |
| Containerization | Docker Compose |

### Deployment (Free Tier)

| Service | Provider | Free Limit |
|---------|----------|-----------|
| Frontend | Vercel | Unlimited |
| Backend | Railway | $5 credit (sufficient) |
| PostgreSQL | Neon | 0.5GB free |
| Redis | Upstash | 10k req/day free |
| File storage (prod) | Cloudflare R2 | 10GB free |

---

## Project Structure

```
wick-office/
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── apps/
│   ├── backend/               # NestJS
│   │   ├── Dockerfile
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── requests/
│   │   │   ├── categories/
│   │   │   ├── push/
│   │   │   ├── notifications/
│   │   │   ├── events/        # Socket.io gateway
│   │   │   ├── admin/
│   │   │   └── common/        # guards, decorators, filters
│   │   └── ...
│   └── frontend/              # React + Vite
│       ├── Dockerfile
│       ├── public/
│       │   └── sw.js          # service worker (PWA)
│       ├── src/
│       │   ├── pages/
│       │   │   ├── auth/      # Login pages per role
│       │   │   ├── employee/  # Employee panel
│       │   │   ├── staff/     # Staff panel
│       │   │   └── admin/     # Admin panel
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── api/           # Axios + React Query
│       │   └── socket.ts      # Socket.io client
│       └── ...
└── README.md
```

---

## Docker Compose (Local)

All services on `wick-network`. Accessible on same LAN via host IP.

```yaml
services:
  postgres:    port 5432
  redis:       port 6379
  backend:     port 3001  → http://localhost:3001/api
  frontend:    port 3000  → http://localhost:3000
```

Same-network access: team members use `http://<your-machine-ip>:3000`

---

## Environment Variables

```env
# Backend
DATABASE_URL=postgresql://wick:wick@postgres:5432/wick_office
REDIS_URL=redis://redis:6379
JWT_SECRET=<random-256bit>
JWT_EXPIRES_IN=7d
VAPID_PUBLIC_KEY=<generated>
VAPID_PRIVATE_KEY=<generated>
VAPID_EMAIL=mailto:admin@questionpro.com
TELEGRAM_BOT_TOKEN=<from BotFather>
APP_URL=http://localhost:3000

# Frontend
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
VITE_VAPID_PUBLIC_KEY=<same as backend>
```

---

## Development Phases

### Phase 0 — Scaffold + Docker (1.5h)
**Goal**: `docker compose up` brings everything online, health checks pass

Tasks:
- [ ] Init monorepo: `apps/backend` (NestJS CLI), `apps/frontend` (Vite React TS)
- [ ] `docker-compose.yml`: postgres, redis, backend, frontend — all on `wick-network`
- [ ] `.env.example` with all vars documented
- [ ] NestJS: TypeORM config, database migration setup, `GET /api/health` returns `{status:"ok"}`
- [ ] Frontend: Vite + React + Wick UI lib installed, React Router, basic layout shell
- [ ] Confirm Wick UI lib npm package name and install

**Done when**: `docker compose up` → all 4 containers healthy, `/api/health` returns 200

---

### Phase 1 — Auth System (2h)
**Goal**: All 3 roles can login and get JWT, role guards protect routes

Tasks:
- [ ] `UsersModule`: User entity (TypeORM), CRUD service
- [ ] `AuthModule`: register (employee, validate @questionpro.com), login (email+pw), JWT strategy
- [ ] Staff OTP flow: `POST /auth/staff/otp/send` → Telegram Bot sends code → Redis TTL 5min
- [ ] `POST /auth/staff/otp/verify` → validates code → returns JWT
- [ ] `JwtAuthGuard` + `RolesGuard` + `@Roles()` decorator
- [ ] Admin seed: `npm run seed` creates `admin@questionpro.com` with env-configured password
- [ ] Frontend: 3 login routes (`/login/employee`, `/login/staff`, `/login/admin`)
- [ ] Protected routes per role, redirect on unauthorized
- [ ] Token stored in localStorage, axios interceptor adds `Authorization: Bearer`

**Done when**: Employee/admin can login with email, staff can get OTP and login, wrong role redirected

---

### Phase 2 — Core Request API (2h)
**Goal**: Full request CRUD with status machine, categories seeded

Tasks:
- [ ] `CategoriesModule`: entity, CRUD, seed 8 default categories on startup
- [ ] `RequestsModule`: entity, create (employee), list (role-scoped), detail, status update, assign
- [ ] `RequestLogsModule`: append log on every status change with actor
- [ ] Input validation (class-validator), error response format consistent
- [ ] Pagination on list endpoints (page, limit, filters)
- [ ] Unit tests: status machine transitions (valid + invalid)

**Done when**: Postman/curl can create request, update status, list with filters

---

### Phase 3 — Employee Panel (1.5h)
**Goal**: Employees can submit and track requests

Tasks:
- [ ] Dashboard: active requests list with status badges, priority colors
- [ ] Create request form: category grid picker, title, description, priority (LOW/NORMAL/HIGH/URGENT)
- [ ] Request detail page: status timeline from `request_logs`, staff notes
- [ ] Empty state for no requests
- [ ] Responsive — works on mobile browser

**Done when**: Employee can submit a request and see it in their list with correct status

---

### Phase 4 — Staff Panel (1.5h)
**Goal**: Staff can view queue and update request status

Tasks:
- [ ] Dashboard: queue split — "My Requests" + "Unassigned" tabs
- [ ] Request card: priority badge, category icon, time ago, employee name
- [ ] Actions: Accept (PENDING→ASSIGNED), Start (ASSIGNED→IN_PROGRESS), Complete (→DONE), Reject (→REJECTED + note modal)
- [ ] Filter bar: status, category, priority
- [ ] Notification bell (in-app, count badge)

**Done when**: Staff can accept request and mark it done, employee sees updated status

---

### Phase 5 — Admin Panel (1.5h)
**Goal**: Admin can manage users, categories, and see all requests

Tasks:
- [ ] Stats dashboard: 4 cards (pending, in-progress, done today, avg resolution time hh:mm)
- [ ] User management table: list all, create staff (phone + telegram_chat_id), create employee, deactivate
- [ ] Category management: list, add, edit, toggle active
- [ ] Requests table: all requests, assign dropdown, status filter
- [ ] Create staff modal: name, phone, telegram_chat_id (staff must message bot first, get chat ID)

**Done when**: Admin can create staff user with Telegram chat ID and see full request overview

---

### Phase 6 — Real-time (Socket.io) (1h)
**Goal**: Status changes appear instantly without page refresh

Tasks:
- [ ] `EventsGateway`: Socket.io server, authenticated via JWT on handshake
- [ ] Rooms: `user:{userId}` (personal), `role:staff` (all staff), `role:employee` (all employees)
- [ ] Emit on request created: `request:new` → room `role:staff`
- [ ] Emit on status change: `request:updated` → room `user:{employeeId}` + `role:staff`
- [ ] Frontend: socket client connects on login, toast notification on events
- [ ] Staff dashboard: new request card slides in without refresh
- [ ] Employee dashboard: status badge updates live

**Done when**: Create request in one tab → staff tab shows it immediately without refresh

---

### Phase 7 — Push Notifications + PWA (1.5h)
**Goal**: Staff phone shows OS notification when new request arrives, even with browser closed

Tasks:
- [ ] Generate VAPID keys: `npx web-push generate-vapid-keys` → store in env
- [ ] `PushModule`: `POST /push/subscribe` stores subscription, `DELETE /push/unsubscribe`
- [ ] `GET /push/vapid-public-key` returns public key to frontend
- [ ] On request create: iterate all staff push subscriptions → send Web Push payload
- [ ] PWA setup: `vite-plugin-pwa` config — manifest (name, icons, theme_color, display:standalone)
- [ ] Service worker: intercept `push` event → show notification with title, body, icon, click action
- [ ] Frontend: on staff login → `Notification.requestPermission()` → subscribe → `POST /push/subscribe`
- [ ] Notification click: opens app to `/staff/requests/{id}`
- [ ] Test on actual phone (Chrome Android, Safari iOS)

**Done when**: Staff approves notifications on phone, employee creates request, phone shows OS notification with request details within 2 seconds

---

### Phase 8 — Deployment (1h)
**Goal**: Prod URLs accessible from anywhere, same codebase

Tasks:
- [ ] Neon: provision PostgreSQL, run migrations (`typeorm migration:run`)
- [ ] Upstash: provision Redis, get TLS connection string
- [ ] Telegram bot: create via BotFather, get token, set webhook or use polling
- [ ] Railway: deploy backend Docker image, set all prod env vars
- [ ] Vercel: deploy frontend, set `VITE_API_URL` = Railway URL
- [ ] Generate prod VAPID keys, add to both Railway and Vercel env
- [ ] CORS: backend allow Railway + Vercel origins
- [ ] End-to-end smoke test on prod URLs from phone

**Done when**: `https://{app}.vercel.app` loads, full flow works on mobile browser

---

### Phase 9 — Polish + Demo Prep (30min)
**Goal**: Clean demo, no rough edges

Tasks:
- [ ] `docker compose up` test from clean state (no volumes) — verify migrations + seed run
- [ ] Error states: invalid domain login, wrong OTP, network offline
- [ ] Loading skeletons on list pages
- [ ] Demo data seed: `npm run seed:demo` — creates 2 employees, 2 staff, 10 sample requests
- [ ] README: setup instructions, docker compose up, prod URLs, demo credentials
- [ ] Demo script: Employee creates URGENT tea request → Staff phone buzzes → Staff accepts → Employee sees "In Progress"

**Done when**: `docker compose up` from zero → full flow demo in under 5 minutes

---

## Timeline (20h to deadline)

```
Now (14 Jun ~3pm BDT)
├── Phase 0+1   Auth + scaffold        4h  → ~7pm
├── Phase 2     Core API               2h  → ~9pm
├── Phase 3+4   Employee + Staff UI    3h  → ~12am
├── Phase 5     Admin panel            1.5h → ~1:30am
├── Phase 6     Real-time              1h  → ~2:30am
├── Phase 7     Push + PWA             1.5h → ~4am
├── Phase 8     Deployment             1h  → ~5am
├── Phase 9     Polish + demo          0.5h → ~5:30am
└── Buffer      Sleep + fixes          4.5h → 10am ✓
```

---

## Judging Criteria Mapping

| Criteria | Our answer |
|----------|-----------|
| Product usefulness | Real request system office will actually use day 1 |
| User experience | Wick UI design system, mobile-first, PWA installable |
| Notification experience | OS-level push (works closed browser) + Telegram OTP |
| Technical implementation | NestJS + TypeORM + Socket.io + VAPID Web Push |
| Architecture | Clean modules, role-based guards, event-driven |
| Creativity | Telegram Bot for staff OTP is unique; PWA installable on iOS/Android |

---

## Open Questions (Resolved)

| Question | Decision |
|----------|---------|
| SMS provider | Telegram Bot API — free, no limits, staff in BD use Telegram |
| Staff creation | Admin only |
| Backend hosting | Railway (Docker-native, free credit) |
| OTP fallback in demo | If Telegram not configured, OTP logged to backend console |
| Wick UI npm package | TBD — confirm package name before Phase 0 |
