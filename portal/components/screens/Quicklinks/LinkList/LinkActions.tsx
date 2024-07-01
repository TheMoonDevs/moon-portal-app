import { Popover } from "@mui/material";
import { Link as Quicklink } from "@prisma/client";
import { useState } from "react";
import { EditLinkPopup } from "./EditLinkPopup";
import { QuicklinksToast } from "../elements/QuicklinksToast";
import { useAppSelector } from "@/utils/redux/store";

export type FormFields = {
  title: string;
  description: string;
  url: string;
  id: string;
  logo: string;
  image: string;
};

export const LinkActions = ({
  link,
  handleFavoriteClick,
  handleDeleteLink,
}: {
  link: Quicklink;
  handleFavoriteClick: (link: Quicklink) => void;
  handleDeleteLink: (linkId: string) => void;
}) => {
  const [deleteButtonId, setDeleteButtonId] = useState<string | null>();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [fields, setFields] = useState<FormFields>({
    title: link.title,
    description: link.description,
    url: link.url,
    id: link.id,
    logo: link.logo,
    image: link.image,
  });
  const { toast } = useAppSelector((state) => state.quicklinks);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = link ? link.id + "simple-popover" : undefined;

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const deletePopup = () => {
    return (
      <div className="flex flex-col gap-1 p-4">
        <h1 className="text-lg ">This will delete this link!</h1>
        <p className="text-xs text-gray-500">{link.title}</p>
        <div className="flex mt-3 items-center gap-3 text-xs ">
          <button
            onClick={() => handleDeleteLink(link.id)}
            className="flex items-center  gap-2 cursor-pointer hover:bg-green-300 py-1 px-2 rounded-md bg-green-100 text-black"
          >
            <span
              className={`material-symbols-outlined text-xs cursor-pointer transition-all`}
            >
              done
            </span>
            Confirm
          </button>
          <button
            onClick={() => setDeleteButtonId(null)}
            className="flex items-center gap-2 cursor-pointer hover:bg-red-300 py-1 px-2 rounded-md bg-red-100 text-black"
          >
            <span
              className={`material-symbols-outlined text-xs cursor-pointer transition-all`}
            >
              close
            </span>
            Cancel
          </button>
        </div>
      </div>
    );
  };
  const generalPopup = () => {
    return (
      <div className="flex flex-col gap-1 text-xs">
        <p
          className="flex items-center gap-2 cursor-pointer hover:bg-neutral-100 p-2 rounded-md"
          onClick={() => handleFavoriteClick(link)}
        >
          <span
            className={`${
              link.isFavorite
                ? "material-symbols-filled"
                : "material-symbols-outlined"
            } material-icons cursor-pointer transition-all`}
          >
            tab_new_right
          </span>
          Dashboard
        </p>
        <p
          className="flex items-center gap-2 cursor-pointer hover:bg-neutral-100 p-2 rounded-md"
          onClick={() => {
            setIsModalOpen(true);
            setAnchorEl(null);
          }}
        >
          <span
            className={`material-symbols-outlined cursor-pointer transition-all`}
          >
            edit
          </span>
          Edit Link
        </p>
        <p
          className="flex items-center gap-2 cursor-pointer hover:bg-neutral-100 p-2 rounded-md"
          onClick={() => {
            setDeleteButtonId(link.id);
          }}
        >
          <span
            className={`material-symbols-outlined cursor-pointer transition-all`}
          >
            delete
          </span>
          Delete Link
        </p>
      </div>
    );
  };

  //console.log(id);

  return (
    <div className="flex flex-col gap-2 items-center absolute right-1 top-1">
      <span
        aria-describedby={id}
        data-popover-trigger="hover"
        className={`material-symbols-outlined !hidden group-hover:!block group-hover:!opacity-50 hover:bg-neutral-200 cursor-pointer transition-all`}
        onClick={handleClick}
      >
        more_vert
      </span>
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
      >
        <div>{deleteButtonId === link.id ? deletePopup() : generalPopup()}</div>
      </Popover>
      <EditLinkPopup
        isModalOpen={isModalOpen}
        handleCloseModal={handleCloseModal}
        fields={fields}
        setFields={setFields}
      />
    </div>
  );
};
