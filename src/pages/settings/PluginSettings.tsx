import {
  PanelSection,
  ToggleField,
  PanelSectionRow
} from "decky-frontend-lib";
import { useState, useEffect } from "react";
import { CustomButtonItem } from "../../components/CustomButtonItem";

const ru = navigator.language?.toLowerCase().startsWith("ru");

const PluginSettings = () => {
  const [debugMode, setDebugMode] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState<string | null>(null);

  const logPaths = [
    "/tmp/deckywarp.log",
    "/tmp/deckywarp_update.log",
    "/tmp/warp_install.log"
  ];

  const storageKeys: { key: string; commentRu: string; commentEn: string }[] = [
    {
      key: "update_status",
      commentRu: "статус последней проверки",
      commentEn: "last update check status"
    },
    {
      key: "update_latest",
      commentRu: "доступная версия",
      commentEn: "available version"
    },
    {
      key: "update_changelog",
      commentRu: "текст изменений",
      commentEn: "changelog text"
    },
    {
      key: "update_in_progress",
      commentRu: "флаг, что идёт обновление",
      commentEn: "flag indicating update is in progress"
    },
    {
      key: "update_ignored_version",
      commentRu: "версия, которую нужно игнорировать",
      commentEn: "version to ignore"
    }
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
      setClearMessage(ru ? "✅ Логи очищены" : "✅ Logs cleared");
    } catch (e) {
      setClearMessage(ru ? "❌ Ошибка при очистке логов" : "❌ Error while clearing logs");
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
        label={ru ? "Режим отладки" : "Debug mode"}
        checked={debugMode}
        onChange={handleDebugToggle}
      />

      {debugMode && (
        <>
          <PanelSectionRow>
            <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
              {ru ? "Логи" : "Logs"}
            </div>
          </PanelSectionRow>

          <PanelSectionRow>
            <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
              <CustomButtonItem
                onClick={handleClearLogs}
                disabled={isClearing}
              >
                {isClearing
                  ? ru ? "Очищаем..." : "Clearing..."
                  : ru ? "Очистить логи" : "Clear logs"}
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
              {ru ? "Логи находятся по пути:" : "Log file locations:"}<br />
              {logPaths.map(p => (
                <div key={p}>{p}</div>
              ))}
            </div>
          </PanelSectionRow>

          <PanelSectionRow>
            <div style={{ fontWeight: "bold", marginTop: "8px" }}>
              {ru ? "Удалить ключи в LocalStorage" : "Delete LocalStorage keys"}
            </div>
          </PanelSectionRow>

          {storageKeys.map(({ key, commentRu, commentEn }) => (
            <PanelSectionRow key={key}>
              <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                <CustomButtonItem onClick={() => handleClearKey(key)}>
                  {ru ? `Удалить ключ ${key}` : `Delete key ${key}`}
                </CustomButtonItem>
                <div style={{
                  marginLeft: "auto",
                  color: "#aaa",
                  fontSize: "13px",
                  whiteSpace: "nowrap"
                }}>
                  {ru ? commentRu : commentEn}
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
