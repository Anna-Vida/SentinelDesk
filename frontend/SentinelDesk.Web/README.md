# SentinelDesk Web

React + TypeScript + Vite frontend for the SentinelDesk security operations platform.

## Development

Start the ASP.NET Core API first at `http://localhost:5043`, then:

```powershell
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

On a fresh database, use **Register** first. The first registered account becomes the Admin bootstrap account. Later registrations can join as Analyst or Viewer.

## Access levels

- **Viewer** — read-only dashboard, incidents, telemetry, and analytics
- **Analyst** — Viewer access plus incident/security-event mutation workflows
- **Admin** — Analyst access plus incident archival

Authentication uses JWT bearer tokens. The frontend stores the active session locally and supplies the token to both REST requests and the SignalR connection.

## Environment

Copy `.env.example` to `.env` when you need to override the backend URL:

```env
VITE_API_BASE_URL=http://localhost:5043
```

For deployment, set `VITE_API_BASE_URL` to the public HTTPS address of the ASP.NET Core API.

## Commands

```powershell
npm run dev
npm run build
npm run lint
npm run preview
```

The app uses one reusable authenticated SignalR connection to `/hubs/security` and reacts to incident/security-event broadcasts without polling.
