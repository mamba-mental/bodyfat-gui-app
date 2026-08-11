# Apex Fit API Documentation

**Current as of:** August 11, 2026

## Service boundaries

| Service | Local base URL | Role |
| --- | --- | --- |
| Next.js | `http://localhost:3010` | Browser UI, same-origin API routes, proxy/gateway behavior |
| FastAPI | `http://127.0.0.1:8313` | Canonical data service, PRIME calculations, report generation, challenges, inventory |

Use `GET http://127.0.0.1:8313/docs` for the runtime-generated OpenAPI schema. This document records the architectural surface and invariants; the runtime schema is authoritative for detailed Pydantic fields.

## General behavior

- The current app is single-user/local and has no authentication/tenant boundary.
- Do not expose either service to an untrusted network without authentication, authorization, TLS, input/rate limits, and test-route removal.
- JSON uses ISO `YYYY-MM-DD` for cycle/day dates and ISO timestamps for generated records.
- SQLite is canonical. Redis failures are non-fatal and must not overwrite newer SQLite data.
- List responses may omit heavy report bodies. Fetch a report detail before rendering/downloading full HTML.
- Challenge activation and amendment endpoints fail closed when source, inventory, review, or immutable-history constraints are not satisfied.

## Next.js API routes

### Canonical data gateways

| Methods | Route | Purpose |
| --- | --- | --- |
| GET, POST | `/api/data/user` | Read/save canonical member profile |
| GET, POST, DELETE | `/api/data/entries` | Read/save/delete entries; Python/SQLite is authoritative |
| GET, POST | `/api/data/cycles` | Read/upsert cycles and active-cycle state |
| GET, POST, DELETE | `/api/data/reports` | Report list/save/clear compatibility gateway |
| GET | `/api/data/reports/{id}` | Full report detail |
| POST, DELETE | `/api/data/report` | Single-report save/delete compatibility gateway |
| GET, POST | `/api/data/calculation` | Latest calculation persistence |
| GET, POST, DELETE | `/api/data` | Legacy key/value/settings compatibility route |

### Calculation and reporting

| Methods | Route | Purpose |
| --- | --- | --- |
| POST | `/api/calculate` | Gateway to PRIME `/calculate` |
| POST | `/api/calculate/recalculate` | Gateway to `/recalculate` |
| POST | `/api/generate-report` | Standard report generation gateway |
| POST | `/api/generate-living-report` | Living Report gateway |
| POST, GET | `/api/reports/generate` | Report generation/status workflow |
| POST | `/api/reports/verify` | Numerical/presentation verification workflow |
| GET | `/api/reports/files/{filename}` | Serve a generated report artifact by validated filename |
| GET | `/api/entries/history` | Historical entry query/integrity response |
| GET | `/api/dashboard/state` | Dashboard production-state diagnostic |

### Nutrition, AI, settings, and support

| Methods | Route | Purpose |
| --- | --- | --- |
| GET, POST, DELETE | `/api/nutrition` | Local nutrition history/manual import/delete operations |
| POST | `/api/ai/chat` | Configured-provider chat gateway |
| POST | `/api/ai/insights` | Configured-provider insights gateway |
| GET, POST, DELETE | `/api/ai/settings` | AI provider settings persistence |
| POST | `/api/ai/fetch-models` | Provider model discovery |
| POST | `/api/ai/test-connection` | Provider connection test |
| GET, PUT | `/api/theme` | Theme preference read/update |
| POST, DELETE | `/api/upload` | Validated image upload/delete |
| GET | `/api/sync/status` | Local/cloud sync readiness |
| GET | `/api/health/redis` | Redis health diagnostic |

### Redis compatibility routes

`/api/redis/user`, `/api/redis/entries`, `/api/redis/reports`, `/api/redis/calculation`, and `/api/redis/export` remain compatibility/cache endpoints. They are not the authoritative data API and must not be used to prove that a profile, entry, cycle, report, or challenge revision is durable.

## FastAPI routes

### Health and calculations

| Methods | Route | Purpose |
| --- | --- | --- |
| GET | `/` | Returns API service JSON; not a dashboard |
| GET | `/health` | Data-service health |
| POST | `/calculate` | PRIME progression/calorie/body-composition calculation |
| POST | `/recalculate` | Recalculate from changed/current inputs |
| POST | `/rmr` | Resting metabolic rate calculation |
| POST | `/tdee` | Total daily energy expenditure calculation |
| GET | `/performance/stats` | Local performance diagnostics |
| POST | `/performance/clear-cache` | Clear calculation performance cache |

### Canonical data

