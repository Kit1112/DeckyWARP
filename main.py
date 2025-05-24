import asyncio, subprocess, time, pathlib, os

# ── logging ──────────────────────────────────────────────

def log_to_file(msg: str):
    try:
        with open("/tmp/deckywarp.log", "a", encoding="utf-8") as f:
            f.write(msg + "\n")
    except Exception:
        pass

# ── constants ────────────────────────────────────────────

WARP_BIN = "/usr/bin/warp-cli"
TIMEOUT = 30

# --- install warp-cli ---
FLAG = pathlib.Path("/tmp/.warp_installing")
LOG = pathlib.Path("/tmp/warp_install.log")
UNIT = "warp-install"
TOS_DONE = pathlib.Path("/tmp/.warp_tos_done")

# --- plugin update/check ---  ⬅️ new unified flags/units
UPD_FLAG = pathlib.Path("/tmp/.deckywarp_updating")
UPD_LOG = pathlib.Path("/tmp/deckywarp_update.log")
UPD_UNIT = "deckywarp-update"

CHK_FLAG = pathlib.Path("/tmp/.deckywarp_checking")
CHK_LOG = pathlib.Path("/tmp/deckywarp_check.log")
CHK_UNIT = "deckywarp-check"

# ── helpers ───────────────────────────────────────────────

def _clean_env():
    """Return a copy of os.environ *без* LD_LIBRARY_PATH, чтобы subprocess
    использовал системные библиотеки, а не Steam Runtime Decky Loader."""
    env = os.environ.copy()
    env.pop("LD_LIBRARY_PATH", None)
    return env


def _unit_state(name):
    try:
        return subprocess.check_output(
            ["systemctl", "show", name, "-p", "ActiveState"],
            text=True,
            env=_clean_env(),
        ).strip().split("=", 1)[1]
    except subprocess.CalledProcessError:
        return "inactive"


def _run_q(*cmd):
    return subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        env=_clean_env(),
    )


def _raw_status():
    return (_run_q(WARP_BIN, "status").stdout or "").strip()

# ---------- generic flag helpers -------------------------------------------

def _cleanup_flag(flag: pathlib.Path, unit_name: str):
    if flag.exists() and _unit_state(unit_name) in ("inactive", "failed"):
        flag.unlink(missing_ok=True)


def _busy(flag: pathlib.Path):
    return flag.exists()

# ── warp-cli state helpers ─────────────────────────────────────────────────

def _state():
    _cleanup_flag(FLAG, UNIT)
    if FLAG.exists():
        return "installing"
    if not pathlib.Path(WARP_BIN).exists():
        return "missing"

    out = _raw_status().lower()

    if "accept the warp terms" in out and not TOS_DONE.exists():
        subprocess.run([WARP_BIN, "--accept-tos"], check=False, env=_clean_env())
        subprocess.run([WARP_BIN, "registration", "new"], check=False, env=_clean_env())
        subprocess.run(["systemctl", "restart", "warp-svc.service"], check=False, env=_clean_env())
        TOS_DONE.touch()
        time.sleep(2)
        out = _raw_status().lower()

    if "unable to connect to the cloudflarewarp daemon" in out:
        return "disconnected"

    if "registration missing" in out:
        return "unregistered"
    if "disconnected" in out:
        return "disconnected"
    if "connected" in out:
        return "connected"
    return "error"

# ── async wrappers ----------------------------------------------------------

async def _run(*cmd):
    await asyncio.to_thread(subprocess.run, cmd, check=False, env=_clean_env())


async def _wait(desired):
    end = time.time() + TIMEOUT
    while time.time() < end and _state() != desired:
        await asyncio.sleep(0.5)
    return _state()


