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
    <header className="flex justify-between items-center flex-col gap-2 sm:gap-0 sm:flex-row">
      {children}
      <div className="flex items-end justify-between sm:justify-start sm:gap-6 w-full sm:w-auto">
        <QuicklinkSearchBar />
        <Button
          startIcon={
            <span className="material-icons !text-sm !font-thin text-neutral-100">
              add
            </span>
          }
          variant="contained"
          className="!bg-zinc-900 !text-sm !rounded-lg  !capitalize !shadow-none hover:!bg-neutral-700  !text-neutral-100 !tracking-wider !py-[0.6rem]"
          onClick={() => dispatch(setIsCreateLinkModalOpen(true))}
        >
          Quicklink
        </Button>
      </div>
    </header>
  );
}
