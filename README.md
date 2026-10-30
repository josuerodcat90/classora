# Classora technical test

## Run locally

Install dependencies and start the development server:

```sh
pnpm install
pnpm dev
```

Open the local URL printed by Vite in your browser. To run the tests, type check, and build:

```sh
pnpm test
pnpm typecheck
pnpm build
```

## Browser mock

The application uses Mock Service Worker (MSW) to intercept same-origin `/api/v1/` requests and serve an in-memory mock. The browser must support service workers (localhost or HTTPS). Reloading the page creates a fresh deterministic seed; changes do not persist or sync across tabs. Use `Authorization: Bearer mock-editor` for `tickets.update`, or `Authorization: Bearer mock-viewer` for read-only access. These fixed tokens are simulation fixtures, not authentication or security. Other requests pass through to the browser's normal fetch. Tests exercise the same handlers through MSW's Node interceptor.

For persistence later, replace the in-memory ticket repository with a real backend implementing the OpenAPI contract, and replace these fixtures with real authentication and server-side authorization. Do not persist the mock tokens or treat browser-side permission checks as security.

## OpenAPI contract

Run `pnpm run openapi:lint` to validate [`openapi-rest.yml`](openapi-rest.yml) with Redocly's recommended rules. The pinned validator gives contributors and CI a reproducible check that catches structural errors, broken references, and invalid examples before merge. Pull requests run the same check.

The configuration disables `info-license` because the license is unknown and `no-server-example.com` because the server URL is fictitious. Invalid parameter and schema examples are errors. Linting checks the contract, not whether a deployed service implements it or whether its assumptions match the exercise. The HTTPS-only server requirement is reviewed separately.
