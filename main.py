import asyncio, subprocess, time, pathlib, decky_plugin

WARP_BIN  = "/usr/bin/warp-cli"
TIMEOUT   = 30
FLAG      = pathlib.Path("/tmp/.warp_installing")
LOG       = pathlib.Path("/tmp/warp_install.log")
UNIT      = "warp-install"
TOS_DONE  = pathlib.Path("/tmp/.warp_tos_done")

# ── helpers ───────────────────────────────────────────────
def _unit_state():
    try:
        return subprocess.check_output(
            ["systemctl", "show", UNIT, "-p", "ActiveState"],
            text=True).strip().split("=", 1)[1]
    except subprocess.CalledProcessError:
        return "inactive"

def _run_q(*cmd):
    return subprocess.run(cmd, stdout=subprocess.PIPE,
                          stderr=subprocess.STDOUT, text=True)

def _raw_status():
    return (_run_q(WARP_BIN, "status").stdout or "").strip()

def _cleanup_flag():
    if FLAG.exists() and _unit_state() in ("inactive", "failed"):
        FLAG.unlink(missing_ok=True)

def _state():
    _cleanup_flag()
    if FLAG.exists():                       return "installing"
    if not pathlib.Path(WARP_BIN).exists(): return "missing"

    out = _raw_status().lower()

    # принять ToS один раз
    if "accept the warp terms" in out and not TOS_DONE.exists():
        subprocess.run([WARP_BIN, "--accept-tos"], check=False)
        subprocess.run([WARP_BIN, "registration", "new"], check=False)
        subprocess.run(["systemctl", "restart", "warp-svc.service"], check=False)
        TOS_DONE.touch()
        time.sleep(2)
        out = _raw_status().lower()

    # демон не запущен
    if "unable to connect to the cloudflarewarp daemon" in out:
        return "disconnected"

    if "registration missing" in out: return "unregistered"
    if "disconnected"         in out: return "disconnected"
    if "connected"            in out: return "connected"
    return "error"

async def _run(*cmd):
    await asyncio.to_thread(subprocess.run, cmd, check=False)

async def _wait(desired):
    end = time.time() + TIMEOUT
    while time.time() < end and _state() != desired:
        await asyncio.sleep(0.5)
    return _state()

async def _register():
    await _run("bash", "-c", f"printf 'y\\n' | {WARP_BIN} registration new")
    await _run(WARP_BIN, "mode", "warp+doh")

# ── install-script ────────────────────────────────────────
INSTALL_SH = r"""#!/bin/bash
set -e
exec > >(tee -a /tmp/warp_install.log) 2>&1
echo "## start: $(date)"
steamos-readonly status | grep -q disabled || echo y | steamos-readonly disable
mount -o remount,rw /
rm -rf /etc/pacman.d/gnupg
install -dm700 /etc/pacman.d/gnupg
pacman-key --init
pacman-key --populate
pacman -Sy --noconfirm base-devel fakeroot curl
pacman-key --recv-key 3056513887B78AEB --keyserver keyserver.ubuntu.com
pacman-key --lsign-key 3056513887B78AEB
pacman -U --noconfirm \
  'https://cdn-mirror.chaotic.cx/chaotic-aur/chaotic-keyring.pkg.tar.zst' \
  'https://cdn-mirror.chaotic.cx/chaotic-aur/chaotic-mirrorlist.pkg.tar.zst'
grep -q '\[chaotic-aur\]' /etc/pacman.conf || \
  echo -e '\n[chaotic-aur]\nInclude = /etc/pacman.d/chaotic-mirrorlist' >> /etc/pacman.conf
pacman -Sy --noconfirm cloudflare-warp-bin
/usr/bin/warp-cli --accept-tos            # ToS
/usr/bin/warp-cli registration new
systemctl enable --now warp-svc.service
/usr/bin/warp-cli mode warp+doh
/usr/bin/warp-cli connect || true
echo "## done: $(date)"
"""

def _write_script():
    p = pathlib.Path("/tmp/warp_install.sh")
    p.write_text(INSTALL_SH); p.chmod(0o755)
    LOG.write_text("")
    return str(p)

# ── Decky plugin API ──────────────────────────────────────
class Plugin:
    async def _main(self): ...
    async def _unload(self): pass    # не трогаем VPN при закрытии меню

    async def get_state(self): return _state()

    async def toggle_warp(self):
        st = _state()

        # если демон мёртв – стартуем
        if st == "disconnected":
            await _run("systemctl", "start", "warp-svc.service")
            time.sleep(1)
            st = _state()

        if st == "connected":
            await _run(WARP_BIN, "disconnect")
            return await _wait("disconnected")

        if st == "unregistered":
            await _register()

        await _run(WARP_BIN, "connect")
        return await _wait("connected")

    async def install_warp(self):
        if FLAG.exists(): return "installing"
        FLAG.touch()
        await _run("systemctl", "reset-failed", f"{UNIT}.service")
        await _run("systemd-run", "--unit", UNIT, "--service-type", "oneshot",
                   "--quiet", _write_script())
        return "started"

    async def get_install_log(self):
        if LOG.exists():
            try: return LOG.read_text().splitlines()[-1][-160:]
            except Exception: pass
        return ""

    async def stop_warp(self):
        await _run(WARP_BIN, "disconnect")