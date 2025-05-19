import {
  PanelSection,
  PanelSectionRow,
  ToggleField
} from "decky-frontend-lib";
import { useState, useEffect } from "react";
import { CustomButtonItem } from "../../components/CustomButtonItem";
import { CustomTextBox } from "../../components/CustomTextBox";

const Updates = () => {
  const [autoCheck, setAutoCheck] = useState(false);
  const [log, setLog] = useState("Логи проверки обновлений появятся здесь...");
  const [status, setStatus] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [changelog, setChangelog] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdateLocked, setIsUpdateLocked] = useState(
    localStorage.getItem("update_in_progress") === "true"
  );

  useEffect(() => {
    // Сброс блокировки обновления при старте
    localStorage.removeItem("update_in_progress");
    setIsUpdateLocked(false);
    const storedDebug = localStorage.getItem("debug_mode");
    if (storedDebug !== null) {
      setDebugMode(storedDebug === "true");
    }

    const storedAutoCheck = localStorage.getItem("auto_check");
    const auto = storedAutoCheck === "true";
    setAutoCheck(auto);

    const storedStatus = localStorage.getItem("update_status");
    const storedLatest = localStorage.getItem("update_latest");
    const storedCurrent = localStorage.getItem("update_current");
    const storedChangelog = localStorage.getItem("update_changelog");

    if (storedStatus) setStatus(storedStatus);
    if (storedLatest) setLatestVersion(storedLatest);
    if (storedCurrent) setCurrentVersion(storedCurrent);
    if (storedStatus === "update_available" && storedChangelog) {
      setChangelog(storedChangelog);
    }

    (async () => {
      try {
        const result = await (window as any).call("get_version", {});
        setCurrentVersion(result.version);
      } catch (e) {
        setCurrentVersion(null);
      }

      if (auto) {
        onCheckUpdates();
      }

      const inProgress = localStorage.getItem("update_in_progress") === "true";
      if (!inProgress || storedStatus !== "update_available") {
        localStorage.removeItem("update_in_progress");
        setIsUpdateLocked(false);
      }
    })();

  }, []);

  const handleAutoCheckToggle = (value: boolean) => {
    setAutoCheck(value);
    localStorage.setItem("auto_check", value.toString());
  };

  const onCheckUpdates = async () => {
    setIsChecking(true);
    setLog("⏳ Проверка обновлений...");
    try {
      const result = await (window as any).call("check_update", {});
      setStatus(result.status);
      setLatestVersion(result.latest);
      setCurrentVersion(result.current);

      if (result.status === "update_available" && result.changelog) {
        setChangelog(result.changelog);
      } else {
        setChangelog(null);
      }

      setLog(JSON.stringify(result, null, 2));

      localStorage.setItem("update_status", result.status);
      localStorage.setItem("update_latest", result.latest);
      localStorage.setItem("update_current", result.current);
      localStorage.setItem("update_changelog", result.changelog || "");

      if (result.status !== "update_available") {
        localStorage.removeItem("update_in_progress");
        setIsUpdateLocked(false);
      }
    } catch (e) {
      setStatus("error");
      setLog("❌ Ошибка при вызове check_update:\n" + e);
      setChangelog(null);

      localStorage.setItem("update_status", "error");
      localStorage.setItem("update_changelog", "");
    } finally {
      setIsChecking(false);
    }
  };

  const onUpdate = async () => {
    setIsUpdating(true);
    setIsUpdateLocked(true);
    localStorage.setItem("update_in_progress", "true");
    setLog("🚀 Устанавливаем обновление...");
    try {
      await (window as any).call("update_plugin", {});
      setLog("✅ Обновление запущено. Плагин скоро перезапустится.");
    } catch (e) {
      setLog("❌ Ошибка при установке обновления:\n" + e);
    } finally {
      setIsUpdating(false);
      localStorage.removeItem("update_in_progress");
      setIsUpdateLocked(false);
    }
  };

  const renderStatus = () => {
    if (status === "error") return "Ошибка проверки обновлений!";
    if (status === "update_available" && latestVersion)
      return `Доступно обновление до версии ${latestVersion}!`;
    if (status === "up_to_date" && currentVersion)
      return `У вас актуальная версия (${currentVersion})!`;
    if (currentVersion) return `Текущая версия: ${currentVersion}`;
    return "";
  };

  const renderUpdateButton = () => {
    if (status === "update_available") {

  useEffect(() => {
    // Сброс блокировки обновления при старте
    localStorage.removeItem("update_in_progress");
    setIsUpdateLocked(false);
    let interval: any = null;
    if (debugMode) {
      interval = setInterval(async () => {
        try {
          const log = await (window as any).call("get_update_log", {});
          if (log) setLog(log);
        } catch (e) {}
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [debugMode]);


  return (
        <CustomButtonItem
          onClick={onUpdate}
          disabled={isUpdating || isUpdateLocked}
        >
          {isUpdating ? "Установка..." : "Установить обновление"}
        </CustomButtonItem>
      );
    } else {

  useEffect(() => {
    // Сброс блокировки обновления при старте
    localStorage.removeItem("update_in_progress");
    setIsUpdateLocked(false);
    let interval: any = null;
    if (debugMode) {
      interval = setInterval(async () => {
        try {
          const log = await (window as any).call("get_update_log", {});
          if (log) setLog(log);
        } catch (e) {}
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [debugMode]);


  return (
        <CustomButtonItem
          onClick={onCheckUpdates}
          disabled={isChecking}
        >
          {isChecking ? "Проверяем..." : "Проверить обновления"}
        </CustomButtonItem>
      );
    }
  };


  useEffect(() => {
    // Сброс блокировки обновления при старте
    localStorage.removeItem("update_in_progress");
    setIsUpdateLocked(false);
    let interval: any = null;
    if (debugMode) {
      interval = setInterval(async () => {
        try {
          const log = await (window as any).call("get_update_log", {});
          if (log) setLog(log);
        } catch (e) {}
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [debugMode]);


  return (
    <PanelSection>
      <PanelSectionRow>
        <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
          {renderUpdateButton()}
          <div
            style={{
              marginLeft: "auto",
              fontSize: "14px",
              color: "white",
              opacity: 0.7,
              paddingLeft: "16px"
            }}
          >
            {renderStatus()}
          </div>
        </div>
      </PanelSectionRow>

      {status === "update_available" && changelog && (
        <PanelSectionRow>
          <CustomTextBox label="Список изменений" content={changelog} />
        </PanelSectionRow>
      )}

      {debugMode && (
        <PanelSectionRow>
          <CustomTextBox label="логи" content={log} />
        </PanelSectionRow>
      )}

      <ToggleField
        label="Авто-проверка обновлений"
        checked={autoCheck}
        onChange={handleAutoCheckToggle}
      />
    </PanelSection>
  );
};

export default Updates;
