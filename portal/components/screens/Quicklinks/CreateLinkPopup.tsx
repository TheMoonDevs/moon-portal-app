import type { DirectoryList } from '@db/client';
import { ROOTTYPE } from '@db/client';
import { Popover, Slide, Tooltip } from '@mui/material';
import { usePathname } from 'next/navigation';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { toast, Toaster } from 'sonner';

import useClipboardURLDetection from '@/utils/hooks/useClipboardUrlDetection';
import { useUser } from '@/utils/hooks/useUser';
import { addNewQuicklink } from '@/utils/redux/quicklinks/slices/quicklinks.links.slice';
import { setIsCreateLinkModalOpen } from '@/utils/redux/quicklinks/slices/quicklinks.ui.slice';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import { QuicklinksSdk } from '@/utils/services/QuicklinksSdk';

export const excludedPaths = [
  '/quicklinks/dashboard',
  '/quicklinks/user/user-list',
  '/quicklinks/user/links/top-used',
  '/quicklinks/user/folders/recently-used',
  '/quicklinks/user/folders/top-used',
  '/quicklinks/explore/trending',
  '/quicklinks/archive',
];

export const CreateLinkPopup = () => {
  const { parentDirs, directories, activeDirectoryId } = useAppSelector(
    (state) => state.quicklinksDirectory,
  );
  const { isCreateLinkModalOpen } = useAppSelector(
    (state) => state.quicklinksUi,
  );
  const dispatch = useAppDispatch();
  const [anchorEl, setAnchorEl] = useState<HTMLSpanElement | null>(null);
  const path = usePathname();
  const { user } = useUser();

  const [selectedParentDir, setSelectedParentDir] = useState({
    id: '',
    title: '',
  });

  const [fetchingMetadata, setFetchingMetadata] = useState(false);

  const open = Boolean(anchorEl);

  const { copiedURL, setCopiedURL } = useClipboardURLDetection();
  const getDirectoryPath = () => {
    const pathArray = path?.split('/');
    return pathArray?.filter((item) => item !== 'quicklinks')?.join('/');
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

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      if (!user?.id) {
        throw new Error('User not found');
      }

      if (path === '/quicklinks/dashboard' && selectedParentDir.id === '') {
        throw new Error('Please select a directory to save the link!');
      }

      const formData = new FormData(e.currentTarget);
      const link = formData.get('link') as string;
      setFetchingMetadata(true);
      const metadata = await QuicklinksSdk.getLinkMetaData(link);
      setFetchingMetadata(false);
      const getLinkTitle = (link: string) => {
        if (metadata.title) return metadata.title;
        const url = new URL(link);
        const splittedUrl = url.hostname.split('.');
        const domain = splittedUrl.length > 2 ? splittedUrl[1] : splittedUrl[0];

        return domain.charAt(0).toUpperCase() + domain.slice(1);
      };
      // store the metadata in db
      const newLinkData = {
        title: getLinkTitle(link) || 'Untitled',
        description: metadata.description || 'No description',
        logo: metadata.logo,
        image: metadata.image,
        linkType: metadata.linkType,
        url: link || metadata.url,
        clickCount: 0,
        directoryId: activeDirectoryId,
        rootParentDirId:
          rootParentDirId ||
          (selectedParentDir.id !== '' && selectedParentDir.id) ||
          null,
        authorId: user?.id,
      };

      //console.log(newLinkData, "newLinkData", metadata);
      //return;
      const response = QuicklinksSdk.createData(
        '/api/quicklinks/link',
        newLinkData,
      );

      toast.promise(response, {
        loading: 'Loading...',
        success: (data: any) => {
          dispatch(addNewQuicklink(data.data.link));
          dispatch(setIsCreateLinkModalOpen(false));

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
    } catch (error: any) {
      setFetchingMetadata(false);
      toast.error(`${(error as Error).message}`);
    }
  };

  const handleParentDirSelection = (parentDir: DirectoryList) => {
    setAnchorEl(null);
    if (parentDir.id === selectedParentDir.id) {
      setSelectedParentDir({ id: '', title: '' });
      return;
    }
    setSelectedParentDir({
      id: parentDir.id,
      title: parentDir.title,
    });
  };

  return (
    <>
      {isCreateLinkModalOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50"></div>
      )}
      <Slide
        direction="up"
        in={
          isCreateLinkModalOpen
          // uncomment below line to revert back to old UI
          // || Boolean(copiedURL)
        }
        mountOnEnter
        unmountOnExit
      >
        <div
          className={`fixed bottom-8 right-8 z-50 w-fit bg-white p-6 shadow-md max-sm:inset-x-4`}
        >
          <span
            onClick={() => {
              dispatch(setIsCreateLinkModalOpen(false));
              setCopiedURL(null);
            }}
            className="material-icons-outlined absolute -right-4 -top-4 cursor-pointer rounded-full border border-gray-100 bg-[#fafafa] p-1 text-gray-500 hover:bg-gray-100"
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
            <label htmlFor="link" className="mb-3 text-xl">
              <span className="block">Create New Quicklink</span>
              <span className="text-sm text-gray-500">
                We have detected a copied link.{' '}
                {!excludedPaths.includes(path || '') ||
                selectedParentDir.id !== '' ? (
                  <>
                    Wanna save it to <br />
                    <code className="rounded-md bg-neutral-100 p-1 text-gray-500">
                      {getDirectoryPath()}
                    </code>
                    ?
                  </>
                ) : (
                  <>Please select a directory to save the link.</>
                )}
              </span>
            </label>
            <div className="flex items-center gap-4">
              <div className="relative flex items-center rounded-md bg-neutral-100">
                {(excludedPaths.includes(path || '') ||
                  selectedParentDir.id !== '') && (
                  <Tooltip title="Select Department">
                    <div
                      className="flex cursor-pointer items-center"
                      onClick={(e) => setAnchorEl(e.currentTarget)}
                    >
                      <span className="material-icons-outlined p-2 text-gray-500">
                        groups
                      </span>
                      <span className="material-icons-outlined p-2 text-gray-500">
                        {open ? 'arrow_drop_up' : 'arrow_drop_down'}
                      </span>
                    </div>
                  </Tooltip>
                )}
                <Popover
                  open={open}
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
                    paper: 'bg-white mb-4 py-2 rounded-md w-[200px] !shadow-md',
                  }}
                >
                  <ul className="mb-2 flex flex-col gap-2">
                    {parentDirs.map((parentDir) => (
                      <div
                        onClick={(e) => handleParentDirSelection(parentDir)}
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
              </div>
              <input
                className="w-full border-b bg-white transition-colors duration-500 placeholder:text-sm focus:border-b-gray-600 focus:outline-none"
                type="url"
                name="link"
                id="link"
                required
                autoFocus
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
              className="w-full rounded-md border border-neutral-800 bg-black px-6 py-2 text-sm text-white disabled:cursor-not-allowed"
              disabled={fetchingMetadata}
            >
              {fetchingMetadata ? (
                <span className="ml-2">Processing...</span>
              ) : (
                <>Save</>
              )}
            </button>
            {/* </div> */}
          </form>
        </div>
      </Slide>
    </>
  );
};
