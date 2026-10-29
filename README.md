# Classora technical test

## OpenAPI contract

Run `pnpm run openapi:lint` to validate [`openapi-rest.yml`](openapi-rest.yml) with Redocly's recommended rules. The pinned validator gives contributors and CI a reproducible check that catches structural errors, broken references, and invalid examples before merge. Pull requests run the same check.

The configuration disables `info-license` because the license is unknown and `no-server-example.com` because the server URL is fictitious. Invalid parameter and schema examples are errors. Linting checks the contract, not whether a deployed service implements it or whether its assumptions match the exercise. The HTTPS-only server requirement is reviewed separately.
