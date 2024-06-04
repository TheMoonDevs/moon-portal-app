"use client";
import { setIsCreateLinkModalOpen } from "@/utils/redux/quicklinks/quicklinks.slice";
import { useAppDispatch } from "@/utils/redux/store";
import { Button } from "@mui/material";
import QuicklinkSearchBar from "./QuicklinkSearchBar";

// enum Path {
//   dashboard = "/quicklinks/dashboard",
//   department = "/quicklinks/department",
//   commonResources = "/quicklinks/common-resources",
// }
export default function QuicklinkHeader({
  children,
}: {
  children?: React.ReactNode;
}) {
  const dispatch = useAppDispatch();

  return (
    <header className="flex justify-between items-center">
      {children}
      <div className="flex gap-4">
        <QuicklinkSearchBar />
        <Button
          startIcon={<span className="material-icons">add</span>}
          variant="contained"
          className="!bg-zinc-900 !text-white"
          onClick={() => dispatch(setIsCreateLinkModalOpen(true))}
        >
          Quicklink
        </Button>
      </div>
    </header>
  );
}
