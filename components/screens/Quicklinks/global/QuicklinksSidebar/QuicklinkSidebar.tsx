"use client";

import Image from "next/image";
import Link from "next/link";
import { DirectoryTree } from "./Directory/Directory";
import { useState } from "react";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { setNewDepartment } from "@/utils/redux/quicklinks/quicklinks.slice";

export default function QuicklinkSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const dispatch = useAppDispatch();
  const { departments } = useAppSelector((state) => state.quicklinks);

  const handleCreateDepartment = async () => {
    try {
      const department = await QuicklinksSdk.createData(
        "/api/quicklinks/department",
        {
          name: "New Department",
          logo: "",
          slug: "new-department",
          parentDirId: null,
        }
      );
      dispatch(setNewDepartment(department));
      console.log(department);
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <aside className="p-6 fixed w-inherit top-0 overflow-auto">
      <div className="flex flex-row items-center gap-2">
        <Image
          src="/logo/logo.png"
          alt="The Moon Devs"
          width={38}
          height={38}
        />
        <h1 className="font-bold text-xl">The Moon Devs</h1>
      </div>
      <nav className="mt-12">
        <ul className="flex flex-col gap-2">
          <Link href="/quicklinks/dashboard" className="mb-4">
            <li className="flex items-center gap-2">
              <span className="material-icons-outlined opacity-70 !text-xl">
                dashboard
              </span>
              My Dashboard
            </li>
          </Link>

          <ul>
            <DirectoryTree
              mainDirectory={departments.filter(
                (item) => item.type === "COMMON_RESOURCES"
              )}
            />
          </ul>
          <ul className="">
            <li className="flex items-center justify-between cursor-pointer py-4 group">
              <div
                className="flex items-center gap-1"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <span className="material-icons-outlined opacity-20 hover:opacity-50">
                  {isExpanded ? `expand_less` : `expand_more`}
                </span>
                {/* <Link href="/quicklinks/department"> */}
                Department
                {/* </Link> */}
              </div>
              <span
                className="material-icons-outlined opacity-0 group-hover:opacity-50 !text-base"
                onClick={handleCreateDepartment}
              >
                add
              </span>
            </li>
            <li
              className={`ml-4 border-l-2 border-gray-200 ${
                isExpanded ? "max-h-[1000px]" : "max-h-0 overflow-hidden"
              } transition-all duration-300`}
            >
              <DirectoryTree
                mainDirectory={departments.filter(
                  (item) => item.type === "DEPARTMENT"
                )}
              />
            </li>
          </ul>
        </ul>
      </nav>
    </aside>
  );
}
