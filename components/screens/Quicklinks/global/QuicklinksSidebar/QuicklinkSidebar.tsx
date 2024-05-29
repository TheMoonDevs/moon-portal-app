"use client";

import Image from "next/image";
import Link from "next/link";
import { DirectoryTree } from "./Directory/Directory";
import { useState } from "react";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { setNewParentDir } from "@/utils/redux/quicklinks/quicklinks.slice";
import { useQuickLinkDirectory } from "./useQuickLinkDirectory";
import { Directory, ParentDirectory, ROOTTYPE } from "@prisma/client";
import { AddSectionPopup } from "./AddSectionPopup";

export default function QuicklinkSidebar() {
  const dispatch = useAppDispatch();
  const {
    parentDirs,
    directories,
    rootDirectories,
    selectedRootDir,
    setSelectedRoot,
  } = useQuickLinkDirectory();
  const [newDirectory, setNewDirectory] = useState<ParentDirectory | null>(
    null
  );

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
      dispatch(setNewParentDir(department));
      console.log(department);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="w-96 h-[100vh]  top-0">
      <aside className="fixed w-inherit h-[100vh] top-0 overflow-auto border-r-2">
        <div className="flex flex-row items-center gap-2 p-6">
          <Image
            src="/logo/logo.png"
            alt="The Moon Devs"
            width={38}
            height={38}
          />
          <h1 className="font-bold text-xl">The Moon Devs</h1>
        </div>
        <nav className="mt-6">
          <ul className="flex flex-col  ">
            {rootDirectories.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg flex flex-col relative 
              ${selectedRootDir?.id === item.id ? "bg-neutral-100 my-2" : ""}
              `}
              >
                <Link
                  href={
                    item.slug === "/dashboard" ? `/quicklinks/dashboard` : ""
                  }
                  className=""
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedRoot(item);
                  }}
                >
                  <li
                    className={`px-2 mx-2 py-3 flex items-center gap-2 curspor-pointer
              hover:bg-neutral-100 group rounded-lg ${
                selectedRootDir?.id === item.id ? " font-bold" : ""
              }
              `}
                  >
                    <span className="material-symbols-outlined opacity-70 !text-xl">
                      {item.logo}
                    </span>
                    {item.title}
                    {item.slug != "/dashboard" && (
                      <AddSectionPopup
                        id={item.id}
                        root={item}
                        newDirectory={newDirectory}
                        setNewDirectory={setNewDirectory}
                      />
                    )}
                  </li>
                </Link>

                <ul>
                  <DirectoryTree
                    mainDirectory={parentDirs.filter(
                      (_dir) => _dir?.type === item.id
                    )}
                  />
                </ul>
              </div>
            ))}
          </ul>
        </nav>
      </aside>

      {/* {newDirectory && (
        <div className="z-[2000] fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white/20 backdrop-blur-sm">
          <div className="w-3/5 h-4/5 bg-white rounded-xl border">
            <div className="flex flex-row items-center justify-between p-6  border-b-2 ">
              <h1 className="font-bold text-2xl">
                {rootDirectories.find((r) => r.id === newDirectory?.id)?.title}{" "}
                {">"} {newDirectory?.title || "New Section"}
              </h1>
              <button
                className="material-icons-outlined opacity-70 hover:opacity-50 !text-xl"
                onClick={() => setNewDirectory(null)}
              >
                close
              </button>
            </div>
            <div className="flex flex-col justify-center items-center gap-4 p-6">
              <input
                className="border-b focus:outline-none focus:border-b-gray-600 transition-colors duration-500"
                type="text"
                placeholder="Enter Section Name"
                onChange={(e) => {
                  setNewDirectory({
                    ...newDirectory,
                    title: e.target.value,
                  });
                }}
                value={newDirectory?.title || ""}
                required
              />
              <input
                className="border-b focus:outline-none focus:border-b-gray-600 transition-colors duration-500"
                type="text"
                placeholder="Enter Section Slug"
                onChange={(e) => {
                  setNewDirectory({
                    ...newDirectory,
                    slug: e.target.value,
                  });
                }}
                value={newDirectory?.slug || ""}
                required
              />
              <button
                className="!self-end !mt-8 w-full"
                type="submit"
                onClick={() => handleCreateDepartment()}
              >
                Add Section
              </button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
}
