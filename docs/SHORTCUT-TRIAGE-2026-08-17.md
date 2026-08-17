# Desktop Shortcut Triage — August 17, 2026

This is a point-in-time read-only inventory of shortcut files under the personal Desktop, OneDrive Desktop, Public Desktop, and their nested folders. Only the two Apex shortcuts and their runtime controls were changed. Every unrelated finding below is evidence for a later, separately approved cleanup.

## Apex repair and proof

- Backed up both `.lnk` files and both `.cmd` wrappers to `C:\Users\tiran\OneDrive\Documents\Shortcut Backups\ApexFit-20260817-190717` and verified the copies before editing.
- Repointed **ApexFit Tracker** and **Stop ApexFit** to the current repository and valid working directory.
- Updated both wrappers to the current repository path.
- Replaced `npx next dev` with the pinned local dependency path through `npm run dev`. This prevents an interactive installation of a different Next.js major version.
- Restored `package.json`, `package-lock.json`, and `node_modules` from the locked project state after the failed prompt installed incompatible TypeScript package versions.
- Added HTTP readiness checks so an open-but-hung socket is not reported as a healthy dashboard.
- Added a no-admin supervisor stop marker. Start pauses the watchdog, launches one canonical app copy, and starts the watchdog only after health succeeds. Stop creates the marker before ending the watchdog and both listeners.
- Exercised the actual Desktop links. Start returned HTTP 200 from ports 8313 and 3010. Stop left both ports down, the marker present, and no supervisor process after 25 seconds.

## Inventory result

The recursive scan found 134 shortcut files:

| Classification | Count | Meaning |
| --- | ---: | --- |
| Direct target exists | 116 | The `.lnk` target exists; argument and working-directory checks still matter |
| Direct target missing | 12 | The saved filesystem target does not currently exist |
| Shell/app shortcut unresolved by WScript | 4 | Not automatically broken; these require package or launch-specific inspection |
| Web URL syntactically valid | 2 | One returned HTTP 200; one returned HTTP 403 and may require authentication |

All eleven explicit script/document argument paths checked during the second pass exist. The `claude` command also resolves correctly.

## Unrelated items needing attention

### Missing targets

- `C:\Users\tiran\Desktop\Terminal Canary.lnk` points to the removed Canary package version `1.25.3001.0`. Canary `1.26.2182.0` is installed, so this version-pinned link is stale.
- Eleven shortcuts under the nested **DESKTOP TWO** tree point to a currently unavailable `G:` drive or the missing `C:\Users\tiran\OneDrive - UPWARD INTEGRATED INC` tree. These may need the business OneDrive/GDrive remounted before deciding whether the links themselves should change.

### Existing targets with stale working directories

- **Claudia Dev** starts in missing `C:\GitHub_Projects\claudia`. Its target batch file also contains PowerShell file-creation text rather than a valid batch launch sequence, so this shortcut is not operational as saved.
- Two **Fathom** links start in removed versions `app-1.25.0` and `app-1.40.0`; the installed folder is `app-1.42.6`.
- **GitHub Desktop** starts in removed `app-3.4.20`; the installed folder is `app-3.5.12`.

### Special and web links

- Terminal Preview and the shell-style Terminal Canary shortcut do not expose a normal target through WScript, but their Windows packages are installed and healthy. They were not launched during this read-only triage.
- **Formed LLCs (UI2 OneDrive)** and **My LastPass Vault** are also shell/app-style links and were left unclassified rather than falsely marked broken.
- **spotlight.url** returned HTTP 200.
- **GnomeIt - Tonight Testing Guide.url** returned HTTP 403. That can mean an authenticated/protected destination rather than a dead URL, so it was not changed.

## Boundary

No unrelated shortcut, business-cloud path, application launcher, scheduled task, or web link was modified. This report should be refreshed before any later bulk repair because installed application versions and mounted cloud-storage paths can change.
