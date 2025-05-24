import { PanelSection, ButtonItem, PanelSectionRow } from "decky-frontend-lib";

const open = (url: string) => {
  try {
    window.open(url, "_blank");
  } catch (e) {
    console.error("Failed to open URL:", url, e);
  }
};

const ru = navigator.language?.toLowerCase().startsWith("ru");

const Credits = () => (
  <PanelSection>
    <PanelSectionRow>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
        <ButtonItem layout="below" onClick={() => open("https://www.reddit.com/r/SteamDeck/s/6iyB8zdGP4")}>
          <span style={{ color: "#71c6ff" }}>
            {ru ? "Этот гайд" : "This guide"}
          </span>{" "}
          — {ru ? "в целом за способ установки WARP" : "for the general WARP installation method"}
        </ButtonItem>

        <ButtonItem layout="below" onClick={() => open("https://github.com/dafta/DeckMTP")}>
          <span style={{ color: "#71c6ff" }}>DeckMTP</span> —{" "}
          {ru
            ? "за основу фронтенда, скрипт для сборки"
            : "for frontend base and build script"}
        </ButtonItem>

        <ButtonItem layout="below" onClick={() => open("https://github.com/DeckThemes/SDH-CssLoader")}>
          <span style={{ color: "#71c6ff" }}>CSSLoader</span> —{" "}
          {ru
            ? "реализация кнопки в заголовке, реализация страницы настроек"
            : "implementation of top-bar button and settings page"}
        </ButtonItem>

        <ButtonItem layout="below" onClick={() => open("https://github.com/EmuDeck/Emuchievements")}>
          <span style={{ color: "#71c6ff" }}>Emuchievements</span> —{" "}
          {ru
            ? "реализация уведомлений"
            : "notification system implementation"}
        </ButtonItem>

        <ButtonItem layout="below" onClick={() => open("https://t.me/@kvasiss")}>
          <span style={{ color: "#71c6ff" }}>Kvasiss</span> —{" "}
          {ru
            ? "помощь с разработкой, тестированием, поиском информации"
            : "help with development, testing, and research"}
        </ButtonItem>

        <PanelSectionRow>
          <div style={{ textAlign: "center", width: "100%" }}>
            <strong>{ru ? "Вам" : "You"}</strong> —{" "}
            {ru ? "за использование" : "for using"} <strong>DeckyWARP</strong>!
          </div>
        </PanelSectionRow>

        <ButtonItem layout="below" onClick={() => open("https://github.com/Kit1112/DeckyWARP")}>
          <span style={{ color: "#71c6ff" }}>
            {ru ? "Ссылка на Github проекта" : "Project GitHub Link"}
          </span>
        </ButtonItem>
      </div>
    </PanelSectionRow>

    <PanelSectionRow>
      <div style={{ fontSize: "12px", color: "#aaa", width: "100%", textAlign: "center" }}>
        <i>
          {ru
            ? "Разработано death_nick совместно с ChatGPT. Полностью свободны к использованию как код, так и плагин."
            : "Developed by death_nick in collaboration with ChatGPT. The code and plugin are entirely free to use."}
        </i>
      </div>
    </PanelSectionRow>
  </PanelSection>
);

export default Credits;
