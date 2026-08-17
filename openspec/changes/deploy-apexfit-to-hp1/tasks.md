## 1. Preflight and safety

- [ ] 1.1 Record HP1 Docker, Compose, Tailscale, storage, memory, and current workload evidence.
- [ ] 1.2 Record authoritative local SQLite integrity, hash, schema/counts, active cycle, latest entry, challenge/inventory, and report evidence.
- [ ] 1.3 Create and verify a timestamped stopped-writer workstation backup and artifact inventory.
- [ ] 1.4 Confirm `/opt/apexfit` ownership/space and the dedicated Synology backup destination without altering unrelated files.

## 2. Production container path

- [ ] 2.1 Create a multi-stage non-root Next.js standalone image using `npm ci` and the pinned lockfile.
- [ ] 2.2 Create a non-root full FastAPI/PRIME image using `python-api/main.py`, pinned dependencies, and a working health check.
- [ ] 2.3 Create the HP1 Compose stack with private API/Redis networking, loopback-only web binding, persistent bind mounts, restart policy, resource limits, and bounded logs.
- [ ] 2.4 Replace browser-facing localhost/Docker-host API configuration with verified same-origin proxy routing.
- [ ] 2.5 Add fail-closed environment validation without committing secrets.

## 3. Staging acceptance on HP1

- [ ] 3.1 Deploy to a non-production port using a disposable database copy.
- [ ] 3.2 Verify container health, dashboard and critical routes, full FastAPI endpoints, and no browser requests to localhost or raw API ports.
- [ ] 3.3 Verify profile/cycle/entry/report/challenge/PED inventory parity against the disposable copy.
- [ ] 3.4 Verify a reversible write/re-read path on the disposable copy and restart persistence.

## 4. Canonical data cutover

- [ ] 4.1 Stop the Windows watchdog and both services; prove ports remain down.
- [ ] 4.2 Produce the final SQLite-aware snapshot and artifact copy from the current local source of truth.
- [ ] 4.3 Transfer to HP1 staging and verify hashes plus semantic counts before starting containers.
- [ ] 4.4 Start the production stack and prove exact data parity and one-writer state.

## 5. Private access and backups

- [ ] 5.1 Configure Tailscale Serve HTTPS to the loopback-only web service; prove tailnet access and absence of public exposure.
- [ ] 5.2 Create a dedicated Synology `Backups/ApexFit` destination and an SQLite-aware backup job with checksums, manifest, logs, and bounded retention.
- [ ] 5.3 Restore the NAS backup into a temporary location and verify integrity and semantic counts.

## 6. Cutover experience and verification

- [ ] 6.1 Update the normal Desktop launch experience to open the HP1 Tailscale URL; retain clearly labeled local recovery controls.
- [ ] 6.2 Run focused backend, frontend, browser, persistence, restart, and route acceptance checks against HP1.
- [ ] 6.3 Exercise rollback without overwriting either canonical or backup data.
- [ ] 6.4 Update current documentation, operations runbook, troubleshooting, data persistence, deployment guide, verification record, changelog, and OpenSpec task state.
- [ ] 6.5 Run strict OpenSpec validation, documentation-link checks, `git diff --check`, and scoped Git publication.
