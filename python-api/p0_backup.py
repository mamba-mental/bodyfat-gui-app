"""
P0 restore-proven backup (Codex finding #2). Part of the approved ReComp Cycle plan.

Uses SQLite's ONLINE BACKUP API: takes a consistent snapshot of the live DB that
INCLUDES any WAL-pending transactions, WITHOUT checkpointing or mutating the live
file (safe even while the Python API is writing). Then it RESTORE-DRILLS the backup:
opens it, counts every table, and asserts the counts match the source -> proves the
backup is actually restorable, not just a file copy.

Run: python python-api/p0_backup.py    (creates data/backups/p0/bodyfat_p0_<ts>.db)
"""
import sqlite3, hashlib, os, datetime

LIVE = "data/bodyfat.db"  # canonical/live store per p0 inventory (newest updated_at, matches :8313)
TABLES = ["entries", "reports", "users", "calculations"]


def counts(db):
    c = sqlite3.connect(db)
    out = {}
    for t in TABLES:
        try:
            out[t] = c.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        except Exception:
            out[t] = None
    c.close()
    return out


def md5(p):
    h = hashlib.md5()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    os.chdir(root)
    if not os.path.exists(LIVE):
        print(f"ABORT: live DB not found at {LIVE}")
        return 1

    src_counts = counts(LIVE)
    wal = os.path.exists(LIVE + "-wal")
    print("=== P0 RESTORE-PROVEN BACKUP ===")
    print(f"live   : {LIVE}  (WAL pending: {wal})")
    print(f"counts : {src_counts}")

    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    bdir = os.path.join("data", "backups", "p0")
    os.makedirs(bdir, exist_ok=True)
    bpath = os.path.join(bdir, f"bodyfat_p0_{ts}.db")

    # Online backup: consistent snapshot incl. WAL, live DB untouched.
    src = sqlite3.connect(LIVE)
    dst = sqlite3.connect(bpath)
    try:
        src.backup(dst)
    finally:
        dst.close()
        src.close()

    bk_counts = counts(bpath)
    ok = bk_counts == src_counts
    print(f"backup : {bpath}")
    print(f"counts : {bk_counts}")
    print(f"size   : {os.path.getsize(bpath)} B   md5={md5(bpath)[:12]}")
    print(f"\nRESTORE DRILL: backup opens + every table count {'MATCHES' if ok else 'DOES NOT MATCH'} the live DB -> "
          f"{'RESTORABLE [OK]' if ok else 'FAILED [X]'}")
    if not ok:
        print("ABORT condition: do NOT proceed to migration on a backup that does not verify.")
        return 2
    print("(live DB was not modified)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
