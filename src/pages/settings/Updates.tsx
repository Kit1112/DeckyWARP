import { PanelSection, PanelSectionRow, ButtonItem, ToggleField } from "decky-frontend-lib";
import { useState } from "react";

const Updates = () => {
  const [autoCheck, setAutoCheck] = useState(false);

  const onCheckUpdates = () => {
    /* TODO: проверка обновлений */
  };

  return (
    <PanelSection>
      <PanelSectionRow>Текущая версия плагина: 1.0.0</PanelSectionRow>
      <ButtonItem onClick={onCheckUpdates}>Проверить обновления</ButtonItem>
      <PanelSectionRow>У вас последняя версия</PanelSectionRow>
      <ToggleField
        label="Авто-проверка обновлений"
        checked={autoCheck}
        onChange={setAutoCheck}
      />
    </PanelSection>
  );
};

export default Updates;
