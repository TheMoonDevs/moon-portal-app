import React, { useState, useEffect, FormEvent } from "react";
import {
  Modal,
  Box,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Link as LinkIcon,
  Save,
} from "@mui/icons-material";
import useClipboardURLDetection from "@/utils/hooks/useClipboardUrlDetection";
import { toast, Toaster } from "sonner";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { addNewQuicklink } from "@/utils/redux/quicklinks/quicklinks.slice";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { usePathname } from "next/navigation";
import { useUser } from "@/utils/hooks/useUser";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
  borderRadius: "8px",
};

const ClipboardURLModal = () => {
  const { copiedURL, setCopiedURL } = useClipboardURLDetection();
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { activeDirectoryId } = useAppSelector((state) => state.quicklinks);
  const dispatch = useAppDispatch();
  const [selectedParentDir, setSelectedParentDir] = useState({
    id: "",
    title: "",
  });
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const path = usePathname();
  const { user } = useUser();

  useEffect(() => {
    if (copiedURL) {
      setOpen(true);
    }
  }, [copiedURL]);

  const handleClose = () => {
    setOpen(false);
    setCopiedURL(null);
  };

  //! This is a workaround to check if the pasted data is a URL
  useEffect(() => {
    const handlePaste = (e: any) => {
      const pastedData = e.clipboardData.getData("text");
      if (!pastedData.match(/^https?:\/\/[^\s/$.?#].[^\s]*$/i)) {
        toast.error("URL not found");
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, []);

  const handleEdit = () => setIsEditing(!isEditing);

  const handleSave: any = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      if (!user?.id) {
        throw new Error("User not found");
      }

      if (path === "/quicklinks/dashboard" && selectedParentDir.id === "") {
        throw new Error("Please select a directory to save the link!");
      }

      const link = copiedURL;

      if (!link) {
        toast.error("No URL in your clipboard. Please copy and paste a URL.");
        return;
      }

      setFetchingMetadata(true);
      const metadata = await QuicklinksSdk.getLinkMetaData(link);
      setFetchingMetadata(false);

      const newLinkData = {
        title: metadata.title,
        description: metadata.description,
        logo: metadata.logo,
        image: metadata.image,
        linkType: metadata.linkType,
        url: metadata.url,
        clickCount: 0,
        directoryId: activeDirectoryId,
        rootParentDirId: selectedParentDir.id || null,
        authorId: user.id,
      };

      const response = QuicklinksSdk.createData(
        "/api/quicklinks/link",
        newLinkData
      );

      toast.promise(response, {
        loading: "Loading...",
        success: (data: any) => {
          dispatch(addNewQuicklink(data.data.link));
          setIsEditing(false); // Reset the editing state
          return (
            <div className="flex flex-col gap-2">
              <span className="font-bold">Quicklink added!</span>
              <span className="text-sm">{data.data.link.title}</span>
            </div>
          );
        },
        error: (error: any) => `${(error as Error).message}`,
      });
    } catch (error: any) {
      setFetchingMetadata(false);
      toast.error(`${(error as Error).message}`);
    } finally {
      handleClose();
    }
  };

  const getDirectoryPath = () => {
    const pathArray = path?.split("/");
    return pathArray?.filter((item) => item !== "quicklinks")?.join("/");
  };

  return (
    <>
      <Toaster duration={3000} position="bottom-left" richColors closeButton />
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="clipboard-url-modal-title"
        aria-describedby="clipboard-url-modal-description"
      >
        <Box
          sx={modalStyle}
          className="relative max-w-lg mx-auto p-6 bg-white rounded-lg shadow-lg"
        >
          <span className="absolute top-1 right-1 ">
            <IconButton
              aria-label="close"
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-800"
            >
              <CloseIcon />
            </IconButton>
          </span>
          <div className="mb-6">
            <h2
              id="clipboard-url-modal-title"
              className="text-2xl font-bold text-center mb-4 text-gray-800"
            >
              Create New Quicklink
            </h2>
            <p
              id="clipboard-url-modal-description"
              className="text-gray-600 text-center"
            >
              We have detected a copied link.
              {path !== "/quicklinks/dashboard" ||
              selectedParentDir.id !== "" ? (
                <>
                  Wanna save it to{" "}
                  <code className="bg-neutral-100 text-gray-500 p-1 rounded-md">
                    {getDirectoryPath()}
                  </code>
                  ?
                </>
              ) : (
                <>Please select a directory to save the link.</>
              )}
            </p>
          </div>
          <TextField
            fullWidth
            value={copiedURL || ""}
            onChange={(e) => setCopiedURL(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LinkIcon className="text-gray-500" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {isEditing ? (
                    <IconButton aria-label="save" onClick={handleEdit}>
                      <Save className="text-gray-500" />
                    </IconButton>
                  ) : (
                    <IconButton aria-label="edit" onClick={handleEdit}>
                      <EditIcon className="text-gray-500" />
                    </IconButton>
                  )}
                </InputAdornment>
              ),
              disabled: !isEditing, // Disable input when not in editing mode
            }}
            variant="outlined"
            placeholder="URL will appear here"
            className="mt-4"
          />
          <button
            type="submit"
            className="text-sm bg-black text-white border border-neutral-800 px-6 py-2 rounded-md w-full mt-4 transition hover:bg-gray-800 flex justify-center items-center"
            onClick={handleSave}
          >
            {fetchingMetadata ? (
              <div className="flex justify-center items-center">
                <CircularProgress size={20} className="text-white" />
                <span className="ml-2">Processing...</span>
              </div>
            ) : (
              <>Save</>
            )}
          </button>
        </Box>
      </Modal>
    </>
  );
};

export default ClipboardURLModal;
