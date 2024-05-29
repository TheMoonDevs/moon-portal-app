import { setNewParentDir } from "@/utils/redux/quicklinks/quicklinks.slice";
import { useAppDispatch } from "@/utils/redux/store";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { Popover } from "@mui/material";
import { Directory, ParentDirectory, ROOTTYPE } from "@prisma/client";
import { useState } from "react";

export const AddSectionPopup = ({
  id,
  root,
  newDirectory,
  setNewDirectory,
}: {
  id: string;
  root: Directory;
  newDirectory: ParentDirectory | null;
  setNewDirectory: React.Dispatch<React.SetStateAction<ParentDirectory | null>>;
}) => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    if (root.id === ROOTTYPE.DEPARTMENT) {
      setNewDirectory({
        id: root.id,
        title: "",
        type: ROOTTYPE.DEPARTMENT,
        slug: "",
        logo: "",
      });
    } else if (root.id === ROOTTYPE.COMMON_RESOURCES) {
      setNewDirectory({
        id: root.id,
        title: "",
        type: ROOTTYPE.COMMON_RESOURCES,
        slug: "",
        logo: "",
      });
    } else setNewDirectory(null);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAddSection = async () => {
    try {
      setLoading(true);
      const data = await QuicklinksSdk.createData(
        "/api/quicklinks/department",
        {
          title: newDirectory?.title || "New Department",
          logo: "",
          slug: newDirectory?.slug || "new-department",
          type: newDirectory?.type || ROOTTYPE.DEPARTMENT,
        } as Omit<ParentDirectory, "id">
      );
      dispatch(setNewParentDir(data?.data?.department));
      console.log(data?.data?.department);
      setLoading(false);
      handleClose();
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  const open = Boolean(anchorEl);
  const _id = anchorEl ? id + "simple-popover" : undefined;

  //console.log(newDirectory);

  return (
    <>
      <button
        className={`p-[4px] w-6 h-6 flex items-center justify-center border-2 ml-auto text-xs  
                 cursor-pointer invisible group-hover:visible  hover:bg-neutral-200 rounded-full
                 `}
        onClick={handleClick}
      >
        <span className={`material-symbols-outlined !text-xs`}>add</span>
      </button>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        closeAfterTransition
        classes={{
          paper: "bg-white mt-4 rounded-[20px]",
        }}
      >
        <div className="flex flex-col justify-center items-center">
          <input
            className="border-b p-3 text-md focus:outline-none focus:border-b-gray-600 transition-colors duration-500"
            type="text"
            placeholder="Enter Section Name"
            onChange={(e) => {
              //console.log(e, e.target.value);
              setNewDirectory((n) => {
                //console.log(n, e.target.value);
                return n
                  ? {
                      ...n,
                      title: e.target.value,
                      slug: e.target.value
                        .replaceAll(/\s+/g, "-")
                        .toLowerCase(),
                    }
                  : n;
              });
            }}
            value={newDirectory?.title || ""}
            required
          />
          <input
            className="border-b p-3 text-md focus:outline-none focus:border-b-gray-600 transition-colors duration-500"
            type="text"
            placeholder="Enter Section Slug"
            onChange={(e) => {
              setNewDirectory((n) =>
                n
                  ? {
                      ...n,
                      slug: e.target.value,
                    }
                  : n
              );
            }}
            value={newDirectory?.slug || ""}
            required
          />
          <button
            className="!self-stretch rounded-xl bg-neutral-900 text-white text-[12px] uppercase p-3 tracking-widest m-4"
            type="submit"
            onClick={() => handleAddSection()}
          >
            {loading ? "Adding..." : "Add Section"}
          </button>
        </div>
      </Popover>
    </>
  );
};
