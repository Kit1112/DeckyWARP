import { SidebarNavigation } from "decky-frontend-lib";
import { BsGearFill } from "react-icons/bs";
import { FaDownload, FaHeart } from "react-icons/fa";
import PluginSettings from "./PluginSettings";
import Updates from "./Updates";
import Credits from "./Credits";

const SettingsPageRouter = () => (
  <SidebarNavigation
    pages={[
      {
        title: "Настройки",
        icon: <BsGearFill />,
        route: "/deckywarp/settings/general",
        content: <PluginSettings />,
      },
      {
        title: "Обновление",
        icon: <FaDownload />,
        route: "/deckywarp/settings/updates",
        content: <Updates />,
      },
      {
        title: "Благодарности",
        icon: <FaHeart />,
        route: "/deckywarp/settings/credits",
        content: <Credits />,
      },
    ]}
  />
);

export default SettingsPageRouter;
