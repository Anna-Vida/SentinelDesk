# SentinelDesk Web

React and TypeScript security operations dashboard for the SentinelDesk API.

## Local development

1. Copy `.env.example` to `.env` and adjust `VITE_API_BASE_URL` if needed.
2. Start the backend at `http://localhost:5043`.
3. Install and run the frontend:

   ```bash
   npm install
   npm run dev
   ```

The app runs at `http://localhost:5173`. Production assets can be checked with
`npm run build`.

The dashboard consumes the REST API and subscribes to `/hubs/security` for live
incident and security-event updates. No polling is used.
