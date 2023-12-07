import { APP_ROUTES } from "@/utils/constants/appInfo";

const NAVIGATION_OPTIONS = [
  {
    name: "Home",
    path: APP_ROUTES.home,
    icon: "home",
  },
  {
    name: "Teams",
    path: APP_ROUTES.teams,
    icon: "magnify",
  },
  {
    name: "Engagements",
    path: APP_ROUTES.engagements,
    icon: "",
  },
  {
    name: "Notifications",
    path: APP_ROUTES.notifications,
    icon: "",
  },
];

export const Bottombar = () => {
  return (
    <div className="flex flex-row abosulte bottom-0 left-0 right-0 bg-black">
      {NAVIGATION_OPTIONS.map((option) => (
        <div
          key={option.path}
          className="flex flex-col items-center justify-center w-1/3"
        >
          <span className="material-icons ">{option.icon}</span>
          <p className="text-white text-xs">{option.name}</p>
        </div>
      ))}
    </div>
  );
};
