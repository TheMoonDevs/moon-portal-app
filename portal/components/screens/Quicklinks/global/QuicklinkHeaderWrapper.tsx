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

  const handleOpenModal = () => {
    dispatch(setIsCreateLinkModalOpen(true));
  };

  return (
    <header className="flex justify-between items-center">
      {children}
      <div className="flex items-end gap-6">
        <QuicklinkSearchBar />
        <Button
          startIcon={
            <span className="material-icons !text-sm !font-thin text-neutral-100">
              add
            </span>
          }
          variant="contained"
          className="!bg-zinc-900 !text-sm !rounded-lg !capitalize !shadow-none hover:!bg-neutral-700 !text-neutral-100 !tracking-wider !py-[0.6rem]"
          onClick={handleOpenModal} // Trigger modal opening here
        >
          Quicklink
        </Button>
      </div>
    </header>
  );
}
