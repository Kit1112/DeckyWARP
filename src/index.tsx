import {
  definePlugin,
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  ToggleField,
  staticClasses,
  DialogButton,
  Focusable,
  Navigation,
  ServerAPI,
} from "decky-frontend-lib";
import { FaCloud } from "react-icons/fa";
import { BsGearFill } from "react-icons/bs";
import { Fragment, useEffect, useState } from "react";
import ReactDOMServer from "react-dom/server";
import SettingsPageRouter from "./pages/settings/SettingsPageRouter";

let api: ServerAPI;

const setServerAPI = (s: ServerAPI) => (api = s);

async function call<T = any>(name: string, params: Record<string, unknown>): Promise<T> {
  const r = await api.callPluginMethod<T>(name, params);
  if (r.success) return r.result;
  throw r.result;
}

const get_state = () => call<string>("get_state", {});
const toggle_warp = () => call<string>("toggle_warp", {});
const install_warp = () => call("install_warp", {});
const get_install_log = () => call<string>("get_install_log", {});
const stop_warp = () => call("stop_warp", {});

const txt = (ru: boolean, s: string): string => {
  const ruT: Record<string, string> = {
    connected: "Статус WARP: Подключено",
    disconnected: "Статус WARP: Отключено",
    error: "Статус WARP: Неизвестно",
    missing: "WARP не установлен",
    installing: "Установка WARP…",
  };
  const enT: Record<string, string> = {
    connected: "WARP status: connected",
    disconnected: "WARP status: disconnected",
    error: "WARP status: unknown",
    missing: "WARP is not installed",
    installing: "Installing WARP…",
  };
  return (ru ? ruT : enT)[s];
};

const Content = () => {
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const topBar = document.querySelector('[class*="TopBar"], [class*="topBar"]');
      if (!topBar || topBar.querySelector(".deckywarp-top-icon")) return;

      const icon = document.createElement("div");
      icon.className = "deckywarp-top-icon";
      icon.style.width = "24px";
      icon.style.height = "24px";
      icon.style.display = "flex";
      icon.style.alignItems = "center";
      icon.style.justifyContent = "center";
      icon.style.marginLeft = "6px";
      icon.style.color = "white";

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("fill", "currentColor");
      svg.setAttribute("viewBox", "0 0 640 512");
      svg.setAttribute("height", "18");
      svg.setAttribute("width", "18");
      svg.innerHTML = '<path d="M537.6 226.6c-28.7-82.4-111-138.6-200.3-138.6-63.6 0-122.8 29.5-161.2 79.4-72.6 6.3-128.1 67.1-128.1 141.3 0 79.5 64.5 144 144 144H496c70.7 0 128-57.3 128-128 0-63.3-45.9-116-104.4-129.1z"/>';
      icon.appendChild(svg);

      topBar.appendChild(icon);
      console.log("[DeckyWARP] FaCloud icon appended (fallback mode)");
      observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const [st, setSt] = useState<string>("error");
  const [log, setLog] = useState<string>("");

  const ru = navigator.language?.toLowerCase().startsWith("ru");

  const refreshState = async () => setSt(await get_state());
  const refreshLog = async () => setLog(await get_install_log());

  useEffect(() => {
    refreshState();
    const id = setInterval(() => {
      refreshState();
      refreshLog();
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <PanelSection>
      <PanelSectionRow>{txt(ru, st)}</PanelSectionRow>
      <PanelSectionRow>
        <div style={{ height: 8 }} />
      </PanelSectionRow>

      {st === "missing" ? (
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={async () => {
              setSt("installing");
              await install_warp();
            }}
          >
            {ru ? "Установить Cloudflare WARP" : "Install Cloudflare WARP"}
          </ButtonItem>
        </PanelSectionRow>
      ) : st === "installing" ? (
        <Fragment>
          <PanelSectionRow>
            <progress style={{ width: "100%" }} />
          </PanelSectionRow>
          <PanelSectionRow>
            <code style={{ fontSize: 12 }}>{log || "…"}</code>
          </PanelSectionRow>
        </Fragment>
      ) : (
        <PanelSectionRow>
          <ToggleField
            label="Cloudflare WARP"
            checked={st === "connected"}
            onChange={async () => setSt(await toggle_warp())}
          />
        </PanelSectionRow>
      )}
    </PanelSection>
  );
};

const TitleView = () => {
  const openSettings = () => {
    Navigation.CloseSideMenus();
    Navigation.Navigate("/deckywarp/settings");
  };

  return (
    <Focusable
      style={{
        display: "flex",
        padding: "0",
        width: "100%",
        boxShadow: "none",
        alignItems: "center",
        justifyContent: "space-between",
      }}
      className={staticClasses.Title}
    >
      <div style={{ marginLeft: 8 }}>DeckyWARP</div>
      <DialogButton
        style={{ height: "28px", width: "40px", minWidth: 0, padding: "10px 12px" }}
        onClick={openSettings}
      >
        <BsGearFill style={{ marginTop: "-4px", display: "block" }} />
      </DialogButton>
    </Focusable>
  );
};

(window as any).call = call;

export default definePlugin((serverAPI: ServerAPI) => {
  setServerAPI(serverAPI);

  serverAPI.routerHook.addRoute("/deckywarp/settings", () => (
    <SettingsPageRouter serverAPI={serverAPI} />
  ));

  return {
    titleView: <TitleView />,
    content: <Content />,
    icon: <FaCloud />,
  };
});
