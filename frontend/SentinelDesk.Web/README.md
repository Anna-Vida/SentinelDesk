# SentinelDesk Web

React 19 + TypeScript + Vite frontend. See the repository [README](../../README.md) for database, account bootstrap, testing and deployment instructions.

```sh
npm ci
npm run dev
```

The API must run on `http://localhost:5043`. Open `http://localhost:5173`; Vite proxies API and SignalR requests through the same origin.

```sh
npm run lint
npm run build
npm run test:e2e
```

Browser tests require `E2E_EMAIL` and `E2E_PASSWORD` for a disposable test administrator account and a running API. No credentials are embedded in the frontend.
