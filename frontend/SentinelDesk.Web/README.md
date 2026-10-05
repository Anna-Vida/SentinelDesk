# SentinelDesk Web

React + TypeScript + Vite frontend for the SentinelDesk security operations platform.

## Development

Start the ASP.NET Core API first at `http://localhost:5043`, then:

```powershell
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

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

The app uses one reusable SignalR connection to `/hubs/security` and reacts to the backend's incident and security-event broadcasts without polling.
