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
export default function QuicklinkHeaderWrapper({
  children,
}: {
  children?: React.ReactNode;
}) {
  const dispatch = useAppDispatch();

  return (
    <header className="flex justify-between items-center">
      {children}
      <div className="flex items-end gap-6">
        <QuicklinkSearchBar />
        <Button
          startIcon={
            <span className="material-icons !font-thin text-neutral-100">
              add
            </span>
          }
          variant="contained"
          className="!bg-zinc-900 !rounded-lg !text-base !capitalize !shadow-none hover:!bg-neutral-700 !font-normal !text-neutral-100 !tracking-wider !py-[0.6rem]"
          onClick={() => dispatch(setIsCreateLinkModalOpen(true))}
        >
          Quicklink
        </Button>
      </div>
    </header>
  );
}
