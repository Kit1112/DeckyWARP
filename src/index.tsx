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

  // 💥 Передаём serverAPI в роутер настроек
  serverAPI.routerHook.addRoute("/deckywarp/settings", () => (
    <SettingsPageRouter serverAPI={serverAPI} />
  ));

  return {
    titleView: <TitleView />,
    content: <Content />,
    icon: <FaCloud />,
  };
});
