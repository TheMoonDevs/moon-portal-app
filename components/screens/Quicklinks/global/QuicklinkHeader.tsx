"use client";
import { useUser } from "@/utils/hooks/useUser";
import { setIsCreateLinkModalOpen } from "@/utils/redux/quicklinks/quicklinks.slice";
import { useAppDispatch } from "@/utils/redux/store";
import { Button } from "@mui/material";
import { usePathname, useSearchParams } from "next/navigation";
import QuicklinkSearchBar from "./QuicklinkSearchBar";
import { useQuickLinkDirs } from "../hooks/useQuickLinksDirs";

enum Path {
  dashboard = "/quicklinks/dashboard",
  department = "/quicklinks/department",
  commonResources = "/quicklinks/common-resources",
}
export default function QuicklinkHeader() {
  const dispatch = useAppDispatch();
  const path = usePathname();
  const { user } = useUser();
  const params = useSearchParams();
  const id = params?.get("id");
  const { thisDirectory, parentDirecotry, rootParent } = useQuickLinkDirs(id);

  return (
    <header className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl pb-2">
          {path?.startsWith(Path.dashboard) &&
            `${user?.name?.split(" ")[0] || user?.username}'s Dashboard`}

          {path?.startsWith(Path.department) && rootParent?.title}

          {path?.startsWith(Path.commonResources) && rootParent?.title}
        </h1>
        {path?.startsWith(Path.dashboard) && (
          <span className="text-sm text-neutral-400">
            Quicklinks is the fastest way to work collaboratively
          </span>
        )}
      </div>
      <div className="flex gap-4">
        <QuicklinkSearchBar />
        <Button
          startIcon={<span className="material-icons">add</span>}
          variant="contained"
          color="inherit"
          onClick={() => dispatch(setIsCreateLinkModalOpen(true))}
        >
          Add New Link
        </Button>
      </div>
    </header>
  );
}
