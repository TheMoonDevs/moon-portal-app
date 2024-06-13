/* eslint-disable @next/next/no-img-element */
"use client";

import { APP_ROUTES, MEMBER_SIDEBAR_LINKS } from "@/utils/constants/appInfo";
import Image from "next/image";
import Link from "next/link";
import Drawer from "@mui/material/Drawer";
import { useState } from "react";
import { useAppSelector } from "@/utils/redux/store";

import { usePathname } from "next/navigation";
import { useAuthSession } from "@/utils/hooks/useAuthSession";
import { SidebarLinks } from "@/components/global/SidebarLinks";

// ASSIGN-TODO : This sidebar is structured in the worst way, with both Drawer and the main componenet having the same stuff,
// but not abstract, the naming patterns are als not good.
// Please REFACTOR this.

export const MemberSidebar = () => {
  const { signOut, user } = useAuthSession();
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const links = MEMBER_SIDEBAR_LINKS;
  const adminLinks = links.filter((link) => link.adminOnly && user?.isAdmin);
  const nonAdminLinks = links.filter((link) => !link.adminOnly);
  const printedLinks = [...nonAdminLinks, ...adminLinks];


  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  return (
    <section className="w-full h-14 lg:h-full flex lg:flex-col justify-between lg:fixed top-0 lg:w-[15%]">
      <div>
        <Link href={APP_ROUTES.home}>
          <div className="hidden lg:flex items-center w-auto gap-3 mt-6">
            <Image src="/logo/payzone.svg" alt="" width={47} height={47} />
            <p className="text-xs tracking-[.2em] text-white mt-4">
              <span className="text-lg font-bold">PAYZONE</span>
              <br />
              <span className="text-[10px]">THE MOON DEVS</span>
            </p>
          </div>
          <div className="lg:hidden flex items-center w-fit gap-3 mt-4">
            <Image src="/logo/payzone.svg" alt="" width={27} height={27} />
            <p className="text-xs tracking-[.2em] text-white mt-4">
              <span className="text-lg">PAYZONE</span>
              <br />
              <span className="text-[10px]">THE MOON DEVS</span>
            </p>
          </div>
        </Link>
        <div className="hidden mt-14 lg:flex flex-col gap-7">
          <SidebarLinks
            links={printedLinks}
            path={path}
            signOut={signOut}
            textColorHexcode="#ffffff"
          />
        </div>
      </div>
      <div className="lg:hidden flex items-center" onClick={toggleDrawer(true)}>
        <Image src="/logo/menu.svg" alt="" width={30} height={30} />
      </div>
      <Drawer
        open={open}
        onClose={toggleDrawer(false)}
        anchor="right"
        className="lg:hidden "
      >
        <SidebarLinks
          links={printedLinks}
          user={user}
          path={path}
          signOut={signOut}
          textColorHexcode="#ffffff"
        />
      </Drawer>

      <div
        className="text-white hidden lg:block mb-4 text-lg tracking-widest cursor-pointer"
        onClick={signOut}
      >
        Logout
      </div>
    </section>
  );
};
