# Apex Fit Data Persistence

**Current as of:** August 11, 2026

## What persists where

| Data | Store | Authority |
| --- | --- | --- |
| Profile and program baseline | `data/bodyfat.db` | Canonical |
| Entries and cycle association | `data/bodyfat.db` | Canonical |
| Standard/two-week cycles and weigh-in schedule | `data/bodyfat.db` | Canonical |
| Calculations and report records | `data/bodyfat.db` | Canonical |
| Two-week templates/revisions/logs/amendments | `data/bodyfat.db` | Canonical |
| Manual PED inventory and frozen coverage | `data/bodyfat.db` | Canonical |
| HTML/Markdown/PDF report files | `storage/reports/` | Artifact store; linked from canonical records |
| Theme/palette and selected local Settings values | Browser and/or settings endpoints | Preference only |
| n8n webhook URL | Browser localStorage | Single-browser preference/secret-like URL |
| Redis keys | Optional Redis cache | Never authoritative |
| Cloud copy | None | Cloud writes disabled |

## History behavior

- Starting a new program does not wipe the profile, entries, or reports.
- The existing profile is copied into an editable form and saved as the new baseline.
- The prior active cycle is stopped and remains available as history.
- An entry is saved to SQLite before it is accepted into the UI as durable.
- A report is generated explicitly and stored as a new historical record. Duplicate source fingerprints are gated in Report Center.
- Activated 14-day snapshots remain reproducible even if the editable template or inventory later changes.

## Backups

The application uses `data/backups/` for local database backups. A backup of the database before the August 11 cycle repair is retained at:

```text
data/backups/bodyfat-before-2026-08-11-cycle-repair.db
```

This path may be gitignored and must not be treated as a remote/off-machine backup. Maintain a separate protected copy for disaster recovery.

Recommended backup set:

1. `data/bodyfat.db`
2. `storage/reports/`
3. `public/uploads/` if member photos/banners are used
4. required local settings files, excluding reusable provider secrets from casual archives

## Export/import status

Legacy Redis/JSON export routes and older manuals do not define the current canonical backup contract. Do not assume a browser JSON export contains every cycle, challenge revision, inventory record, report artifact, or source fingerprint. Until a verified full export/import test covers the current schema, use database plus artifact backups.

## Security and privacy

- SQLite, uploads, report artifacts, logs, and backups can contain sensitive health and protocol information.
- They are local, but not automatically encrypted at rest by Apex Fit.
- Do not commit them, sync them to an untrusted location, or paste them into AI prompts without deliberate consent and minimization.
- Cloud sync, authentication, tenant isolation, and server-side webhook credential storage are future capabilities.

## Docker volumes

The repository contains Docker Compose candidates with named/bind volumes, but the verified daily-use topology is not the full Docker stack. Validate mounts and make a backup before using a Compose file. Do not infer that `apexfit-data` contains the active workstation database unless the running container's resolved mount proves it.
