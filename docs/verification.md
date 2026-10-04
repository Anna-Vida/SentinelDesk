# Verification status — 2026-10-04

The MVP implementation is in the review branch. It has not been merged into `main` or publicly deployed.

## Passed locally

- .NET 10 API and test project builds.
- Six API integration tests using an isolated SQLite store: authentication, role enforcement, CSRF, incident workflow and archival, evidence linking, validation, account creation/logout, and counts larger than 100 incidents.
- Frontend TypeScript production build and ESLint.
- EF Core reports no pending model changes after the additive Identity migration.
- The Analytics change that landed on `main` during this work was merged and its design preserved. Its metrics now query the full database.

## Still required before merging

- PostgreSQL integration suite, including migration application and case-insensitive search. The PostgreSQL-specific test is explicitly skipped when `TEST_DATABASE_URL` is absent.
- Playwright browser flows: two-session live updates; create/edit/advance/archive an incident; record/link evidence; analytics/settings; mobile Viewer permissions.
- Build and run the Docker image.

GitHub Actions did not start. Its annotation says: “The job was not started because your account is locked due to a billing issue.” Resolve that account issue before rerunning the workflow.

A local Chromium launch was also blocked by this execution environment's socket restrictions. An attempted PostgreSQL-compatible PGlite fallback could not complete the Npgsql wire-protocol handshake; it is not counted as PostgreSQL verification. No application database or production data was used.

## Run the remaining checks

1. Use a fresh disposable PostgreSQL database. Set `TEST_DATABASE_URL` to its connection string, then run `dotnet test SentinelDesk.slnx`.
2. Start the API against that database in Development. The API tests create fixture-only `admin@example.test` and `viewer@example.test` accounts using `Test-Only-Password123!`.
3. From `frontend/SentinelDesk.Web`, run `npm ci`, `npx playwright install chromium`, and `npm run test:e2e` with `E2E_EMAIL=admin@example.test` and `E2E_PASSWORD=Test-Only-Password123!`.
4. Follow the root README's Docker setup using separate local credentials.

Do not run test fixtures against a real workspace database.
