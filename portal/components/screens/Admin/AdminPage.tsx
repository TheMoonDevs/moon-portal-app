import { MobileBox } from "../Login/Login";
import { AdminUsers } from "./AdminUsers";

export const AdminPage = () => {
  return (
    <div className="flex flex-row flex-wrap gap-4 items-center justify-center py-2 bg-neutral-700 md:bg-neutral-900 h-screen">
      <AdminUsers />
      {/* <AdminUsers />
      <AdminUsers /> */}
    </div>
  );
};
