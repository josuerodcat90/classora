# Classora technical test

A security ticket list with URL-synchronized filters and optimistic due date updates. The app runs against an in-memory mock; no backend is required.

## Run locally

CI uses Node.js 24 and pnpm 12.8.1.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite. The app starts with the simulated `mock-editor` user, who can update tickets. The mock also supports a read-only `mock-viewer` token for tests; there is no user selector in the app.

The mock uses a service worker, so the browser must support service workers (localhost or HTTPS). Reloading resets the deterministic data; changes do not persist or sync across tabs. Mock tokens and UI permission checks are not real authentication or authorization.

## Using the app

Search and filter tickets by state or severity, choose the sort order, and navigate between pages. Filters are reflected in the URL so you can share it or use the browser's back and forward buttons.

Use the row action to set a commitment date on an eligible ticket. The change appears immediately and is reverted if saving fails.

## Checks

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm openapi:lint
pnpm prettier:check
pnpm build
```

## Project guide

- [`openapi-rest.yml`](openapi-rest.yml): API contract, including its documented assumptions.
- [`src/pages/TicketsPage/`](src/pages/TicketsPage/): ticket page.
- [`src/components/`](src/components/): filters, ticket list, and date editor.
- [`src/hooks/`](src/hooks/): URL filters, queries, permissions, and optimistic updates.
- [`src/services/`](src/services/): HTTP transport and API services.
- [`src/mocks/ticket-api.ts`](src/mocks/ticket-api.ts): in-memory API behavior.

The OpenAPI server URL is fictitious. `pnpm openapi:lint` validates the contract, not a deployed backend.
