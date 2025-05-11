import asyncio, subprocess, time, pathlib, shlex, decky_plugin

WARP_BIN  = "/usr/bin/warp-cli"           # ← полный путь
TIMEOUT   = 12
FLAG      = pathlib.Path("/tmp/.warp_installing")
LOG       = pathlib.Path("/tmp/warp_install.log")
UNIT      = "warp-install"

# ── helpers ───────────────────────────────────────────────
def _unit_state() -> str:
    try:
        out = subprocess.check_output(
            ["systemctl", "show", UNIT, "-p", "ActiveState"],
            text=True).strip().split("=", 1)[1]
    except subprocess.CalledProcessError:
        out = "inactive"
    return out

def _run_quiet(*cmd):
    return subprocess.run(cmd, stdout=subprocess.PIPE,
                          stderr=subprocess.STDOUT, text=True)

def _raw_status() -> str:
    proc = _run_quiet(WARP_BIN, "status")
    if proc.returncode != 0 or not proc.stdout.strip():
        # демон ещё не поднялся → поднимаем и пробуем ещё раз
        subprocess.run(["systemctl", "restart", "warp-svc.service"])
        time.sleep(1.0)
        proc = _run_quiet(WARP_BIN, "status")
    return (proc.stdout or "").strip()

def _cleanup_flag():
    if FLAG.exists() and _unit_state() in ("inactive", "failed"):
        FLAG.unlink(missing_ok=True)

def _state() -> str:
    _cleanup_flag()
    if FLAG.exists():                                 return "installing"
    if not pathlib.Path(WARP_BIN).exists():           return "missing"

    out = _raw_status().lower()
    if "registration missing" in out:                return "unregistered"
    if "disconnected"         in out:                return "disconnected"
    if "connected"            in out:                return "connected"
    return "error"

async def _run(*cmd): await asyncio.to_thread(subprocess.run, cmd, check=False)

async def _wait(desired: str):
    t0 = time.time()
    while time.time() - t0 < TIMEOUT and _state() != desired:
        await asyncio.sleep(0.5)
    return _state()

async def _register():
    await _run("bash", "-c", f"printf 'y\\n' | {WARP_BIN} registration new")
    await _run(WARP_BIN, "mode", "warp+doh")

# ── install-script, write_script и прочее остаётся как в предыдущей версии ──
# (код ниже НЕ менялся → если он у тебя уже есть, можно оставить)

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
systemctl enable --now warp-svc.service
for i in {1..20}; do
  /usr/bin/warp-cli status 2>&1 | grep -q 'Unable' && sleep 0.5 || break
done
( printf 'y\n' | /usr/bin/warp-cli registration new ) || true
/usr/bin/warp-cli mode warp+doh
/usr/bin/warp-cli connect || true
echo "## done: $(date)"
"""

def _write_script() -> str:
    p = pathlib.Path("/tmp/warp_install.sh")
    p.write_text(INSTALL_SH); p.chmod(0o755)
    LOG.write_text("")
    return str(p)

# ── Decky plugin (API) ─────────────────────────────────────
class Plugin:
    async def _main(self): ...
    async def _unload(self):
        if _state() == "connected":
            await _run(WARP_BIN, "disconnect")

    async def get_state(self):         return _state()

    async def toggle_warp(self):
        st = _state()
        if st == "connected":
            await _run(WARP_BIN, "disconnect")
            return await _wait("disconnected")
        if st == "unregistered":
            await _register()
        await _run(WARP_BIN, "connect")
        return await _wait("connected")

    async def install_warp(self):
        if FLAG.exists():              return "installing"
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
