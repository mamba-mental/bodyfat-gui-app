# Change: Deploy Apex Fit privately to HP1

## Why

Apex Fit currently depends on Windows desktop launchers and is unavailable when the workstation is off or the user is away. HP1 is an always-on Docker host with sufficient free memory and NVMe storage, while Tailscale can provide private HTTPS access without exposing health, PED, profile, or AI configuration data to the public internet.

The existing Docker files cannot be deployed unchanged: the default backend image runs `main_simple.py` instead of the full FastAPI application, and the frontend build embeds a browser-facing localhost API URL. Database provenance must also be explicit. The current local `data/bodyfat.db` is authoritative; the only NAS file found is an empty November 2025 backup and MUST NOT become the migration source.

## What Changes

- Create a production Compose stack for HP1 using the current Next.js application, full FastAPI/PRIME backend, and optional non-authoritative Redis cache.
- Route browser data calls through the frontend/reverse-proxy origin; never require a remote browser to reach `localhost:8313` or a Docker-only hostname.
- Bind the web service to HP1 loopback and publish it privately with Tailscale Serve HTTPS. Do not open a router port or use Tailscale Funnel.
- Migrate a stopped-writer, integrity-checked copy of the current local SQLite database and required report/upload artifacts to HP1 persistent storage.
- Enforce one canonical writable SQLite database after cutover; the Windows runtime becomes a documented recovery/development path rather than a concurrent writer.
- Add health checks, restart policy, non-root containers, pinned base images, bounded logs/resources, and secret injection outside committed files.
- Triage production dependency advisories and block cutover on known critical runtime vulnerabilities unless a specific, documented exception is approved.
- Add verified SQLite backups from HP1 to a dedicated Synology `Backups/ApexFit` location with retention and restore evidence.
- After acceptance, update the Desktop launch experience to open the private HP1 URL and retain clearly labeled local recovery controls.

## Impact

- Affected specs: new `deployment` capability.
- Affected code: Dockerfiles, Compose configuration, frontend/API routing configuration, deployment/backup scripts, Desktop launch documentation, runbook, troubleshooting, current status, and verification evidence.
- External systems: HP1 Docker/Compose and Tailscale Serve; Synology backup storage.
- Data migration: canonical SQLite and report/upload artifacts move from the workstation to HP1 after stopped-writer verification.
- Security boundary: tailnet-only access; no public internet exposure and no secrets committed to Git.
