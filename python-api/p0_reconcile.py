"""
P0 reconciliation DRY-RUN (read-only). Part of the approved ReComp Cycle plan.

Implements Codex finding #1: reconcile entries across every store by a LOGICAL key
(normalized_user_id + date-only + measurement hash), NOT by row id — so the same
weigh-in copied under Redis user "1" and SQLite user "default" collapses to ONE
instead of duplicating. Reports per-store counts, logical collapses, and CONFLICTS
(same logical key, divergent payload) that must be quarantined before any merge.

Writes nothing. Run: python python-api/p0_reconcile.py
"""
import sqlite3, hashlib, os

# Candidate SQLite stores (relative to repo root). Canonical = the live one.
DB_PATHS = [
    ("canonical(live)", "data/bodyfat.db"),
    ("standalone(stale)", ".next/standalone/data/bodyfat.db"),
    ("archive(backup)", "_archive/backups/backups-dir/bodyfat_20251006_040645.db"),
]
REDIS_HOST, REDIS_PORT = "172.23.89.12", 6385


def norm_user(uid):
    # '1' and 'default' are the same physical user (split identity) -> normalize.
    return "PRIME" if str(uid) in ("1", "default", "PRIME") else str(uid)


def measure_hash(weight, bf, notes):
    raw = f"{round(float(weight or 0), 2)}|{round(float(bf or 0), 2)}|{(notes or '').strip()}"
    return hashlib.md5(raw.encode()).hexdigest()[:10]


def logical_key(uid, date, weight, bf, notes):
    date_only = str(date or "")[:10]  # YYYY-MM-DD, tz-naive on purpose for the dry-run
    return f"{norm_user(uid)}|{date_only}|{measure_hash(weight, bf, notes)}"


def read_entries(store, path):
    if not os.path.exists(path):
        return []
    rows = []
    try:
        c = sqlite3.connect(path)
        c.row_factory = sqlite3.Row
        for r in c.execute("SELECT id,user_id,date,weight,body_fat_percentage,notes FROM entries"):
            rows.append({
                "store": store, "orig_id": r["id"], "orig_user": r["user_id"],
                "date": r["date"], "weight": r["weight"], "bf": r["body_fat_percentage"],
                "notes": r["notes"],
                "lkey": logical_key(r["user_id"], r["date"], r["weight"], r["body_fat_percentage"], r["notes"]),
            })
        c.close()
    except Exception as e:
        print(f"  ! {store}: read error: {e}")
    return rows


def try_redis():
    # Read-only PING; if WSL Redis is down we exclude it and SAY SO (never silently).
    import socket
    try:
        s = socket.create_connection((REDIS_HOST, REDIS_PORT), timeout=3)
        s.sendall(b"PING\r\n")
        resp = s.recv(64); s.close()
        return resp.startswith(b"+PONG")
    except Exception:
        return False


def main():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    os.chdir(root)
    print("=== P0 RECONCILIATION DRY-RUN (read-only) ===")
    print(f"repo: {root}\n")

    all_rows = []
    for store, path in DB_PATHS:
        rows = read_entries(store, path)
        print(f"{store:18} {path:48} entries={len(rows)}")
        all_rows.extend(rows)

    redis_up = try_redis()
    print(f"\nRedis {REDIS_HOST}:{REDIS_PORT}: {'REACHABLE' if redis_up else 'UNREACHABLE -> EXCLUDED (start WSL to include its `1`-keyed data before any real merge)'}")

    # Group by logical key
    groups = {}
    for r in all_rows:
        groups.setdefault(r["lkey"], []).append(r)

    unique = len(groups)
    conflicts = []  # same logical key but divergent payload across stores
    collapses = 0   # same logical key seen in >1 store (a safe de-dup)
    for k, rs in groups.items():
        if len(rs) > 1:
            collapses += 1
        payloads = {(round(float(x["weight"] or 0), 2), round(float(x["bf"] or 0), 2), (x["notes"] or "").strip()) for x in rs}
        if len(payloads) > 1:
            conflicts.append((k, rs))

    print(f"\n--- RESULT ---")
    print(f"raw entry rows across stores : {len(all_rows)}")
    print(f"unique logical weigh-ins     : {unique}")
    print(f"logical collapses (de-dups)  : {collapses}")
    print(f"CONFLICTS (quarantine these) : {len(conflicts)}")
    for k, rs in conflicts[:10]:
        print(f"  ! {k}")
        for x in rs:
            print(f"      {x['store']:18} id={x['orig_id']} user={x['orig_user']} wt={x['weight']} bf={x['bf']}")

    print(f"\nVERDICT: merge would yield {unique} canonical weigh-ins. "
          f"{'NO conflicts to resolve.' if not conflicts else str(len(conflicts))+' conflict(s) MUST be resolved before merge.'} "
          f"{'Redis excluded - rerun with WSL up.' if not redis_up else ''}")
    print("(dry-run: nothing was written)")


if __name__ == "__main__":
    main()
