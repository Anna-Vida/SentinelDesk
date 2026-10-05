# SentinelDesk

SentinelDesk is a real-time cybersecurity incident management platform built as a full-stack portfolio project. It models a lightweight Security Operations Center (SOC) workflow: analysts can create and triage incidents, move them through a controlled response lifecycle, ingest security telemetry, correlate events to incidents, and watch updates appear live through SignalR.

## Stack

- **Backend:** C# · .NET 10 · ASP.NET Core Web API
- **Data:** PostgreSQL · Entity Framework Core · Npgsql
- **Real time:** ASP.NET Core SignalR
- **Frontend:** React 19 · TypeScript · Vite
- **Security:** JWT authentication · Viewer/Analyst/Admin RBAC
- **Quality:** OpenAPI · Problem Details · xUnit · GitHub Actions CI

Everything used by the project is available with free/open-source tooling for local development.

## Features

### Incident management

- Create, retrieve, update, search, filter, and paginate incidents
- Severity levels: Low, Medium, High, Critical
- Controlled response lifecycle:
  `Open → Investigating → Contained → Resolved → Closed`
- Invalid status jumps return `409 Conflict`
- Soft archiving preserves incident history
- Archived incidents cannot be edited or moved through the workflow

### Security telemetry

- Record security events with source IP, description, and risk score
- Risk score validation from 0–100
- Optionally associate an event with an incident at creation time
- Link or relink existing events to active incidents
- Filter the frontend event stream by text and minimum risk

### Real-time operations

The SignalR hub at `/hubs/security` broadcasts:

- `IncidentCreated`
- `IncidentUpdated`
- `IncidentStatusChanged`
- `IncidentArchived`
- `SecurityEventCreated`
- `SecurityEventLinked`

Connected browser sessions update without polling or a page refresh.

### SOC dashboard

- Live connection-state indicator
- Incident and telemetry metrics
- Recent incident queue
- Live security-event feed
- Searchable/filterable incident management
- Security-event creation and correlation
- Operational analytics for status, severity, risk, and linkage
- CSV export for incident and telemetry reporting
- Responsive dark SOC interface with loading, error, and empty states

## Repository structure

```text
SentinelDesk/
├── backend/
│   └── SentinelDesk.Api/
│       ├── Contracts/
│       ├── Controllers/
│       ├── Data/
│       │   └── Migrations/
│       ├── Hubs/
│       └── Models/
├── frontend/
│   └── SentinelDesk.Web/
│       └── src/
│           ├── api/
│           ├── components/
│           ├── hooks/
│           ├── pages/
│           ├── types/
│           └── utils/
└── .github/
    └── workflows/
        └── ci.yml
```

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the system diagram, data model, authentication/RBAC design, real-time flow, and deployment configuration.

## Local setup

### Prerequisites

- .NET 10 SDK
- Node.js 22 or later
- PostgreSQL
- Git

### 1. Database

Create a PostgreSQL database named `sentineldesk`.

Store the development connection string with .NET User Secrets:

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=sentineldesk;Username=postgres;Password=YOUR_PASSWORD" --project backend/SentinelDesk.Api
```

Apply the existing migrations, including the authentication table:

```powershell
dotnet ef database update --project backend/SentinelDesk.Api --startup-project backend/SentinelDesk.Api
```

### 2. Run the API

```powershell
dotnet run --project backend/SentinelDesk.Api
```

On first launch after the authentication migration, register the first account from the frontend. That first account becomes Admin automatically.

Development endpoints:

- API: `http://localhost:5043`
- Health: `GET http://localhost:5043/api/health`
- OpenAPI: `http://localhost:5043/openapi/v1.json`
- SignalR: `http://localhost:5043/hubs/security`

### 3. Run the frontend

```powershell
cd frontend/SentinelDesk.Web
npm install
npm run dev
```

Open `http://localhost:5173`.

The default frontend API URL is configured in `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:5043
```

## Production configuration

For the single-service Docker deployment, the React app uses the same public origin as the API automatically.

If you deploy the frontend separately, set the frontend API URL:

```env
VITE_API_BASE_URL=https://your-api.example.com
```

Set the backend PostgreSQL connection string using your hosting provider's secret/environment configuration.

Set a production JWT signing key with at least 32 bytes:

```text
Jwt__Key=replace-with-a-long-random-secret
```

Do not reuse the development-only signing key in production.

To allow the deployed frontend to call the API and connect to SignalR, set:

```text
Cors__AllowedOrigins=https://your-frontend.example.com
```

Multiple origins can be supplied as a comma-separated list. Credentials are enabled for SignalR, so SentinelDesk intentionally uses an explicit origin allowlist instead of wildcard CORS.

## Verification

Backend:

```powershell
dotnet build SentinelDesk.slnx
dotnet test SentinelDesk.slnx
```

Frontend:

```powershell
cd frontend/SentinelDesk.Web
npm run build
npm run lint
```

A GitHub Actions workflow is included for backend build plus frontend build/lint. It can be run manually from the Actions tab once GitHub-hosted runners are available for the repository.

## API overview

```text
GET    /api/health
GET    /api/auth/bootstrap-status
POST   /api/auth/register   # first-run Admin bootstrap only
POST   /api/auth/login

GET    /api/users           # Admin
POST   /api/users           # Admin

GET    /api/incidents
GET    /api/incidents/{id}
POST   /api/incidents
PUT    /api/incidents/{id}
PATCH  /api/incidents/{id}/status
DELETE /api/incidents/{id}

GET    /api/security-events
GET    /api/security-events/{id}
POST   /api/security-events
PATCH  /api/security-events/{eventId}/incident/{incidentId}

GET/WS /hubs/security
```

## Project role

**Sole Developer / Full-Stack Developer**

I designed and implemented SentinelDesk end to end, including the ASP.NET Core API, PostgreSQL data model, Entity Framework migrations, incident workflow rules, SignalR real-time events, React/TypeScript dashboard, typed API clients, analytics, responsive UI, and development/CI setup.


## Free single-service deployment

The repository includes a root `Dockerfile` that builds the React frontend and ASP.NET Core backend into one container. For low-cost/free hosting where multiple services are unavailable, set:

```text
ConnectionStrings__DefaultConnection=Data Source=/data/sentineldesk.db
Jwt__Key=<long random secret>
ASPNETCORE_ENVIRONMENT=Production
```

Mount persistent storage at `/data`. The API serves the built React application, REST endpoints, and SignalR from the same public origin.
