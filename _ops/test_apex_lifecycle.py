"""TDD suite for the ApexFit start/stop lifecycle (the desktop-shortcut backend).

These exercise the PUBLIC interface that the .cmd shortcuts call, so passing
here means the shortcuts themselves work. Integration tests actually bounce the
real servers, then leave the app running.
"""
import socket
import time
import pytest

import apex_lifecycle as life

API_PORT = 8313
WEB_PORT = 3010
UNUSED_PORT = 59999  # nothing should ever listen here


def _is_listening(port: int) -> bool:
    s = socket.socket()
    s.settimeout(1)
    try:
        return s.connect_ex(("127.0.0.1", port)) == 0
    finally:
        s.close()


# ---- port_up -------------------------------------------------------------
def test_port_up_true_when_something_listens():
    # The app is expected running when the suite starts.
    if not _is_listening(WEB_PORT):
        pytest.skip("web server not up at baseline")
    assert life.port_up(WEB_PORT) is True


def test_port_up_false_for_unused_port():
    assert life.port_up(UNUSED_PORT) is False


# ---- listeners -----------------------------------------------------------
def test_listeners_returns_pids_for_up_port():
    if not _is_listening(WEB_PORT):
        pytest.skip("web server not up at baseline")
    pids = life.listeners(WEB_PORT)
    assert isinstance(pids, list)
    assert len(pids) >= 1
    assert all(isinstance(p, int) for p in pids)


def test_listeners_empty_for_unused_port():
    assert life.listeners(UNUSED_PORT) == []


# ---- stop (must be idempotent / safe on a down port) ---------------------
def test_stop_idempotent_on_down_port():
    # Stopping a port nothing listens on must not raise and must report nothing killed.
    result = life.stop([UNUSED_PORT])
    assert result == {UNUSED_PORT: []}
    assert life.port_up(UNUSED_PORT) is False


# ---- status --------------------------------------------------------------
def test_status_reports_per_port():
    if not _is_listening(WEB_PORT):
        pytest.skip("web server not up at baseline")
    st = life.status([WEB_PORT, UNUSED_PORT])
    assert st == {WEB_PORT: True, UNUSED_PORT: False}


# ---- INTEGRATION: real stop -> start cycle (the flawless-lifecycle proof) --
@pytest.mark.integration
def test_full_stop_then_start_cycle():
    # 1. Stop: both ports must go down (idempotent kill of the real servers).
    life.stop([API_PORT, WEB_PORT])
    for _ in range(15):
        if not life.port_up(API_PORT) and not life.port_up(WEB_PORT):
            break
        time.sleep(1)
    assert life.port_up(API_PORT) is False, "API failed to stop"
    assert life.port_up(WEB_PORT) is False, "web failed to stop"

    # 2. Start (no browser in CI): both must come back reachable.
    st = life.start(open_browser=False, wait=70)
    assert st[API_PORT] is True, "API failed to start"
    assert st[WEB_PORT] is True, "web failed to start"

    # 3. Start again while up: must be a no-op that still reports healthy
    #    (idempotent — no double-spawn).
    st2 = life.start(open_browser=False, wait=10)
    assert st2 == {API_PORT: True, WEB_PORT: True}


@pytest.mark.integration
def test_real_app_actually_serves_after_start():
    # Beyond "port open": the web root and API must answer HTTP 200.
    import urllib.request
    for port, path in [(WEB_PORT, "/"), (API_PORT, "/")]:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}{path}", timeout=8) as r:
            assert r.status == 200
