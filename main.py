import asyncio, subprocess, time, pathlib, decky_plugin

# Временное хранилище логов в памяти
_log_buffer = []

# Логирование строки в файл и в буфер
def log_to_file(msg: str):
    try:
        with open("/tmp/deckywarp.log", "a", encoding="utf-8") as f:
            f.write(msg + "\n")
        _log_buffer.append(msg)
        if len(_log_buffer) > 100: _log_buffer.pop(0)  # ограничение размера буфера
    except Exception:
        pass

# Пути и константы
WARP_BIN  = "/usr/bin/warp-cli"
TIMEOUT   = 30
FLAG      = pathlib.Path("/tmp/.warp_installing")
LOG       = pathlib.Path("/tmp/warp_install.log")
UNIT      = "warp-install"
TOS_DONE  = pathlib.Path("/tmp/.warp_tos_done")

# ── Вспомогательные функции ───────────────────────────────

# Получение текущего состояния systemd-юнита
def _unit_state():
    try:
        return subprocess.check_output(
            ["systemctl", "show", UNIT, "-p", "ActiveState"],
            text=True).strip().split("=", 1)[1]
    except subprocess.CalledProcessError:
        return "inactive"

# Быстрый запуск команды и возврат результата
def _run_q(*cmd):
    return subprocess.run(cmd, stdout=subprocess.PIPE,
                          stderr=subprocess.STDOUT, text=True)

# Получение "сырых" данных от warp-cli status
def _raw_status():
    return (_run_q(WARP_BIN, "status").stdout or "").strip()

# Удаление флага установки, если unit завершён
def _cleanup_flag():
    if FLAG.exists() and _unit_state() in ("inactive", "failed"):
        FLAG.unlink(missing_ok=True)

# Получение текущего состояния Warp-клиента
def _state():
    _cleanup_flag()
    if FLAG.exists():                       return "installing"
    if not pathlib.Path(WARP_BIN).exists(): return "missing"

    out = _raw_status().lower()

    # Если необходимо принять условия — делаем это автоматически
    if "accept the warp terms" in out and not TOS_DONE.exists():
        subprocess.run([WARP_BIN, "--accept-tos"], check=False)
        subprocess.run([WARP_BIN, "registration", "new"], check=False)
        subprocess.run(["systemctl", "restart", "warp-svc.service"], check=False)
        TOS_DONE.touch()
        time.sleep(2)
        out = _raw_status().lower()

    # Разбор статуса
    if "unable to connect to the cloudflarewarp daemon" in out:
        return "disconnected"
    if "registration missing" in out: return "unregistered"
    if "disconnected"         in out: return "disconnected"
    if "connected"            in out: return "connected"
    return "error"

# Асинхронный запуск команды
async def _run(*cmd):
    await asyncio.to_thread(subprocess.run, cmd, check=False)

# Ожидание изменения статуса до нужного значения
async def _wait(desired):
    end = time.time() + TIMEOUT
    while time.time() < end and _state() != desired:
        await asyncio.sleep(0.5)
    return _state()

# Регистрация Warp клиента (с подтверждением)
async def _register():
    await _run("bash", "-c", f"printf 'y\\n' | {WARP_BIN} registration new")
    await _run(WARP_BIN, "mode", "warp+doh")

# ── Скрипт установки ────────────────────────────────────────

INSTALL_SH = r"""#!/bin/bash
set -e
exec > >(tee -a /tmp/warp_install.log) 2>&1
... (оставлен без изменений для краткости)
"""

# Запись bash-скрипта установки во временный файл
def _write_script():
    p = pathlib.Path("/tmp/warp_install.sh")
    p.write_text(INSTALL_SH); p.chmod(0o755)
    LOG.write_text("")
    return str(p)

# ── Скрипт обновления ───────────────────────────────────────

UPDATE_SH = r"""#!/bin/bash
set -e
exec > >(tee -a /tmp/deckywarp_update.log) 2>&1
... (оставлен без изменений для краткости)
"""

# Запись скрипта обновления плагина
def _write_update_script():
    path = pathlib.Path("/tmp/deckywarp_update.sh")
    path.write_text(UPDATE_SH)
    path.chmod(0o755)
    return str(path)

# ── API Decky плагина ──────────────────────────────────────