| Methods | Route | Purpose |
| --- | --- | --- |
| GET, POST | `/api/data/user` | Profile read/upsert for user `default` |
| GET, POST | `/api/data/entries` | Entry list/insert |
| DELETE | `/api/data/entries/{entry_id}` | Idempotent entry deletion target |
| GET, POST | `/api/data/cycles` | Cycle list/upsert and one-active-cycle enforcement |
| GET | `/api/data/reports` | Lightweight report list |
| POST | `/api/data/report` | Save report metadata/content |
| GET | `/api/data/reports/{report_id}` | Full report detail |
| GET, POST | `/api/data/calculation` | Latest calculation read/save |
| GET, POST | `/api/data/route` | Legacy settings/key-value compatibility |

### Programs

| Methods | Route | Purpose |
| --- | --- | --- |
| GET | `/api/programs` | Program archive/current-program list |
| POST | `/api/programs/archive` | Legacy program archive/start behavior |
| GET | `/api/programs/{program_id}` | Program detail |
| GET | `/api/programs/{program_id}/entries` | Program-scoped entries |
| GET | `/api/programs/{program_id}/compare` | Program comparison |

The current UI's repaired new-standard-program flow also creates/upserts a first-class cycle and saves the edited profile baseline. Program/cycle creation is compensated client-side on failure but is not yet one atomic backend transaction.

### 14-day challenges and templates

| Methods | Route | Purpose |
| --- | --- | --- |
| POST | `/api/data/challenges/preview` | Build exact 14-day PRIME-backed preview |
| POST | `/api/data/challenges` | Activate a ready challenge snapshot |
| GET | `/api/data/challenge-templates` | List templates |
| GET | `/api/data/challenge-templates/{template_id}` | Template detail |
| POST | `/api/data/challenge-templates/import-default` | Deterministic default import |
| GET, POST | `/api/data/challenge-templates/{template_id}/revisions` | Revision history/create |
| PUT | `/api/data/challenge-templates/{template_id}/status` | Draft/reviewed/active/superseded status |
| GET | `/api/data/ped-protocols/catalog` | Available source protocol revisions |
| POST | `/api/data/ped-protocols/window` | Exact two-consecutive-week source window |
| GET, POST | `/api/data/challenges/{cycle_id}/plan-revisions` | Immutable plan revisions |
| GET, POST | `/api/data/challenges/{cycle_id}/amendments` | Future-effective amendments |
| GET | `/api/data/challenges/{cycle_id}/daily-logs` | Daily challenge actuals |
| PUT | `/api/data/challenges/{cycle_id}/daily-logs/{day_number}` | Save one day's log |
| POST | `/api/data/challenges/{cycle_id}/report` | Progress/final/stopped-early report |
| POST | `/api/data/challenges/{cycle_id}/amend` | Validate/apply explicit amendment |

### PED inventory MVP

| Methods | Route | Purpose |
| --- | --- | --- |
| GET | `/api/data/ped-inventory` | List manual inventory records |
| POST | `/api/data/ped-inventory` | Create an inventory record |
| PUT | `/api/data/ped-inventory/{item_id}` | Update/confirm an inventory record |
| DELETE | `/api/data/ped-inventory/{item_id}` | Remove inventory for future previews |
| POST | `/api/data/ped-inventory/coverage` | Deterministic event-to-inventory coverage and blockers |

These endpoints do not choose a protocol, recommend a compound, invent a dose, or establish medical safety.

### Reports and AI

| Methods | Route | Purpose |
| --- | --- | --- |
| POST | `/generate-report` | Standard report artifact generation |
| POST | `/generate-living-report` | Cycle-scoped Living Report generation |
| POST | `/ai/insights` | AI insight generation when configured |
| POST | `/ai/analyze-progress` | AI progress analysis |
| POST | `/ai/entry-feedback` | AI feedback for an entry |

## Important request/response invariants

- `/calculate` accepts a `user_data` body model plus optional AI settings; Next gateways may wrap the browser payload to match FastAPI's multiple-body-parameter contract.
- A two-week request uses `plan_mode="two_week_cut"` and exactly `timeline_days=14`; it maps to two PRIME weeks without date rounding.
- A confirmed generic `ped_use` flag is not sufficient for 14-day activation. A selected, versioned source window and frozen protocol/inventory/review snapshot are required.
- Report scope and `cycle_id` must be explicit. No-active-cycle means aggregate rather than newest stopped cycle.
- `source_fingerprint` is used to prevent equivalent duplicate report generation.
- Unknown/ranged protocol data remains visibly unknown/ranged and blocks activation until the contract's separate review requirement is met.

## n8n is not an API endpoint

The browser directly posts to the user-configured n8n URL after a successful standard report. Apex Fit supplies an idempotency key but does not persist/enforce it. See [docs/N8N-WEIGH-IN-AUTOMATION.md](docs/N8N-WEIGH-IN-AUTOMATION.md).
