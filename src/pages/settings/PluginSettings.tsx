import { PanelSection, ToggleField, PanelSectionRow } from "decky-frontend-lib";
import { useState } from "react";

const PluginSettings = () => {
  const [optionOne, setOptionOne] = useState(false);
  const [optionTwo, setOptionTwo] = useState(false);

  return (
    <PanelSection>
      <ToggleField
        label="Опция 1 (заглушка)"
        checked={optionOne}
        onChange={setOptionOne}
      />
      <ToggleField
        label="Опция 2 (заглушка)"
        checked={optionTwo}
        onChange={setOptionTwo}
      />
      <PanelSectionRow />
    </PanelSection>
  );
};

export default PluginSettings;