class Plugin:
    async def _main(self): ...
    async def _unload(self): pass

    # Получение текущего состояния warp
    async def get_state(self): return _state()

    # Подключение/отключение warp (переключатель)
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

    # Запуск установки warp через systemd unit
    async def install_warp(self):
        if FLAG.exists(): return "installing"
        FLAG.touch()
        await _run("systemctl", "reset-failed", f"{UNIT}.service")
        await _run("systemd-run", "--unit", UNIT, "--service-type=oneshot",
                   "--quiet", _write_script())
        return "started"

    # Получение последней строки из лога установки
    async def get_install_log(self):
        if LOG.exists():
            try: return LOG.read_text().splitlines()[-1][-160:]
            except Exception: pass
        return ""

    # Обновление плагина через скачивание с GitHub
    async def update_plugin(self):
        path = _write_update_script()
        await _run("systemd-run", "--unit=deckywarp-update", "--service-type=oneshot",
                   "--quiet", path)
        return "update_started"

    # Проверка доступности обновления
    async def check_update(self):
        import json, traceback, pathlib
        from decky_plugin import logger

        log_to_file("check_update запущен")

        GITHUB_API_URL = "https://api.github.com/repos/Kit1112/DeckyWARP/releases/latest"
        PLUGIN_JSON_PATH = "/home/deck/homebrew/plugins/DeckyWARP/plugin.json"
        GITHUB_TOKEN = "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"

        # Получаем версию и ченжлог из GitHub
        async def get_latest_github_release():
            try:
                script = "/tmp/github_version.sh"
                pathlib.Path(script).write_text(f"""#!/bin/bash
curl -sL -H 'Authorization: token {GITHUB_TOKEN}' -H 'Accept: application/vnd.github+json' {GITHUB_API_URL} > /tmp/github_response.json
""")
                subprocess.run(["chmod", "+x", script])
                await _run("systemd-run", "--unit=gh-ver-check", "--service-type=oneshot", "--quiet", script)

                raw = pathlib.Path("/tmp/github_response.json").read_text()
                log_to_file(f"[GH_RAW] {raw[:300]}...")
                data = json.loads(raw)

                tag = data.get("tag_name", "").lstrip("v")
                body = data.get("body", "")

                # Парсим EN и RU ченжлоги по заголовкам
                lines = body.splitlines()
                en, ru, p = [], [], 0
                for line in lines:
                    if "## **Changelog**" in line: p = 1; continue
                    if "## **Список изменений**" in line: p = 2; continue
                    if line.startswith("##") or line.startswith("# "): p = 0
                    if p == 1: en.append(line)
                    if p == 2: ru.append(line)

                changelog = "== EN ==\n" + "\n".join(en).strip() + "\n\n== RU ==\n" + "\n".join(ru).strip()
                return tag, changelog
            except Exception as e:
                log_to_file(f"[github_release ERROR] {e}")
                log_to_file(traceback.format_exc())
                return None, None

        # Локальная версия из plugin.json
        def get_local_plugin_version():
            try:
                with open(PLUGIN_JSON_PATH, "r", encoding="utf-8") as f:
                    raw = f.read()
                    log_to_file(f"[plugin.json] {raw}")
                    data = json.loads(raw)
                    return data.get("version")
            except Exception as e:
                log_to_file(f"[plugin.json ERROR] {e}")
                return None

        github_version, changelog = await get_latest_github_release()
        local_version = get_local_plugin_version()

        if not github_version or not local_version:
            return {"status": "error", "debug": {"github_version": github_version, "local_version": local_version}}

        if github_version != local_version:
            return {
                "status": "update_available",
                "latest": github_version,
                "current": local_version,
                "changelog": changelog
            }
        else:
            return {
                "status": "up_to_date",
                "latest": github_version,
                "current": local_version
            }

    # Получение последней записи из буфера логов
    async def get_update_log(self):
        try:
            return _log_buffer[-1][-160:] if _log_buffer else ""
        except Exception:
            return ""

    # Принудительное отключение warp
    async def stop_warp(self):
        await _run(WARP_BIN, "disconnect")

