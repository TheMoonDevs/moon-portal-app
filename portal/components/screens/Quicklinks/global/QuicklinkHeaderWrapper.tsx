import { Chip } from "@mui/material";
import { BreadCrumbs } from "../elements/BreadCrumbs";
import { ROOTTYPE } from "@prisma/client";
import { ViewButtonGroup } from "../LinkList/ViewButtonGroup";

export default function QuicklinkHeaderWrapper({
  children,
  custom = false,
  title,
  withBreadcrumb,
  icon,
  type,
}: {
  children?: React.ReactNode;
  custom?: boolean;
  title: string;
  withBreadcrumb?: {
    rootType: ROOTTYPE;
  };
  icon?: string;
  type?: "folder" | "link";
}) {
  return (
    <header className="flex justify-between items-center">
      {custom && children}
      {!custom &&
        (!withBreadcrumb ? (
          <div className="flex justify-between items-start w-full">
            <h1 className="text-3xl font-bold flex items-start gap-4">
              {icon && icon !== "" ? (
                <span className="material-symbols-outlined border border-neutral-200 rounded-full p-2">
                  {icon}
                </span>
              ) : (
                <span className="material-symbols-outlined border border-neutral-200 rounded-full p-2 uppercase">
                  folder
                </span>
              )}
              <div className="flex items-center gap-6">
                <span>{title.toUpperCase()}</span>
              </div>
            </h1>
            {type === "link" && <ViewButtonGroup />}
          </div>
        ) : (
          <div className="flex flex-col justify-start items-start">
            <h1 className="text-3xl font-bold flex items-start gap-4">
              {icon && icon !== "" ? (
                <span className="material-symbols-outlined border border-neutral-200 rounded-full p-2">
                  {icon}
                </span>
              ) : (
                <span className="material-symbols-outlined border border-neutral-200 rounded-full p-2">
                  folder
                </span>
              )}
              <div className="flex flex-col">
                <div className="flex items-center gap-6">
                  <span>{title.toUpperCase()}</span>
                </div>
                <BreadCrumbs rootType={withBreadcrumb.rootType} />
              </div>
            </h1>
          </div>
        ))}
    </header>
  );
}
