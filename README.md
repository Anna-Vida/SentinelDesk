# SentinelDesk

A full-stack security incident workspace built with ASP.NET Core (.NET 10), PostgreSQL, React 19, TypeScript and SignalR.

## Features

- Sign in with ASP.NET Core Identity and HttpOnly session cookies; no public registration.
- Admin, Analyst and Viewer roles, enforced by the API and reflected in the UI.
- Create and edit incidents; search, filter, paginate and inspect archived records.
- Enforced workflow: **Open → Investigating → Contained → Resolved → Closed**.
- Soft archival preserves evidence and makes the incident read-only.
- Record security events, validate IPv4/IPv6 addresses and risk scores, search/filter telemetry, and link evidence to incidents.
- Live updates with startup retry, automatic reconnection and server resynchronisation.
- Database-wide dashboard and analytics counts, including datasets larger than one page.
- Admin account creation and self-service password changes.
- Keyboard-accessible dialogs, responsive layouts, loading/empty/error states.

## Run locally with Docker Desktop

Install Docker Desktop with Linux containers enabled. From the repository root:

```powershell
Copy-Item .env.example .env
```

Edit `.env`: set `POSTGRES_PASSWORD`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. Use a unique admin password of at least 12 characters, including uppercase, lowercase, a number and a symbol. Avoid semicolons in the PostgreSQL password because it is inserted into a connection string. Do not commit `.env`.

```powershell
docker compose up --build
```

Open **http://localhost:5043** and sign in with your configured admin account. The first startup applies migrations and creates the administrator only when the identity store is empty. Existing incident data is preserved. Changing `.env` does not reset an existing account; change its password in Settings.

`docker compose down` stops the app and preserves the database volume. Do not add `--volumes` unless you intend to delete local data.

## Run in VS Code without Docker

Prerequisites: .NET 10 SDK, Node.js 22.12+ and a running PostgreSQL database. Create an empty database named `sentineldesk` using your local PostgreSQL tools.

From the repository root:

```powershell
dotnet tool restore
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=sentineldesk;Username=YOUR_USER;Password=YOUR_PASSWORD" --project backend/SentinelDesk.Api
dotnet user-secrets set "Auth:BootstrapAdmin" "true" --project backend/SentinelDesk.Api
dotnet user-secrets set "Auth:AdminEmail" "YOUR_EMAIL" --project backend/SentinelDesk.Api
dotnet user-secrets set "Auth:AdminPassword" "YOUR_STRONG_PASSWORD" --project backend/SentinelDesk.Api
dotnet ef database update --project backend/SentinelDesk.Api
dotnet run --project backend/SentinelDesk.Api
```

In a second terminal:

```powershell
cd frontend/SentinelDesk.Web
npm ci
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` and `/hubs` to port 5043 so authentication and SignalR share one browser origin. Use `localhost` consistently. Do not set `VITE_API_BASE_URL` for the normal local setup.

## Roles

| Capability | Viewer | Analyst | Admin |
| --- | --- | --- | --- |
| Read incidents, evidence and analytics | Yes | Yes | Yes |
| Create/edit/archive incidents; record/link events | No | Yes | Yes |
| Change own password | Yes | Yes | Yes |
| List/create workspace accounts | No | No | Yes |

There are no built-in passwords or demo accounts in the application. Test credentials exist only in automated test fixtures.

## Verification

```powershell
dotnet test SentinelDesk.slnx
cd frontend/SentinelDesk.Web
npm ci
npm run lint
npm run build
npx playwright install chromium
```

API tests use disposable SQLite by default. Set `TEST_DATABASE_URL` to a **dedicated disposable PostgreSQL test database** to verify PostgreSQL migrations and case-insensitive queries. Tests create fixture records; never point them at a real workspace database. GitHub Actions runs this PostgreSQL suite and browser tests.

For browser tests, run the API against the disposable test database after `dotnet test`, then set `E2E_EMAIL` and `E2E_PASSWORD` to the test administrator credentials and run `npm run test:e2e`. Playwright starts Vite automatically. See `tests/SentinelDesk.Api.Tests` and `frontend/SentinelDesk.Web/e2e`.

## API

Development OpenAPI: `/openapi/v1.json`. Liveness: `GET /api/health` (does not check database availability).

- `GET /api/auth/csrf`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `POST /api/auth/password`; admin-only `GET/POST /api/auth/users`
- `GET/POST /api/incidents`, `GET/PUT/DELETE /api/incidents/{id}`, `PATCH /api/incidents/{id}/status`
- `GET/POST /api/security-events`, `GET /api/security-events/{id}`
- `PATCH /api/security-events/{eventId}/incident/{incidentId}`
- `GET /api/dashboard`; SignalR hub: `/hubs/security`

All workspace routes require authentication. Unsafe controller requests require the `X-CSRF-TOKEN` header obtained from `/api/auth/csrf`, plus the associated cookies. Obtain a new CSRF token after sign-in or password changes. Event listing returns a paginated envelope (`items`, `page`, `pageSize`, `totalItems`, `totalPages`).

## Deployment

The multi-stage `Dockerfile` serves the compiled frontend and API together. For public hosting:

1. Use `ASPNETCORE_ENVIRONMENT=Production`, an HTTPS endpoint, and a managed PostgreSQL database.
2. Supply `ConnectionStrings__DefaultConnection` through your hosting secret store.
3. Apply EF migrations as a release step. Bootstrap the initial administrator once with the `Auth__*` settings described above, then remove bootstrap credentials.
4. Persist ASP.NET Core data-protection keys if sessions must survive restarts or multiple instances. Multiple API instances also require a SignalR backplane; this MVP targets one instance.

The supplied Compose profile binds only to local loopback and runs in Development for local HTTP. It is not the public deployment configuration. Public hosting, domain configuration and provider credentials are not included.

## Scope

This is a portfolio incident-management MVP. It records and correlates events supplied by analysts; it is not an endpoint detection agent or an automatic threat scanner. Analyst assignment, audit trails, email recovery/MFA, retention rules and integrations are future extensions.

## My contribution

**Anna Patricia B. Vida — Sole Developer / Full-Stack Developer**

I designed and built SentinelDesk as an independent full-stack project, covering the C# API, database integration, React interface, real-time communication, incident workflows, and development setup.