# Экземпляр плагина
plugin = Plugin()import asyncio, subprocess, time, pathlib, decky_plugin

                 # Временное хранилище логов в памяти
                 _log_buffer = []

                 # Логирование строки в файл и в буфер
                 def log_to_file(msg: str):
                     try:
                         with open("/tmp/deckywarp.log", "a", encoding="utf-8") as f:
                             f.write(msg + "\n")
                         _log_buffer.append(msg)
                         if len(_log_buffer) > 100: _log_buffer.pop(0)  # ограничение размера буфера
                     except Exception:
                         pass

                 # Пути и константы
                 WARP_BIN  = "/usr/bin/warp-cli"
                 TIMEOUT   = 30
                 FLAG      = pathlib.Path("/tmp/.warp_installing")
                 LOG       = pathlib.Path("/tmp/warp_install.log")
                 UNIT      = "warp-install"
                 TOS_DONE  = pathlib.Path("/tmp/.warp_tos_done")

                 # ── Вспомогательные функции ───────────────────────────────

                 # Получение текущего состояния systemd-юнита
                 def _unit_state():
                     try:
                         return subprocess.check_output(
                             ["systemctl", "show", UNIT, "-p", "ActiveState"],
                             text=True).strip().split("=", 1)[1]
                     except subprocess.CalledProcessError:
                         return "inactive"

                 # Быстрый запуск команды и возврат результата
                 def _run_q(*cmd):
                     return subprocess.run(cmd, stdout=subprocess.PIPE,
                                           stderr=subprocess.STDOUT, text=True)

                 # Получение "сырых" данных от warp-cli status
                 def _raw_status():
                     return (_run_q(WARP_BIN, "status").stdout or "").strip()

                 # Удаление флага установки, если unit завершён
                 def _cleanup_flag():
                     if FLAG.exists() and _unit_state() in ("inactive", "failed"):
                         FLAG.unlink(missing_ok=True)

                 # Получение текущего состояния Warp-клиента
                 def _state():
                     _cleanup_flag()
                     if FLAG.exists():                       return "installing"
                     if not pathlib.Path(WARP_BIN).exists(): return "missing"

                     out = _raw_status().lower()

                     # Если необходимо принять условия — делаем это автоматически
                     if "accept the warp terms" in out and not TOS_DONE.exists():
                         subprocess.run([WARP_BIN, "--accept-tos"], check=False)
                         subprocess.run([WARP_BIN, "registration", "new"], check=False)
                         subprocess.run(["systemctl", "restart", "warp-svc.service"], check=False)
                         TOS_DONE.touch()
                         time.sleep(2)
                         out = _raw_status().lower()

                     # Разбор статуса
                     if "unable to connect to the cloudflarewarp daemon" in out:
                         return "disconnected"
                     if "registration missing" in out: return "unregistered"
                     if "disconnected"         in out: return "disconnected"
                     if "connected"            in out: return "connected"
                     return "error"

                 # Асинхронный запуск команды
                 async def _run(*cmd):
                     await asyncio.to_thread(subprocess.run, cmd, check=False)

                 # Ожидание изменения статуса до нужного значения
                 async def _wait(desired):
                     end = time.time() + TIMEOUT
                     while time.time() < end and _state() != desired:
                         await asyncio.sleep(0.5)
                     return _state()

                 # Регистрация Warp клиента (с подтверждением)
                 async def _register():
                     await _run("bash", "-c", f"printf 'y\\n' | {WARP_BIN} registration new")
                     await _run(WARP_BIN, "mode", "warp+doh")

                 # ── Скрипт установки ────────────────────────────────────────

                 INSTALL_SH = r"""#!/bin/bash
                 set -e
                 exec > >(tee -a /tmp/warp_install.log) 2>&1
                 ... (оставлен без изменений для краткости)
                 """

                 # Запись bash-скрипта установки во временный файл
                 def _write_script():
                     p = pathlib.Path("/tmp/warp_install.sh")
                     p.write_text(INSTALL_SH); p.chmod(0o755)
                     LOG.write_text("")
                     return str(p)

                 # ── Скрипт обновления ───────────────────────────────────────

                 UPDATE_SH = r"""#!/bin/bash
                 set -e
                 exec > >(tee -a /tmp/deckywarp_update.log) 2>&1
                 ... (оставлен без изменений для краткости)
                 """

                 # Запись скрипта обновления плагина
                 def _write_update_script():
                     path = pathlib.Path("/tmp/deckywarp_update.sh")
                     path.write_text(UPDATE_SH)
                     path.chmod(0o755)
                     return str(path)

                 # ── API Decky плагина ──────────────────────────────────────

                 class Plugin:
                     async def _main(self): ...
                     async def _unload(self): pass

                     # Получение текущего состояния warp
                     async def get_state(self): return _state()

                     # Подключение/отключение warp (переключатель)
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

                     # Запуск установки warp через systemd unit
                     async def install_warp(self):
                         if FLAG.exists(): return "installing"
                         FLAG.touch()
                         await _run("systemctl", "reset-failed", f"{UNIT}.service")
                         await _run("systemd-run", "--unit", UNIT, "--service-type=oneshot",
                                    "--quiet", _write_script())
                         return "started"

                     # Получение последней строки из лога установки
                     async def get_install_log(self):
                         if LOG.exists():
                             try: return LOG.read_text().splitlines()[-1][-160:]
                             except Exception: pass
                         return ""

                     # Обновление плагина через скачивание с GitHub
                     async def update_plugin(self):
                         path = _write_update_script()
                         await _run("systemd-run", "--unit=deckywarp-update", "--service-type=oneshot",
                                    "--quiet", path)
                         return "update_started"

                     # Проверка доступности обновления
                     async def check_update(self):
                         import json, traceback, pathlib
                         from decky_plugin import logger

                         log_to_file("check_update запущен")

                         GITHUB_API_URL = "https://api.github.com/repos/Kit1112/DeckyWARP/releases/latest"
                         PLUGIN_JSON_PATH = "/home/deck/homebrew/plugins/DeckyWARP/plugin.json"
                         GITHUB_TOKEN = "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"

                         # Получаем версию и ченжлог из GitHub
                         async def get_latest_github_release():
                             try:
                                 script = "/tmp/github_version.sh"
                                 pathlib.Path(script).write_text(f"""#!/bin/bash
                 curl -sL -H 'Authorization: token {GITHUB_TOKEN}' -H 'Accept: application/vnd.github+json' {GITHUB_API_URL} > /tmp/github_response.json
                 """)
                                 subprocess.run(["chmod", "+x", script])
                                 await _run("systemd-run", "--unit=gh-ver-check", "--service-type=oneshot", "--quiet", script)

                                 raw = pathlib.Path("/tmp/github_response.json").read_text()
                                 log_to_file(f"[GH_RAW] {raw[:300]}...")
                                 data = json.loads(raw)

                                 tag = data.get("tag_name", "").lstrip("v")
                                 body = data.get("body", "")

                                 # Парсим EN и RU ченжлоги по заголовкам
                                 lines = body.splitlines()
                                 en, ru, p = [], [], 0
                                 for line in lines:
                                     if "## **Changelog**" in line: p = 1; continue
                                     if "## **Список изменений**" in line: p = 2; continue
                                     if line.startswith("##") or line.startswith("# "): p = 0
                                     if p == 1: en.append(line)
                                     if p == 2: ru.append(line)

                                 changelog = "== EN ==\n" + "\n".join(en).strip() + "\n\n== RU ==\n" + "\n".join(ru).strip()
                                 return tag, changelog
                             except Exception as e:
                                 log_to_file(f"[github_release ERROR] {e}")
                                 log_to_file(traceback.format_exc())
                                 return None, None

                         # Локальная версия из plugin.json
                         def get_local_plugin_version():
                             try:
                                 with open(PLUGIN_JSON_PATH, "r", encoding="utf-8") as f:
                                     raw = f.read()
                                     log_to_file(f"[plugin.json] {raw}")
                                     data = json.loads(raw)
                                     return data.get("version")
                             except Exception as e:
                                 log_to_file(f"[plugin.json ERROR] {e}")
                                 return None

                         github_version, changelog = await get_latest_github_release()
                         local_version = get_local_plugin_version()

                         if not github_version or not local_version:
                             return {"status": "error", "debug": {"github_version": github_version, "local_version": local_version}}

                         if github_version != local_version:
                             return {
                                 "status": "update_available",
                                 "latest": github_version,
                                 "current": local_version,
                                 "changelog": changelog
                             }
                         else:
                             return {
                                 "status": "up_to_date",
                                 "latest": github_version,
                                 "current": local_version
                             }

                     # Получение последней записи из буфера логов
                     async def get_update_log(self):
                         try:
                             return _log_buffer[-1][-160:] if _log_buffer else ""
                         except Exception:
                             return ""

                     # Принудительное отключение warp
                     async def stop_warp(self):
                         await _run(WARP_BIN, "disconnect")

                 # Экземпляр плагина
                 plugin = Plugin()