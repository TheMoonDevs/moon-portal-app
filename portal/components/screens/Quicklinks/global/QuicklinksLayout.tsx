'use client';
import { useAppSelector } from '@/utils/redux/store';
import { QuicklinksToast } from '../elements/QuicklinksToast';

import { useStore } from 'react-redux';
import { useRef } from 'react';
import { DirectoryList } from '@prisma/client';
import { CreateLinkPopup } from '../CreateLinkPopup';
import CreateLinkOnPaste from '../CreateLinkOnPaste';
import QuicklinkSidebar from './QuicklinksSidebar/QuicklinkSidebar';
import QuicklinksGlobalHeader from './QuicklinksGlobalHeader';
import { PopoverFolderEdit } from '../elements/Popovers';
import { MoveModal } from '../elements/modals/Movemodal';
import RenameModal from '../elements/modals/RenameModal';
import CreateDirectoryModal from '../elements/modals/CreateModal';
import {
  setDirectoryList,
  setParentDirsList,
  setRootDirList,
} from '@/utils/redux/quicklinks/slices/quicklinks.directory.slice';
import clsx from 'clsx';

// BAD PATTERN OF SLUG IS USED, WE CANT CHANGE IT BECAUSE IT IS USED IN THE MULTIPLE COMPONENTS
const ROOT_DIRECTORIES: Omit<DirectoryList, 'timestamp'>[] = [
  {
    id: 'root-my-dashboard',
    title: 'My Dashboard',
    parentDirId: null,
    slug: '/dashboard',
    logo: 'dashboard',
    position: 10,
    isArchive: false,
    clickCount: 0,
    tabType: null,
    type: null,
  },
  {
    id: 'COMMON_RESOURCES',
    title: 'Team Resources',
    parentDirId: null,
    slug: '/common-resources',
    logo: 'stack',
    position: 20,
    isArchive: false,
    clickCount: 0,
    tabType: null,
    type: null,
  },
  {
    id: 'DEPARTMENT',
    title: 'Departments',
    parentDirId: null,
    slug: '/department',
    logo: 'groups',
    position: 20,
    isArchive: false,
    clickCount: 0,
    tabType: null,
    type: null,
  },
];

export const QuicklinksLayout = ({
  children,
  response,
}: {
  children: React.ReactNode;
  response: {
    parentDirs: DirectoryList[];
    directories: DirectoryList[];
  };
}) => {
  const store = useStore();
  const initialize = useRef(false);

  if (!initialize.current) {
    store.dispatch(setParentDirsList(response.parentDirs));
    store.dispatch(setDirectoryList(response.directories));
    store.dispatch(setRootDirList(ROOT_DIRECTORIES));
    initialize.current = true;
  }
  // const { toast } = useAppSelector((state) => state.quicklinks);
  const isCollapsed = useAppSelector((state) => state.quicklinksUi.isCollapsed);

  return (
    <>
      <QuicklinksGlobalHeader />
      <main className="flex min-h-screen">
        <QuicklinkSidebar />
        <div
          className={clsx(
            'transition-width relative ml-auto px-6 duration-300 max-sm:w-full max-sm:px-2',
            isCollapsed ? 'w-[calc(100%-75px)]' : 'w-[calc(100%-256px)]',
          )}
        >
          <div className="h-[76px]"></div>
          <div className="relative mb-20 h-screen w-full">{children}</div>

          {/* <QuicklinksToast
            severity={toast.toastSev}
            message={toast.toastMsg}
            position={{
              vertical: "bottom",
              horizontal: "left",
            }}
          /> */}
        </div>
        <PopoverFolderEdit />
        <CreateDirectoryModal />
        <CreateLinkPopup />
        <CreateLinkOnPaste /> {/* Remove this to revert back to the old UI */}
        <MoveModal />
        <RenameModal />
      </main>
    </>
  );
};
