"""ApexFit start/stop lifecycle — the engine behind the desktop shortcuts.

Dependency-free (stdlib only). The .cmd shortcuts call:
    python _ops/apex_lifecycle.py start
    python _ops/apex_lifecycle.py stop
so the logic that ships is the logic that's tested.
"""
from __future__ import annotations

import os
import re
import socket
import subprocess
import time
from pathlib import Path

API_PORT = 8313
WEB_PORT = 3010

# _ops/ lives directly under the app root.
APP_DIR = Path(__file__).resolve().parent.parent
API_DIR = APP_DIR / "python-api"
BRAVE = r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"

# Windows: detach so the spawned servers outlive this launcher process.
_DETACHED = 0x00000008 | 0x00000200  # DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP

_LISTEN_RE = re.compile(r":(\d+)\s+\S+\s+LISTENING\s+(\d+)", re.IGNORECASE)


def port_up(port: int, host: str = "127.0.0.1", timeout: float = 1.0) -> bool:
    """True if something is accepting TCP connections on host:port."""
    s = socket.socket()
    s.settimeout(timeout)
    try:
        return s.connect_ex((host, port)) == 0
    except OSError:
        return False
    finally:
        s.close()


def listeners(port: int) -> list[int]:
    """PIDs holding a LISTENING socket on the given local port (Windows netstat)."""
    try:
        out = subprocess.run(
            ["netstat", "-ano", "-p", "TCP"],
            capture_output=True, text=True, timeout=10,
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return []
    pids: list[int] = []
    for line in out.splitlines():
        m = _LISTEN_RE.search(line)
        if m and int(m.group(1)) == port:
            pid = int(m.group(2))
            if pid not in pids:
                pids.append(pid)
    return pids


def stop(ports: list[int]) -> dict[int, list[int]]:
    """Force-kill whatever is listening on each port. Idempotent: a port with no
    listener yields an empty list and never raises."""
    killed: dict[int, list[int]] = {}
    for port in ports:
        done: list[int] = []
        for pid in listeners(port):
            try:
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(pid)],
                    capture_output=True, text=True, timeout=10,
                )
                done.append(pid)
            except (OSError, subprocess.SubprocessError):
                pass
        killed[port] = done
    return killed


def status(ports: list[int]) -> dict[int, bool]:
    return {p: port_up(p) for p in ports}


def _spawn_detached(command: str, cwd: Path) -> None:
    """Launch a background server that survives this process exiting."""
    subprocess.Popen(
        command,
        cwd=str(cwd),
        shell=True,
        creationflags=_DETACHED,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        close_fds=True,
    )


def open_app(url: str = f"http://localhost:{WEB_PORT}") -> None:
    if os.path.exists(BRAVE):
        subprocess.Popen([BRAVE, url], creationflags=_DETACHED,
                         stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                         stderr=subprocess.DEVNULL, close_fds=True)
    else:
        os.startfile(url)  # type: ignore[attr-defined]


def start(open_browser: bool = True, wait: float = 45.0) -> dict[int, bool]:
    """Start API + web if their ports are down, wait until both are reachable,
    then (optionally) open the browser. Idempotent: already-up servers are left
    alone, never double-spawned. database.py resolves ../data from python-api/,
    so the canonical data\\bodyfat.db is used with no env var needed."""
    if not port_up(API_PORT):
        _spawn_detached("python main.py", API_DIR)
    if not port_up(WEB_PORT):
        _spawn_detached(f"npx next start -H 0.0.0.0 -p {WEB_PORT}", APP_DIR)

    deadline = time.time() + wait
    while time.time() < deadline:
        if port_up(API_PORT) and port_up(WEB_PORT):
            break
        time.sleep(1)

    if open_browser and port_up(WEB_PORT):
        open_app()
    return status([API_PORT, WEB_PORT])


def main(argv: list[str]) -> int:
    cmd = (argv[1] if len(argv) > 1 else "start").lower()
    if cmd == "stop":
        result = stop([API_PORT, WEB_PORT])
        n = sum(len(v) for v in result.values())
        print(f"ApexFit stopped - killed {n} process(es): {result}")
        return 0
    if cmd == "status":
        print(status([API_PORT, WEB_PORT]))
        return 0
    # default: start
    st = start(open_browser=("--no-browser" not in argv))
    print(f"ApexFit status: API={st[API_PORT]} WEB={st[WEB_PORT]}")
    return 0 if all(st.values()) else 1


if __name__ == "__main__":
    import sys
    raise SystemExit(main(sys.argv))