async def _register():
    await _run("bash", "-c", f"printf 'y\n' | {WARP_BIN} registration new")
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
/usr/bin/warp-cli --accept-tos
/usr/bin/warp-cli registration new
systemctl enable --now warp-svc.service
/usr/bin/warp-cli mode warp+doh
/usr/bin/warp-cli connect || true
echo "## done: $(date)"
"""


def _write_script():
    p = pathlib.Path("/tmp/warp_install.sh")
    p.write_text(INSTALL_SH)
    p.chmod(0o755)
    LOG.write_text("")
    return str(p)

# ── update-script (plugin self‑update) ──────────────────────────────────────

UPDATE_SH = r"""#!/bin/bash
set -e
exec > >(tee -a /tmp/deckywarp_update.log) 2>&1
echo "== START UPDATE: $(date)"

PLUGIN_DIR="/home/deck/homebrew/plugins/DeckyWARP"
TMP_DIR="/tmp/deckywarp_update"
ZIP_URL="https://api.github.com/repos/Kit1112/DeckyWARP/releases/latest"

rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"
cd "$TMP_DIR"

echo "== FETCHING ASSET URL =="
ASSET_URL=$(curl -s "$ZIP_URL" | grep '"zipball_url":' | cut -d '"' -f 4)
[ -z "$ASSET_URL" ] && echo "ERROR: no asset url" && exit 1
echo "Asset URL: $ASSET_URL"

echo "== DOWNLOADING ZIP =="
curl -L -o latest.zip "$ASSET_URL"
[ ! -f latest.zip ] && echo "ERROR: download failed" && exit 1
echo "Downloaded zip: $(du -h latest.zip)"

echo "== UNZIPPING =="
unzip -qo latest.zip || { echo "ERROR: unzip failed"; exit 1; }
INNER_DIR=$(find . -maxdepth 1 -type d -name "*DeckyWARP*" | head -n 1)
[ ! -d "$INNER_DIR" ] && echo "ERROR: inner dir not found" && exit 1
echo "Found unpacked dir: $INNER_DIR"

echo "== COPYING PLUGIN =="
BACKUP="${PLUGIN_DIR}_backup_$(date +%s)"
cp -r "$PLUGIN_DIR" "$BACKUP" || true
rm -rf "$PLUGIN_DIR"
cp -r "$INNER_DIR" "$PLUGIN_DIR"
COPY_RESULT=$?

if [ $COPY_RESULT -eq 0 ]; then
  echo "== CLEANING BACKUP =="
  rm -rf "$BACKUP"
  echo "== RESTARTING DECKY =="
  systemctl restart plugin_loader.service
  echo "== DONE: $(date)"
else
  echo "ERROR: update copy failed"
  exit 1
fi
"""


def _write_update_script():
    path = pathlib.Path("/tmp/deckywarp_update.sh")
    path.write_text(UPDATE_SH)
    path.chmod(0o755)
    return str(path)

# ── check-script (version check) ────────────────────────────────────────────

CHECK_SH = r"""#!/bin/bash
set -e
exec > >(tee -a /tmp/deckywarp_check.log) 2>&1
echo "== START CHECK: $(date)"

GITHUB_API_URL="https://api.github.com/repos/Kit1112/DeckyWARP/releases/latest"
PLUGIN_JSON_PATH="/home/deck/homebrew/plugins/DeckyWARP/plugin.json"

curl -s -H 'Accept: application/vnd.github+json' "$GITHUB_API_URL" > /tmp/github_response.json
LATEST=$(jq -r .tag_name /tmp/github_response.json | sed 's/^v//')
CURRENT=$(jq -r .version "$PLUGIN_JSON_PATH")

if [ "$LATEST" != "$CURRENT" ]; then
  echo "update_available $LATEST $CURRENT"
else
  echo "up_to_date $CURRENT"
fi

