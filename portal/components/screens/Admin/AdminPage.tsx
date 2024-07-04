import { MobileBox } from "../Login/Login";
import { AdminUsers } from "./AdminUsers";
import SendNotifications from "./SendNotifications";

export const AdminPage = () => {
  return (
    <div className="flex flex-row flex-wrap gap-4 items-center justify-center  bg-neutral-700 md:bg-neutral-900 h-screen overflow-y-hidden max-sm:flex-col max-sm:h-full max-sm:overflow-y-auto">
      <AdminUsers />
      <SendNotifications/>
    </div>
  );
};
