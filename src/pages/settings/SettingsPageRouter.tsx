import { SidebarNavigation, ServerAPI } from "decky-frontend-lib";
import { BsGearFill } from "react-icons/bs";
import { FaDownload, FaHeart } from "react-icons/fa";
import PluginSettings from "./PluginSettings";
import Updates from "./Updates";
import Credits from "./Credits";

interface Props {
  serverAPI: ServerAPI;
}

const SettingsPageRouter = ({ serverAPI }: Props) => (
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
        content: <Updates serverAPI={serverAPI} />,
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
