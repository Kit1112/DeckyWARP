import { SidebarNavigation, ServerAPI } from "decky-frontend-lib";
import { BsGearFill } from "react-icons/bs";
import { FaDownload, FaHeart } from "react-icons/fa";
import PluginSettings from "./PluginSettings";
import Updates from "./Updates";
import Credits from "./Credits";

interface Props {
  serverAPI: ServerAPI;
}

const ru = navigator.language?.toLowerCase().startsWith("ru");

const t = (key: string): string => {
  const dict: Record<string, string> = {
    general: ru ? "Настройки" : "Settings",
    updates: ru ? "Обновление" : "Updates",
    credits: ru ? "Благодарности" : "Credits",
  };
  return dict[key] || key;
};

const SettingsPageRouter = ({ serverAPI }: Props) => (
  <SidebarNavigation
    pages={[
      {
        title: t("general"),
        icon: <BsGearFill />,
        route: "/deckywarp/settings/general",
        content: <PluginSettings serverAPI={serverAPI} />,
      },
      {
        title: t("updates"),
        icon: <FaDownload />,
        route: "/deckywarp/settings/updates",
        content: <Updates serverAPI={serverAPI} />,
      },
      {
        title: t("credits"),
        icon: <FaHeart />,
        route: "/deckywarp/settings/credits",
        content: <Credits serverAPI={serverAPI} />,
      },
    ]}
  />
);

export default SettingsPageRouter;
