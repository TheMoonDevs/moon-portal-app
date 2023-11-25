import { APP_ROUTES } from "@/utils/constants/appInfo";
import Link from "next/link";

const AdminLinks = [
  {
    path: APP_ROUTES.admin,
    name: "Dashboard",
  },
  {
    path: APP_ROUTES.userEditor,
    name: "New User",
  },
];

export const AdminHeader = () => {
  return (
    <div className="flex flex-row mb-8 w-4/5 gap-4 items-center justify-start">
      {AdminLinks.map((link) => (
        <Link key={link.path} href={link.path}>
          <div className="flex flex-row gap-2 items-center justify-center text-black hover:text-neutral-500 px-4 py-2 rounded-lg cursor-pointer">
            <p className="">{link.name}</p>
          </div>
        </Link>
      ))}
    </div>
  );
};
