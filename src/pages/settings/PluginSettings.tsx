import {
  PanelSection,
  ToggleField,
  PanelSectionRow
} from "decky-frontend-lib";
import { useState, useEffect } from "react";
import { CustomButtonItem } from "../../components/CustomButtonItem";

const PluginSettings = () => {
  const [debugMode, setDebugMode] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState<string | null>(null);

  const logPaths = [
    "/tmp/deckywarp.log",
    "/tmp/deckywarp_update.log",
    "/tmp/warp_install.log"
  ];

  const storageKeys: { key: string; comment: string }[] = [
    { key: "update_status", comment: "статус последней проверки" },
    { key: "update_latest", comment: "доступная версия" },
    { key: "update_changelog", comment: "текст изменений" },
    { key: "update_in_progress", comment: "флаг, что идёт обновление" },
    { key: "update_ignored_version", comment: "версия, которую нужно игнорировать" }
  ];

  useEffect(() => {
    const stored = localStorage.getItem("debug_mode");
    if (stored !== null) {
      setDebugMode(stored === "true");
    }
  }, []);

  const handleDebugToggle = (value: boolean) => {
    setDebugMode(value);
    localStorage.setItem("debug_mode", value.toString());
  };

  const handleClearLogs = async () => {
    setIsClearing(true);
    setClearMessage(null);
    try {
      await (window as any).call("clear_logs", {});
      setClearMessage("✅ Логи очищены");
    } catch (e) {
      setClearMessage("❌ Ошибка при очистке логов");
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearKey = (key: string) => {
    localStorage.removeItem(key);
  };

  return (
    <PanelSection>
      <ToggleField
        label="Режим отладки"
        checked={debugMode}
        onChange={handleDebugToggle}
      />

      {debugMode && (
        <>
          <PanelSectionRow>
            <div style={{ fontWeight: "bold", marginBottom: "4px" }}>Логи</div>
          </PanelSectionRow>

          <PanelSectionRow>
            <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
              <CustomButtonItem
                onClick={handleClearLogs}
                disabled={isClearing}
              >
                {isClearing ? "Очищаем..." : "Очистить логи"}
              </CustomButtonItem>
              {clearMessage && (
                <div style={{
                  marginLeft: "auto",
                  color: "#aaa",
                  fontSize: "13px",
                  whiteSpace: "nowrap"
                }}>
                  {clearMessage}
                </div>
              )}
            </div>
          </PanelSectionRow>

          <PanelSectionRow>
            <div style={{ color: "#aaa", fontSize: "13px", padding: "4px 0" }}>
              Логи находятся по пути:<br />
              {logPaths.map(p => (
                <div key={p}>{p}</div>
              ))}
            </div>
          </PanelSectionRow>

          <PanelSectionRow>
            <div style={{ fontWeight: "bold", marginTop: "8px" }}>
              Удалить ключи в LocalStorage
            </div>
          </PanelSectionRow>

          {storageKeys.map(({ key, comment }) => (
            <PanelSectionRow key={key}>
              <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                <CustomButtonItem onClick={() => handleClearKey(key)}>
                  Удалить ключ {key}
                </CustomButtonItem>
                <div style={{
                  marginLeft: "auto",
                  color: "#aaa",
                  fontSize: "13px",
                  whiteSpace: "nowrap"
                }}>
                  {comment}
                </div>
              </div>
            </PanelSectionRow>
          ))}
        </>
      )}
    </PanelSection>
  );
};

export default PluginSettings;
