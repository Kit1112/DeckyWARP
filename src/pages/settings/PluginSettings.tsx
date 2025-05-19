import { PanelSection, ToggleField, PanelSectionRow } from "decky-frontend-lib";
import { useState, useEffect } from "react";

const PluginSettings = () => {
  const [debugMode, setDebugMode] = useState(false);

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

  return (
    <PanelSection>
      <ToggleField
        label="Режим отладки"
        checked={debugMode}
        onChange={handleDebugToggle}
      />
      <PanelSectionRow />
    </PanelSection>
  );
};

export default PluginSettings;
