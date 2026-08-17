## ADDED Requirements

### Requirement: Canonical HP1 deployment

The system SHALL run the current Apex Fit frontend and full FastAPI/PRIME backend on HP1 in reproducible containers with persistent storage, health checks, restart policy, bounded resources/logs, non-root service users, and pinned dependency inputs.

#### Scenario: Containers are recreated
- **WHEN** the HP1 Apex Fit containers are rebuilt or recreated
- **THEN** the member profile, cycles, entries, challenge/PED inventory data, reports, and persisted artifacts remain intact
- **AND** the full current API and UI capabilities remain available

#### Scenario: Health is evaluated
- **WHEN** deployment health is assessed
- **THEN** container health, HTTP responses, critical UI routes, persistence reads, and semantic data parity are checked
- **AND** an open port or API root response alone is not reported as end-to-end success

#### Scenario: Runtime dependencies are accepted
- **WHEN** the production images are prepared for cutover
- **THEN** direct runtime dependency and image advisories are recorded and reviewed
- **AND** no known critical runtime advisory is accepted silently
- **AND** any exception requires specific documented approval after regression-tested remediation options are evaluated

### Requirement: Private same-origin access

The deployed system SHALL be accessible to trusted tailnet devices through Tailscale Serve HTTPS and SHALL keep the backend, Redis, health data, and storage off the public internet.

#### Scenario: Remote trusted device opens Apex Fit
- **WHEN** a trusted tailnet device opens the HP1 Apex Fit HTTPS URL
- **THEN** the dashboard loads without requiring any service on that device's localhost
- **AND** browser API requests remain on the Apex Fit origin
- **AND** server-side routing reaches the private backend service

#### Scenario: Public client attempts access
- **WHEN** a device outside the authorized tailnet attempts to reach Apex Fit
- **THEN** the application is not publicly reachable
- **AND** no router port, Tailscale Funnel, raw backend port, or Redis port provides an alternate path

### Requirement: Single authoritative SQLite writer

The deployment SHALL migrate from the verified current workstation `data/bodyfat.db`, SHALL maintain exactly one canonical writable SQLite database after cutover, and SHALL reject the empty November 2025 NAS copy as a migration source.

#### Scenario: Canonical data is migrated
- **WHEN** the production cutover begins
- **THEN** Windows writers are stopped before the final snapshot
- **AND** source and HP1 copies pass SQLite integrity checks, cryptographic hash transfer verification, and semantic parity checks
- **AND** HP1 does not become canonical until those checks pass

#### Scenario: Cutover fails
- **WHEN** any migration, startup, route, or persistence acceptance check fails
- **THEN** HP1 is not declared canonical
- **AND** the untouched workstation database and pre-cutover backup remain available for rollback
- **AND** concurrent Windows and HP1 writers are not allowed

### Requirement: Verified Synology backup and restore

The HP1 deployment SHALL create SQLite-aware, checksummed, manifest-backed backups in a dedicated Synology Apex Fit destination and SHALL retain bounded local backups when the NAS is unavailable.

#### Scenario: Scheduled backup succeeds
- **WHEN** the backup schedule runs
- **THEN** an internally consistent SQLite snapshot and required persisted artifacts are copied to the dedicated Synology destination
- **AND** checksums, timestamps, source identity, and outcome are recorded without secrets

#### Scenario: Backup is accepted
- **WHEN** the first production backup is created or the backup mechanism changes
- **THEN** it is restored into a temporary location
- **AND** SQLite integrity and semantic data counts match the source snapshot before backup readiness is claimed

### Requirement: Safe desktop cutover and recovery

The normal Desktop launch experience SHALL open the private HP1 application after acceptance, while a clearly labeled local recovery path SHALL remain available without silently starting a second writer.

#### Scenario: User launches Apex Fit after cutover
- **WHEN** the user selects the normal Apex Fit Desktop launcher
- **THEN** the HP1 Tailscale HTTPS application opens
- **AND** the Windows API and web services are not started as concurrent writers

#### Scenario: Operator invokes documented rollback
- **WHEN** HP1 must be rolled back
- **THEN** the HP1 stack and Tailscale Serve path are stopped before the Windows recovery runtime is enabled
- **AND** the rollback procedure preserves the failed HP1 data for analysis
