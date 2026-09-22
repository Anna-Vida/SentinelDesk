# SentinelDesk

SentinelDesk is a real-time cybersecurity incident management platform. Security teams will use it to review alerts, investigate incidents, assign analysts, and track resolution work.

## Current milestone

The initial backend is an ASP.NET Core Web API. The React frontend and database integration will follow in later milestones.

```text
SentinelDesk/
├── backend/
│   └── SentinelDesk.Api/    # ASP.NET Core Web API (.NET 10)
├── frontend/                # Planned React + Vite application
└── README.md
```

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- VS Code with the C# Dev Kit extension

## Run the API

```powershell
dotnet run --project backend/SentinelDesk.Api
```

The API starts at `http://localhost:5043` by default.

- Health check: `GET /api/health`
- Development OpenAPI document: `GET /openapi/v1.json`

For example:

```powershell
Invoke-RestMethod http://localhost:5043/api/health
```

## Planned delivery order

1. C# and ASP.NET Core fundamentals
2. PostgreSQL and Entity Framework Core
3. Authentication and role-based access control
4. React dashboard and incident workflows
5. SignalR real-time events
6. Tests, documentation, and deployment polish
