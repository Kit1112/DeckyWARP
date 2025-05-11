import { ServerAPI } from "decky-frontend-lib";

let api: ServerAPI;
export const setServerAPI = (s: ServerAPI) => (api = s);

async function call<I, O>(name: string, params: I): Promise<O> {
  const r = await api.callPluginMethod<I, O>(name, params);
  if (r.success) return r.result;
  throw r.result;
}

export const get_state       = () => call<{}, "connected"|"disconnected"|"error"|"missing"|"installing">("get_state",{});
export const toggle_warp     = () => call<{}, "connected"|"disconnected"|"error">("toggle_warp",{});
export const install_warp    = () => call<{}, "started"|"installing">("install_warp",{});
export const get_install_log = () => call<{}, string>("get_install_log",{});
export const stop_warp       = () => call<{}, void>("stop_warp",{});
