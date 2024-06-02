import useClipboardURLDetection from "@/utils/hooks/useClipboardUrlDetection";
import { useUser } from "@/utils/hooks/useUser";
import {
  addNewQuicklink,
  setIsCreateLinkModalOpen,
} from "@/utils/redux/quicklinks/quicklinks.slice";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { Button, Popover, Slide, Tooltip } from "@mui/material";
import { ROOTTYPE } from "@prisma/client";
import { usePathname, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast, Toaster } from "sonner";

export const CreateLinkPopup = () => {
  const { parentDirs, directories, isCreateLinkModalOpen } = useAppSelector(
    (state) => state.quicklinks
  );
  const dispatch = useAppDispatch();
  const [anchorEl, setAnchorEl] = useState<HTMLSpanElement | null>(null);
  const [isLinkPopupOpen, setIsLinkPopupOpen] = useState(false);
  const path = usePathname();
  const searchParams = useSearchParams();
  const { user } = useUser();

  const directoryId = searchParams?.get("id");
  const [selectedDepartment, setSelectedDepartment] = useState({
    id: "",
    title: "",
  });

  const open = Boolean(anchorEl);

  const { copiedURL, setCopiedURL } = useClipboardURLDetection();

  const departmentId = useMemo(() => {
    const getDepartmentId = (directoryId: string | null): string => {
      let departmentId = "";
      if (!directoryId) return departmentId;
      const thisDirectory =
        parentDirs?.find((_dir) => _dir.id === directoryId) ||
        directories?.find((_dir) => _dir.id === directoryId);

      if (thisDirectory && "parentDirId" in thisDirectory) {
        return getDepartmentId(thisDirectory?.parentDirId);
      } else {
        departmentId =
          thisDirectory?.type === ROOTTYPE.DEPARTMENT
            ? thisDirectory?.id
            : selectedDepartment.id;
        return departmentId;
      }
    };
    return directoryId ? getDepartmentId(directoryId) : selectedDepartment.id;
  }, [directoryId, selectedDepartment, parentDirs, directories]);

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      if (!user?.id) {
        throw new Error("User not found");
      }
      const formData = new FormData(e.currentTarget);
      const link = formData.get("link") as string;
      console.log(link);
      const metadata = await QuicklinksSdk.getLinkMetaData(link);
      // store the metadata in db
      const newLinkData = {
        title: metadata.title,
        description: metadata.description,
        logo: metadata.image,
        url: metadata.url,
        clickCount: 0,
        directoryId: directoryId,
        departmentId:
          departmentId ||
          (selectedDepartment.id !== "" && selectedDepartment.id) ||
          null,
        authorId: user?.id,
      };

      //console.log(newLinkData, "newLinkData", metadata);
      //return;
      const response = QuicklinksSdk.createData(
        "/api/quicklinks/link",
        newLinkData
      );

      toast.promise(response, {
        loading: "Loading...",
        success: (data: any) => {
          dispatch(addNewQuicklink(data.data.link));

          return (
            <div className="flex flex-col gap-2">
              <span className="font-bold">Quiklink added!</span>
              <span className="text-sm">{data.data.link.title}</span>
            </div>
          );
        },
        error: (error: any) => {
          return `${(error as Error).message}`;
        },
      });
    } catch (error) {
      console.log(error);
      toast.error(`${(error as Error).message}`);
    }
  };

  return (
    <Slide
      direction="up"
      in={isCreateLinkModalOpen || Boolean(copiedURL)}
      mountOnEnter
      unmountOnExit
    >
      <div className={`fixed bottom-10 right-10 w-fit shadow-md bg-white p-6`}>
        <span
          onClick={() => {
            dispatch(setIsCreateLinkModalOpen(false));
            setCopiedURL(null);
          }}
          className="material-icons-outlined absolute -top-4 -right-4 text-gray-500 rounded-full p-1  border border-gray-100 hover:bg-gray-50 cursor-pointer"
        >
          close
        </span>
        <Toaster
          duration={3000}
          position="bottom-left"
          richColors
          closeButton
        />
        <form
          className="flex flex-col justify-center gap-4"
          onSubmit={handleSave}
        >
          <label htmlFor="link" className="text-xl mb-3">
            <span className="block">Create New Quicklink</span>
            <span className="text-gray-500 text-sm">
              We have detected a copied link. Save it to <br />
              <code className="bg-neutral-100 text-gray-500 p-1 rounded-md">
                {selectedDepartment.title !== ""
                  ? selectedDepartment.title
                  : `${path?.split("/")[3]}
                /${path?.split("/")[4]}`}
              </code>
              ?
            </span>
          </label>
          <div className="flex items-center gap-4">
            <div className="relative flex items-center bg-neutral-100 rounded-md">
              <Tooltip title="Select Department">
                <div
                  className="flex items-center cursor-pointer"
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                >
                  <span className="material-icons-outlined text-gray-500 p-2">
                    groups
                  </span>
                  <span className="material-icons-outlined text-gray-500 p-2">
                    {open ? "arrow_drop_up" : "arrow_drop_down"}
                  </span>
                </div>
              </Tooltip>
              <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{
                  vertical: "top",
                  horizontal: "left",
                }}
                transformOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                closeAfterTransition
                classes={{
                  paper: "bg-white mb-4 py-2 rounded-md",
                }}
              >
                <ul className=" flex flex-col gap-2 min-w-fit w-[calc(100%+100px)]  mb-2">
                  {parentDirs.map((parentDir) => (
                    <li
                      key={parentDir.id}
                      className=" text-gray-500 text-sm hover:bg-neutral-100 p-2 cursor-pointer"
                      onClick={() => {
                        setSelectedDepartment({
                          id: parentDir.id,
                          title: parentDir.title,
                        });
                        setAnchorEl(null);
                      }}
                    >
                      {parentDir.title}
                    </li>
                  ))}
                </ul>
              </Popover>
            </div>
            <input
              className="border-b placeholder:text-sm  focus:outline-none focus:border-b-gray-600 transition-colors duration-500 w-full"
              type="url"
              name="link"
              id="link"
              required
              placeholder="Paste Link Here"
            />
          </div>
          {/* <div className="flex gap-4 items-center self-end"> */}
          {/* <button
              className="text-sm hover:bg-neutral-100  border border-neutral-800 px-4 py-2 rounded-md"
              onClick={() => {
                setIsLinkPopupOpen(false);
                setCopiedURL(null);
              }}
              type="button"
            >
              Cancel
            </button> */}
          <button
            type="submit"
            className="text-sm  bg-black text-white border border-neutral-800 px-6 py-2 rounded-md w-full"
          >
            Save
          </button>
          {/* </div> */}
        </form>
      </div>
    </Slide>
  );
};
