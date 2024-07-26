"use client";

import Image from "next/image";
import Link from "next/link";
import { DirectoryTree } from "./Directory/Directory";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { useQuickLinkDirectory } from "../../hooks/useQuickLinkDirectory";
import { Directory, ParentDirectory, ROOTTYPE } from "@prisma/client";
import { AddSectionPopup } from "./AddSectionPopup";
import { Tooltip } from "@mui/material";

export default function QuicklinkSidebar() {
  const {
    parentDirs,
    rootDirectories,
    selectedRootDir,
    setSelectedRoot,
    currentDirectory,
    setCurrentDirectory,
  } = useQuickLinkDirectory(true);
  const [viewType, setViewType] = useState<"root" | "selected">("selected");
  const [newDirectory, setNewDirectory] = useState<ParentDirectory | null>(
    null
  );

  useEffect(() => {
    setViewType(currentDirectory ? "selected" : "selected");
  }, [currentDirectory]);

  return (
    <div className="w-[350px] h-[100vh]  top-0">
      <aside className="fixed w-inherit h-[100vh] top-0 overflow-auto flex flex-col border-r-2">
        <div className="flex flex-row items-center gap-2 p-6">
          <Image
            src="/logo/logo.png"
            alt="The Moon Devs"
            width={38}
            height={38}
          />
          <h1 className="font-bold text-xl">The Moon Devs</h1>
        </div>
        {/* ---- Sidebar Root View  --- */}
        {viewType === "root" && (
          <nav className="mt-6">
            <ul className="flex flex-col  ">
              {rootDirectories.map((item) => (
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedRoot(item);
                  }}
                  key={item.id}
                  className={`rounded-lg flex flex-col relative mx-2 border border-white 
              ${
                selectedRootDir?.id === item.id
                  ? " border-neutral-900 my-2"
                  : ""
              }
              `}
                >
                  <Link
                    href={
                      item.slug === "/dashboard"
                        ? `/quicklinks/dashboard`
                        : `/quicklinks${item.slug}/${
                            parentDirs.find((dir) => dir.type === `${item.id}`)
                              ?.slug
                          }`
                    }
                    className=""
                  >
                    <li
                      className={`px-2 py-3 flex items-center gap-2 curspor-pointer
              hover:bg-neutral-100 group rounded-lg ${
                selectedRootDir?.id === item.id ? " font-bold" : ""
              }
              `}
                    >
                      <span
                        className={`material-symbols-outlined  !text-xl 
                    ${
                      selectedRootDir?.id === item.id
                        ? " opacity-100"
                        : " opacity-70"
                    }
                    `}
                      >
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

                  {selectedRootDir?.id === item.id && (
                    <ul className="p-2 flex flex-col border-t-2">
                      {parentDirs
                        .filter((_dir) => _dir?.type === item.id)
                        .map((dir) => (
                          <Link
                            key={dir.id}
                            href={`/quicklinks${
                              rootDirectories.find(
                                (_dir) => _dir.id === dir.type
                              )?.slug
                            }/${dir.slug}`}
                            className=""
                            onClick={(e) => {
                              setCurrentDirectory(dir);
                              //e.preventDefault();
                            }}
                          >
                            <li className="group flex w-full justify-between items-center gap-2 p-2 px-3 rounded-lg transition border border-neutral-100 hover:border-neutral-400">
                              {dir.title}
                              <button
                                className={`p-[4px] w-6 h-6 flex items-center justify-center ml-auto text-xs  
                 cursor-pointer invisible group-hover:visible rounded-full
                 `}
                              >
                                <span
                                  className={`material-symbols-outlined !text-sm `}
                                >
                                  chevron_right
                                </span>
                              </button>
                            </li>
                          </Link>
                        ))}
                      {/* <DirectoryTree
                      mainDirectory={parentDirs.filter(
                        (_dir) => _dir?.type === item.id
                      )}
                    /> */}
                    </ul>
                  )}
                </div>
              ))}
            </ul>
          </nav>
        )}
        {/* ---- Sidebar Selected View  --- */}
        {viewType === "selected" && (
          <div className="flex flex-col grow">
            <ul className="flex flex-row items-stretch px-2 py-3 mb-3 gap-2">
              {rootDirectories.map((item) => (
                <Tooltip
                  key={item.id}
                  className="flex flex-col "
                  title={item.title}
                >
                  <div
                    onClick={(e) => {
                      if (item.slug != "/dashboard") e.preventDefault();
                      setSelectedRoot(item);
                    }}
                    className={`rounded-lg flex flex-col relative`}
                  >
                    <Link
                      href={
                        item.slug === "/dashboard"
                          ? `/quicklinks/dashboard`
                          : `/quicklinks${item.slug}/${
                              parentDirs.find(
                                (dir) => dir.type === `${item.id}`
                              )?.slug
                            }`
                      }
                      className={`p-2 flex flex-col items-center border border-neutral-100 curspor-pointer
                      hover:border-neutral-500 group rounded-lg ${
                        selectedRootDir?.id === item.id
                          ? " font-bold border-neutral-900 drop-shadow-2xl"
                          : ""
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined  !text-md 
                    ${
                      selectedRootDir?.id === item.id
                        ? " opacity-100"
                        : " opacity-50"
                    }
                    `}
                      >
                        {item.logo}
                      </span>
                    </Link>
                  </div>
                </Tooltip>
              ))}
            </ul>
            {selectedRootDir && (
              <nav className="bg-neutral-100 grow rounded-3xl rounded-bl-none rounded-br-none drop-shadow-lg overflow-hidden">
                <div className="static overflow-y-scroll">
                  <div className="flex items-center justify-between px-2 py-3 sticky backdrop-blur-md">
                    <div className="ml-3">
                      <h4 className="text-lg font-bold">
                        {selectedRootDir?.title}
                      </h4>
                      <p className="text-sm opacity-70">
                        {selectedRootDir?.title != "My Dashboard" && currentDirectory?.title}
                      </p>
                    </div>
                    {/* <button
                      className={`p-[4px] w-8 h-8 flex items-center justify-center border-2 ml-auto text-xs  
                 cursor-pointer hover:bg-neutral-300 rounded-full
                 `}
                      onClick={() => setCurrentDirectory(null)}
                    >
                      <span className={`material-symbols-outlined !text-sm`}>
                        chevron_left
                      </span>
                    </button> */}
                    {selectedRootDir && (
                      <AddSectionPopup
                        id={selectedRootDir?.id}
                        root={selectedRootDir}
                        newDirectory={newDirectory}
                        setNewDirectory={setNewDirectory}
                      />
                    )}
                  </div>
                  {currentDirectory && (
                    <div className="flex flex-col">
                      <DirectoryTree
                        mainDirectory={parentDirs.filter(
                          (_dir) => _dir?.type === selectedRootDir?.id
                        )}
                        selectedDir={currentDirectory?.id}
                      />
                    </div>
                  )}
                </div>
              </nav>
            )}
          </div>
        )}
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
