# Kora Render Licensing API

REST API for managing Kora Render plugin licenses, built with Node.js, Express, TypeScript, PostgreSQL, and Prisma.

## Stack

- **Runtime**: Node.js 20
- **Framework**: Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT (30-day tokens)
- **Docs**: Swagger UI (`/docs`)
- **Infra**: Docker + Docker Compose

---

## Quick Start (Development)

### 1. Clone and install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Start the database

```bash
docker compose -f docker-compose.dev.yml up -d
```

### 4. Run migrations and seed

```bash
npm run prisma:migrate
npm run prisma:seed
```

### 5. Start the server

```bash
npm run dev
```

API running at `http://localhost:3000`  
Docs at `http://localhost:3000/docs`

---

## Production (Docker)

```bash
# Copy and configure environment
cp .env.example .env

# Start everything
docker compose up -d

# View logs
docker compose logs -f api
```

---

## API Endpoints

### Auth (Plugin)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Plugin login — returns JWT |
| POST | `/api/auth/check-session` | Validate + auto-refresh session |
| POST | `/api/auth/logout` | Invalidate session |

### Admin (API Key required: `x-admin-key`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/licenses` | List licenses (paginated, searchable) |
| GET | `/api/admin/licenses/:id` | Get license by ID |
| POST | `/api/admin/licenses` | Create license manually |
| PUT | `/api/admin/licenses/:id` | Update license |
| POST | `/api/admin/licenses/:id/block` | Block license |
| POST | `/api/admin/licenses/:id/unblock` | Unblock license |
| DELETE | `/api/admin/licenses/:id` | Delete license |
| GET | `/api/admin/licenses/:id/devices` | List devices |
| DELETE | `/api/admin/licenses/:id/devices/:deviceId` | Remove device |

### Hotmart Webhook

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/hotmart/webhook` | Receive Hotmart events |

---

## License Key Format

```
KR-XXXX-XXXX-XXXX
```

Example: `KR-ABCD-EF12-GHIJ`

---

## Hotmart Events Handled

| Event | Action |
|-------|--------|
| `PURCHASE_APPROVED` | Create license |
| `PURCHASE_COMPLETE` | Create license |
| `SUBSCRIPTION_REACTIVATED` | Renew expiry |
| `PURCHASE_REFUNDED` | Block (REFUNDED) |
| `PURCHASE_CHARGEBACK` | Block (REFUNDED) |
| `PURCHASE_CANCELED` | Cancel license |
| `PURCHASE_DELAYED` | Block (payment decline) |

---

## Plans

| Plan | Max Devices |
|------|-------------|
| BASIC | 1 |
| PRO | 2 |
| STUDIO | 5 |

---

## Tests

```bash
npm test
npm run test:coverage
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `JWT_SECRET` | Secret for JWT signing (min 32 chars) | ✅ |
| `ADMIN_API_KEY` | API key for admin endpoints | ✅ |
| `HOTMART_WEBHOOK_SECRET` | Secret for webhook signature validation | ✅ |
| `JWT_EXPIRES_IN` | Token expiry (default: `30d`) | ❌ |
| `PORT` | Server port (default: `3000`) | ❌ |
| `RATE_LIMIT_MAX` | Requests per window (default: `100`) | ❌ |