"""


def _write_check_script():
    p = pathlib.Path("/tmp/deckywarp_check.sh")
    p.write_text(CHECK_SH)
    p.chmod(0o755)
    return str(p)

# ── Decky plugin API ──────────────────────────────────────

class Plugin:
    async def _main(self): ...

    async def _unload(self):
        pass

    # ---------- WARP TOGGLE / STATE --------------------------------------

    async def get_state(self):
        return _state()

    async def toggle_warp(self):
        st = _state()
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

    # ---------- INSTALL WARP-CLI -----------------------------------------

    async def install_warp(self):
        if FLAG.exists():
            return "installing"
        FLAG.touch()
        await _run("systemctl", "reset-failed", f"{UNIT}.service")
        await _run(
            "systemd-run",
            "--unit",
            UNIT,
            "--service-type=oneshot",
            "--quiet",
            _write_script(),
        )
        return "started"

    async def get_install_log(self):
        if LOG.exists():
            try:
                return LOG.read_text().splitlines()[-1][-160:]
            except Exception:
                pass
        return ""

    # ---------- PLUGIN UPDATE -------------------------------------------

    async def update_plugin(self):
        """Запускает обновление плагина. Защита от повторного запуска через флаг."""
        _cleanup_flag(UPD_FLAG, UPD_UNIT)
        if _busy(UPD_FLAG):
            return "updating"
        UPD_FLAG.touch()
        await _run(
            "systemd-run",
            "--unit", UPD_UNIT,
            "--service-type=oneshot",
            "--quiet",
            _write_update_script(),
        )
        return "update_started"

    async def get_update_log(self):
        _cleanup_flag(UPD_FLAG, UPD_UNIT)
        try:
            if UPD_LOG.exists():
                return UPD_LOG.read_text()[-8000:]
        except Exception as e:
            return f"[get_update_log ERROR] {e}"
        return ""

    # ---------- VERSION CHECK -------------------------------------------

    async def check_update(self):
        """Проверить доступность новой версии через отдельный systemd unit."""
        _cleanup_flag(CHK_FLAG, CHK_UNIT)
        if _busy(CHK_FLAG):
            return {"status": "checking"}
        CHK_FLAG.touch()
        await _run(
            "systemd-run", "--unit", CHK_UNIT,
            "--service-type=oneshot", "--quiet",
            _write_check_script(),
        )
        await asyncio.sleep(1)

        def _fetch_changelog():
            import urllib.request
            import ssl
            import json
            try:
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE

                with urllib.request.urlopen("https://api.github.com/repos/Kit1112/DeckyWARP/releases/latest", context=ctx) as resp:
                    data = json.load(resp)
                    body = data.get("body", "")
                    lines = body.splitlines()

                en_lines, ru_lines = [], []
                mode = 0  # 0 = none, 1 = EN, 2 = RU

                for line in lines:
                    if line.strip().startswith("## **Changelog**"):
                        mode = 1
                        continue
                    elif line.strip().startswith("## **Список изменений**"):
                        mode = 2
                        continue
                    elif line.strip().startswith("#"):
                        mode = 0
                        continue

                    if mode == 1:
                        en_lines.append(line)
                    elif mode == 2:
                        ru_lines.append(line)

                result = ""
                if en_lines:
                    result += "== EN ==\n" + "\n".join(en_lines).strip() + "\n"
                if ru_lines:
                    result += "\n== RU ==\n" + "\n".join(ru_lines).strip()
                return result or "[changelog empty]"
            except Exception as e:
                return f"[changelog error] {e}"

        if CHK_LOG.exists():
            try:
                lines = CHK_LOG.read_text().splitlines()
                for line in reversed(lines):
                    if line.startswith("update_available"):
                        parts = line.strip().split()
                        if len(parts) == 3:
                            return {
                                "status": "update_available",
                                "latest": parts[1],
                                "current": parts[2],
                                "changelog": _fetch_changelog()
                            }
                    elif line.startswith("up_to_date"):
                        parts = line.strip().split()
                        if len(parts) == 2:
                            return {
                                "status": "up_to_date",
                                "current": parts[1]
                            }
                return {"status": "error", "detail": "no update info in log"}
            except Exception as e:
                return {"status": "error", "detail": str(e)}
        return {"status": "error", "detail": "log not found"}

    # ---------- MISC -----------------------------------------------------

    async def clear_logs(self):
        try:
            for f in [
                "/tmp/deckywarp.log",
                UPD_LOG,
                CHK_LOG,
                LOG,
            ]:
                pathlib.Path(f).unlink(missing_ok=True)
            return "ok"
        except Exception as e:
            return f"error: {e}"

    async def stop_warp(self):
        await _run(WARP_BIN, "disconnect")


plugin = Plugin()
