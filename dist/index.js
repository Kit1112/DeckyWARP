(function (deckyFrontendLib, React) {
  'use strict';

  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  var React__default = /*#__PURE__*/_interopDefaultLegacy(React);

  var DefaultContext = {
    color: undefined,
    size: undefined,
    className: undefined,
    style: undefined,
    attr: undefined
  };
  var IconContext = React__default["default"].createContext && React__default["default"].createContext(DefaultContext);

  var __assign = window && window.__assign || function () {
    __assign = Object.assign || function (t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }
      return t;
    };
    return __assign.apply(this, arguments);
  };
  var __rest = window && window.__rest || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function") for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
      if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
    }
    return t;
  };
  function Tree2Element(tree) {
    return tree && tree.map(function (node, i) {
      return React__default["default"].createElement(node.tag, __assign({
        key: i
      }, node.attr), Tree2Element(node.child));
    });
  }
  function GenIcon(data) {
    // eslint-disable-next-line react/display-name
    return function (props) {
      return React__default["default"].createElement(IconBase, __assign({
        attr: __assign({}, data.attr)
      }, props), Tree2Element(data.child));
    };
  }
  function IconBase(props) {
    var elem = function (conf) {
      var attr = props.attr,
        size = props.size,
        title = props.title,
        svgProps = __rest(props, ["attr", "size", "title"]);
      var computedSize = size || conf.size || "1em";
      var className;
      if (conf.className) className = conf.className;
      if (props.className) className = (className ? className + " " : "") + props.className;
      return React__default["default"].createElement("svg", __assign({
        stroke: "currentColor",
        fill: "currentColor",
        strokeWidth: "0"
      }, conf.attr, attr, svgProps, {
        className: className,
        style: __assign(__assign({
          color: props.color || conf.color
        }, conf.style), props.style),
        height: computedSize,
        width: computedSize,
        xmlns: "http://www.w3.org/2000/svg"
      }), title && React__default["default"].createElement("title", null, title), props.children);
    };
    return IconContext !== undefined ? React__default["default"].createElement(IconContext.Consumer, null, function (conf) {
      return elem(conf);
    }) : elem(DefaultContext);
  }

  // THIS FILE IS AUTO GENERATED
  function FaCloud (props) {
    return GenIcon({"tag":"svg","attr":{"viewBox":"0 0 640 512"},"child":[{"tag":"path","attr":{"d":"M537.6 226.6c4.1-10.7 6.4-22.4 6.4-34.6 0-53-43-96-96-96-19.7 0-38.1 6-53.3 16.2C367 64.2 315.3 32 256 32c-88.4 0-160 71.6-160 160 0 2.7.1 5.4.2 8.1C40.2 219.8 0 273.2 0 336c0 79.5 64.5 144 144 144h368c70.7 0 128-57.3 128-128 0-61.9-44-113.6-102.4-125.4z"}}]})(props);
  }

  let api;
  const setServerAPI = (s) => (api = s);
  async function call(name, params) {
      const r = await api.callPluginMethod(name, params);
      if (r.success)
          return r.result;
      throw r.result;
  }
  const get_state = () => call("get_state", {});
  const toggle_warp = () => call("toggle_warp", {});
  const install_warp = () => call("install_warp", {});
  const get_install_log = () => call("get_install_log", {});
  const stop_warp = () => call("stop_warp", {});

  const txt = (ru, s) => {
      const ruT = {
          connected: "Статус WARP: Подключено",
          disconnected: "Статус WARP: Отключено",
          error: "Статус WARP: Неизвестно",
          missing: "WARP не установлен",
          installing: "Установка WARP…",
      };
      const enT = {
          connected: "WARP status: connected",
          disconnected: "WARP status: disconnected",
          error: "WARP status: unknown",
          missing: "WARP is not installed",
          installing: "Installing WARP…",
      };
      return (ru ? ruT : enT)[s];
  };
  const Content = () => {
      const [st, setSt] = React.useState("error");
      const [log, setLog] = React.useState("");
      const ru = navigator.language?.toLowerCase().startsWith("ru");
      const refreshState = async () => setSt(await get_state());
      const refreshLog = async () => setLog(await get_install_log());
      React.useEffect(() => {
          refreshState();
          const id = setInterval(() => {
              refreshState();
              refreshLog();
          }, 3000);
          return () => clearInterval(id);
      }, []);
      return (window.SP_REACT.createElement(deckyFrontendLib.PanelSection, null,
          window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null, txt(ru, st)),
          window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null,
              window.SP_REACT.createElement("div", { style: { height: 8 } })),
          st === "missing" ? (window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null,
              window.SP_REACT.createElement(deckyFrontendLib.ButtonItem, { layout: "below", onClick: async () => { setSt("installing"); await install_warp(); } }, ru ? "Установить Cloudflare WARP" : "Install Cloudflare WARP"))) : st === "installing" ? (window.SP_REACT.createElement(window.SP_REACT.Fragment, null,
              window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null,
                  window.SP_REACT.createElement("progress", { style: { width: "100%" } })),
              window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null,
                  window.SP_REACT.createElement("code", { style: { fontSize: 12 } }, log || "…")))) : (window.SP_REACT.createElement(deckyFrontendLib.PanelSectionRow, null,
              window.SP_REACT.createElement(deckyFrontendLib.ToggleField, { label: "Cloudflare WARP", checked: st === "connected", onChange: async () => setSt(await toggle_warp()) })))));
  };
  var index = deckyFrontendLib.definePlugin((serverAPI) => {
      setServerAPI(serverAPI);
      return {
          title: window.SP_REACT.createElement("div", { className: deckyFrontendLib.staticClasses.Title }, "WARP"),
          content: window.SP_REACT.createElement(Content, { serverAPI: serverAPI }),
          icon: window.SP_REACT.createElement(FaCloud, null),
          onDismount() { stop_warp(); },
      };
  });

  return index;

})(DFL, SP_REACT);
