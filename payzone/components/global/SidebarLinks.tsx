/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { List } from "@mui/material";
import { User } from "@prisma/client";
import Image from "next/image";

// ASSIGN-TODO : This sidebar is structured in the worst way, with both Drawer and the main componenet having the same stuff,
// but not abstract, the naming patterns are als not good.
// Please REFACTOR this.

export interface SidebarLinksProps {
  links: any;
  user?: User | null | undefined;
  path: string;
  signOut: () => void;
  textColorHexcode: string;
  toggleDrawer: (open: boolean) => () => void;
}

export const SidebarLinks = ({
  links,
  user,
  path,
  signOut,
  textColorHexcode,
  toggleDrawer,
}: SidebarLinksProps) => {
  const uppercasedTextColorHexcode = `#${
    textColorHexcode &&
    textColorHexcode
      .toUpperCase()
      .replace("#", "")
      .toUpperCase()
      .padStart(6, "0")
  }`;
  return (
    <>
      {user ? (
        <List className="h-screen bg-charcoal flex flex-col justify-between items-end w-full">
          <div className="flex flex-col gap-7">
            <div className="w-fit h-fit border-white border flex items-center justify-end gap-2 p-2">
              <span className="text-sm font-medium text-white tracking-widest">
                {user.name}
              </span>
              <img src={user.avatar as string} alt="" width={25} height={25} />
            </div>
            <div className="flex flex-col gap-4 items-end">
              {links.map((link: any) => (
                <Link
                  href={link.href}
                  key={link.title}
                  className={`tracking-[.2em] text-sm font-semibold`}
                  style={{
                    color: uppercasedTextColorHexcode
                      ? uppercasedTextColorHexcode
                      : "white",
                  }}
                  onClick={toggleDrawer(false)}
                >
                  {link.title}
                </Link>
              ))}
            </div>
          </div>
          <span
            className="mr-auto text-lg tracking-widest ml-2 text-white cursor-pointer flex items-center gap-2"
            onClick={signOut}
          >
            Logout{" "}
            <Image src="/icons/logout.svg" alt="" width={30} height={30} />
          </span>
        </List>
      ) : (
        <div className="w-full mt-14 lg:flex flex-col gap-4">
          {links.map((link: any) => (
            <Link
              href={link.href}
              key={link.title}
              className={`tracking-[.2em] rounded-xl py-3 px-2 text-sm font-regular hover:bg-neutral-800 flex items-center gap-2 ${
                path === link.href ? "  bg-neutral-800" : ""
              }`}
              style={{
                color:
                  uppercasedTextColorHexcode && path === link.href
                    ? uppercasedTextColorHexcode
                    : "#959595",
              }}
            >
              <Image
                src={link.icon}
                style={{
                  opacity: path === link.href ? 1 : 0.5,
                }}
                alt=""
                width={20}
                height={20}
              />
              {link.title}
            </Link>
          ))}
        </div>
      )}
    </>
  );
};
