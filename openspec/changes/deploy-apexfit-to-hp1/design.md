## Context

The current daily-use topology is Windows-supervised Next.js on port 3010 and FastAPI on port 8313, with SQLite at `data/bodyfat.db` and optional Redis in WSL. Live inspection on August 17, 2026 established:

- HP1: 8 logical CPUs, 32 GB RAM, approximately 23.5 GB available memory, approximately 657 GB free NVMe space, low load, Docker 29.6.1, Compose 5.2.0, Tailscale 1.102.2.
- HP2: heavier container and disk pressure; not preferred.
- GMK mini-PC: faster CPU but less available memory and an existing Kubernetes role; not preferred for this small stateful app.
- Synology: appropriate backup destination but not the primary runtime host.
- Current local SQLite: 22,384,640 bytes, SHA-256 `8B1F5A61B041DF7FADD224213A59B90D68CA871B1AD8329368AAC5D758529C23`, current profile/history present.
- NAS candidate: 4,915,200 bytes, modified November 16, 2025, different hash, SQLite `quick_check=ok`, zero entries. It is historical junk, not a migration candidate.

## Goals / Non-Goals

- Goals:
  - Make Apex Fit continuously available from trusted tailnet devices.
  - Preserve the exact current profile, cycles, entries, challenge/PED inventory data, reports, and artifacts.
  - Maintain one authoritative writer and a tested rollback.
  - Remove reliance on client-side localhost API addresses.
  - Produce recoverable NAS backups.
- Non-Goals:
  - Public internet access.
  - Multi-user authentication or tenancy.
  - Changing calculation, PED, report, cycle, or UI behavior.
  - Treating Redis or a NAS copy as authoritative.

## Decisions

### HP1 is the runtime host

HP1 has the best current balance of available memory, free NVMe storage, low load, Docker maturity, and tailnet availability. Synology remains the backup target.

### Tailnet-only HTTPS

Compose SHALL bind the web entry point to `127.0.0.1` on HP1. Tailscale Serve SHALL publish that loopback service under HP1's tailnet HTTPS name. The backend and Redis SHALL remain on the private Compose network with no LAN/public host port.

Because the application has no user login gate, tailnet identity is the access boundary. Tailscale Funnel and router port forwarding are forbidden for this deployment.

### Same-origin browser API

The browser SHALL call the Apex web origin. Next.js server routes or an internal reverse-proxy path SHALL call `http://api:8000` on the Compose network. No `NEXT_PUBLIC_*` browser value may point at localhost, HP1's raw API port, or a Docker service hostname.

### SQLite single-writer cutover

The Windows services SHALL be stopped before the final migration snapshot. The source database SHALL pass `PRAGMA quick_check`, be copied with a stopped writer or SQLite backup operation, and be verified by size, SHA-256, table counts, latest entry date, active-cycle count, and critical challenge/report counts before HP1 becomes canonical.

The original workstation database and a timestamped pre-cutover backup remain untouched for rollback. Windows services SHALL not restart as a second writer after cutover.

### Persistent HP1 paths

Use explicit host bind mounts under `/opt/apexfit/` for data, report artifacts, uploads/exports, configuration, and operational backups. Container recreation MUST NOT remove member data. Generated caches and application images remain replaceable.

### Synology backup contract

Use a dedicated `/volume1/Backups/ApexFit/` destination. Backups SHALL be generated with SQLite-aware semantics, include checksums and a manifest, avoid secrets, use bounded retention, and be restore-tested to a temporary location before the first deployment is accepted.

## Risks / Trade-offs

- SQLite corruption or split-brain during migration -> stop Windows writers, verify source and destination, and retain rollback copies.
- Missing feature parity in the existing simplified backend image -> build the full `python-api/main.py` service and run route/persistence acceptance tests.
- Health endpoint passes while UI or persistence fails -> require browser route checks and data read/re-read checks, not container health alone.
- No in-app authentication -> restrict to Tailscale Serve; do not publish publicly.
- Current production audit reports critical advisories affecting direct `next` and `jspdf` dependencies -> update and regression-test supported versions before cutover, or stop for an explicit documented exception; never run a breaking audit fix blindly.
- Tailnet/DNS outage -> retain a documented HP1 loopback/LAN administrative recovery path without opening it permanently.
- NAS unavailable during backup -> keep bounded local HP1 backups and surface backup failure without stopping the app.

## Migration Plan

1. Build and test the production stack on HP1 against a disposable copy of the database and non-production ports.
2. Verify UI routes, full FastAPI routes, profile/cycle/entry/report parity, and writes against the disposable copy.
3. Stop the Windows Apex services and watchdog; create and verify a timestamped local backup.
4. Copy the authoritative SQLite database and required artifacts to HP1 staging; re-verify hashes and semantic counts.
5. Start the HP1 stack, perform acceptance checks, and configure tailnet-only Tailscale Serve HTTPS.
6. Create and restore-test the first Synology backup.
7. Mark HP1 canonical, update launchers/docs, and keep the Windows copy stopped.

Rollback: stop the HP1 stack, disable Tailscale Serve, preserve the failed deployment data, restore the untouched workstation database if needed, remove the Windows stop marker, and restart the verified local lifecycle.

## Open Questions

- Exact Tailscale HTTPS hostname/path to present in the final shortcut after Serve is configured.
- Backup retention target after measuring the first compressed backup size; proposed default is 14 daily plus 8 weekly copies.
