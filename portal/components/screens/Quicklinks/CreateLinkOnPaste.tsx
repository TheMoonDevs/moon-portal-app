import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import {
  Modal,
  Box,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Tooltip,
  Popover,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Save,
} from '@mui/icons-material';
import useClipboardURLDetection from '@/utils/hooks/useClipboardUrlDetection';
import { toast, Toaster } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import { QuicklinksSdk } from '@/utils/services/QuicklinksSdk';
import { usePathname } from 'next/navigation';
import { useUser } from '@/utils/hooks/useUser';
import { DirectoryList, ROOTTYPE } from '@prisma/client';
import { isValidURL } from '@/utils/helpers/functions';
import { addNewQuicklink } from '@/utils/redux/quicklinks/slices/quicklinks.links.slice';
import { excludedPaths } from './CreateLinkPopup';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: '8px',
};

const CreateLinkOnPaste = () => {
  const { copiedURL, setCopiedURL } = useClipboardURLDetection();
  const [isEditing, setIsEditing] = useState(false);
  const dispatch = useAppDispatch();
  const [selectedParentDir, setSelectedParentDir] = useState<DirectoryList>({
    id: '',
    title: '',
  } as DirectoryList);
  const { parentDirs, directories, activeDirectoryId } = useAppSelector(
    (state) => state.quicklinksDirectory,
  );
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const path = usePathname();
  const { user } = useUser();
  const [anchorEl, setAnchorEl] = useState<HTMLSpanElement | null>(null);
  const openDropdown = Boolean(anchorEl);

  const handleClose = () => {
    setCopiedURL(null);
    setSelectedParentDir({
      id: '',
      title: '',
    } as DirectoryList);
    setIsEditing(false);
  };

  const handleEdit = () => setIsEditing(true);
  const handleEdited = () => {
    if (!copiedURL) return;
    if (isValidURL(copiedURL)) setIsEditing(false);
    else {
      toast.error('Given link is invalid');
    }
  };

  const rootParentDirId = useMemo(() => {
    const getDepartmentId = (directoryId: string | null): string => {
      let rootParentDirId = '';
      if (!directoryId) return rootParentDirId;
      const thisDirectory =
        parentDirs?.find((_dir) => _dir.id === directoryId) ||
        directories?.find((_dir) => _dir.id === directoryId);

      if (thisDirectory?.parentDirId && 'parentDirId' in thisDirectory) {
        return getDepartmentId(thisDirectory?.parentDirId);
      } else {
        rootParentDirId =
          thisDirectory?.tabType === ROOTTYPE.DEPARTMENT ||
          thisDirectory?.tabType === ROOTTYPE.COMMON_RESOURCES
            ? thisDirectory?.id
            : selectedParentDir.id;
        return rootParentDirId;
      }
    };
    return activeDirectoryId
      ? getDepartmentId(activeDirectoryId)
      : selectedParentDir.id;
  }, [activeDirectoryId, selectedParentDir, parentDirs, directories]);

  const handleSave: any = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (!user?.id) {
        throw new Error('User not found');
      }

      if (path === '/quicklinks/dashboard' && selectedParentDir.id === '') {
        throw new Error('Please select a directory to save the link!');
      }

      const link = copiedURL;

      if (!link) {
        toast.error('No URL in your clipboard. Please copy and paste a URL.');
        return;
      }

      setFetchingMetadata(true);
      const metadata = await QuicklinksSdk.getLinkMetaData(link);
      const getLinkTitle = (link: string) => {
        if (metadata.title) return metadata.title;
        const url = new URL(link);
        const splittedUrl = url.hostname.split('.');
        let domain = splittedUrl.length > 2 ? splittedUrl[1] : splittedUrl[0];

        return domain.charAt(0).toUpperCase() + domain.slice(1);
      };
      // console.log(metadata);
      setFetchingMetadata(false);
      const newLinkData = {
        title: getLinkTitle(link) || 'Untitled',
        description: metadata.description || 'No description',
        logo: metadata.logo,
        image: metadata.image,
        linkType: metadata.linkType,
        url: link || metadata.url,
        clickCount: 0,
        directoryId:
          selectedParentDir.id !== ''
            ? selectedParentDir.id
            : activeDirectoryId,
        rootParentDirId:
          selectedParentDir.id !== '' ? selectedParentDir.id : rootParentDirId,
        authorId: user?.id,
      };

      const response = QuicklinksSdk.createData(
        '/api/quicklinks/link',
        newLinkData,
      );

      toast.promise(response, {
        loading: 'Loading...',
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
      // console.log(error);
      setFetchingMetadata(false);
      toast.error(`${(error as Error).message}`);
    }
  };

  const handleParentDirSelection = (parentDir: DirectoryList) => {
    setAnchorEl(null);
    if (parentDir.id === selectedParentDir.id) {
      setSelectedParentDir({
        id: '',
        title: '',
      } as DirectoryList);
      return;
    }
    setSelectedParentDir(parentDir);
  };

  const getParentDirPath = (parentDir: DirectoryList | null) => {
    if (!parentDir) {
      const pathArray = path?.split('/');
      return pathArray?.filter((item) => item !== 'quicklinks')?.join('/');
    }
    const roottype: ROOTTYPE = parentDir.type as ROOTTYPE;
    if (!roottype) return;

    switch (roottype) {
      case ROOTTYPE.DEPARTMENT:
        return `department/${parentDir.slug}`;
      case ROOTTYPE.COMMON_RESOURCES:
        return `common-resources/${parentDir.slug}`;
    }
  };

  return (
    <>
      <Toaster duration={3000} position="bottom-left" richColors closeButton />
      <Modal
        open={copiedURL === null || copiedURL === '' ? false : true}
        onClose={handleClose}
        aria-labelledby="clipboard-url-modal-title"
        aria-describedby="clipboard-url-modal-description"
      >
        <Box
          sx={modalStyle}
          className="relative mx-auto max-w-lg rounded-lg bg-white p-6 shadow-lg sm:w-[36rem]"
        >
          <span className="absolute right-1 top-1">
            <IconButton
              aria-label="close"
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-800"
            >
              <CloseIcon />
            </IconButton>
          </span>
          <div className="mb-6">
            <span className="block">Create New Quicklink</span>
            <span className="text-sm text-gray-500">
              We have detected a copied link.{' '}
              {!excludedPaths.includes(path || '') ||
              selectedParentDir.id !== '' ? (
                <>
                  Wanna save it to <br />
                  <code className="rounded-md bg-neutral-100 p-1 text-gray-500">
                    {getParentDirPath(
                      selectedParentDir.id ? selectedParentDir : null,
                    )}
                  </code>
                  ?
                </>
              ) : (
                <>Please select a directory to save the link.</>
              )}
            </span>
          </div>
          <TextField
            fullWidth
            value={copiedURL || ''}
            onChange={(e) => setCopiedURL(e.target.value)}
            InputProps={{
              startAdornment: (excludedPaths.includes(path || '') ||
                selectedParentDir.id !== '') && (
                <InputAdornment position="start">
                  <Tooltip title="Select Department">
                    <div
                      className="flex cursor-pointer items-center"
                      onClick={(e) => setAnchorEl(e.currentTarget)}
                    >
                      <span className="material-icons-outlined p-2 text-gray-500">
                        groups
                      </span>
                      <span className="material-icons-outlined p-2 text-gray-500">
                        {openDropdown ? 'arrow_drop_up' : 'arrow_drop_down'}
                      </span>
                    </div>
                  </Tooltip>
                  <Popover
                    open={openDropdown}
                    anchorEl={anchorEl}
                    onClose={() => setAnchorEl(null)}
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'left',
                    }}
                    transformOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    closeAfterTransition
                    classes={{
                      paper:
                        'bg-white mb-4 py-2 rounded-md w-[200px] !shadow-md',
                    }}
                  >
                    <ul className="mb-2 flex flex-col gap-2">
                      {parentDirs.map((parentDir) => (
                        <div
                          onClick={(e) => {
                            handleParentDirSelection(parentDir);
                          }}
                          key={parentDir.id}
                          className="flex cursor-pointer items-center justify-between p-2 hover:bg-neutral-100"
                        >
                          <li className="text-sm text-gray-500">
                            {parentDir.title}
                          </li>
                          {selectedParentDir.id === parentDir.id && (
                            <span className="material-icons-outlined !text-sm text-green-500">
                              {' '}
                              adjust
                            </span>
                          )}
                        </div>
                      ))}
                    </ul>
                  </Popover>
                </InputAdornment>
              ),

              endAdornment: (
                <InputAdornment position="end">
                  {isEditing ? (
                    <IconButton aria-label="save" onClick={handleEdited}>
                      <CheckIcon className="text-gray-500" />
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
            className="mt-4 flex w-full items-center justify-center rounded-md border border-neutral-800 bg-black px-6 py-2 text-sm text-white transition hover:bg-gray-800 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={isEditing}
          >
            {fetchingMetadata ? (
              <div className="flex items-center justify-center">
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

export default CreateLinkOnPaste;
