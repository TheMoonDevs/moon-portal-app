"use client";

import useAsyncState from "@/utils/hooks/useAsyncState";
import { useUser } from "@/utils/hooks/useUser";
import { useAppSelector } from "@/utils/redux/store";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { USERDIRECTORYTYPE } from "@prisma/client";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { ViewButtonGroup } from "../../../LinkList/ViewButtonGroup";

import { setTopUsedDirectoryList } from "@/utils/redux/quicklinks/slices/quicklinks.directory.slice";
import TopLinksFromDirectory from "./TopLinksFromDirectory";
import { Box, CircularProgress, Drawer, IconButton } from "@mui/material";
import QuicklinkSearchBar from "../../../global/QuicklinkSearchBar";
import FolderSection from "../../Dashboard/FolderSection";

const UserTopUsedLinks = ({ withTitle }: { withTitle?: boolean }) => {
  const dispatch = useDispatch();
  const { user } = useUser();
  const { loading, setLoading, error, setError } = useAsyncState();
  const { topUsedDirectoryList } = useAppSelector(
    (state) => state.quicklinksDirectory
  );
  const [isFolderSectionOpen, setIsFolderSectionOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const getTopUsedDirectories = async () => {
      setLoading(true);
      try {
        const userTopUsedDirectories = await QuicklinksSdk.getData(
          `/api/quicklinks/directory-list/user-directory?userId=${user.id}&directoryType=${USERDIRECTORYTYPE.OTHER}`
        );
        const sortedByClickCount = userTopUsedDirectories.sort(
          (a: any, b: any) => {
            return b.clickCount - a.clickCount;
          }
        );

        dispatch(
          setTopUsedDirectoryList(
            sortedByClickCount.map((dir: any) => dir.directoryData)
          )
        );
        setLoading(false);
        // console.log(sortedByClickCount.map((dir: any) => dir.directoryData));
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    getTopUsedDirectories();
  }, [user, dispatch]);
  
  return (
    <>
      <div className="hidden items-center justify-between gap-2 px-1 py-2 max-sm:flex">
        <QuicklinkSearchBar />
        <IconButton
          onClick={() => {
            setIsFolderSectionOpen(!isFolderSectionOpen);
          }}
        >
          <span className="material-symbols-outlined">folder</span>
        </IconButton>
      </div>
      <div>
        <div className="flex items-center justify-between">
          {withTitle && (
            <h1 className="flex items-center gap-4 py-[10px] text-xl font-bold max-sm:text-lg">
              <span className="material-symbols-outlined rounded-full border border-neutral-200 p-2">
                link
              </span>{' '}
              <span className="flex items-center gap-4 text-2xl font-bold">
                Your Top Used Links
              </span>
            </h1>
          )}
          <ViewButtonGroup />
        </div>
        {[...topUsedDirectoryList].map((topDirectory, ind) => {
          return (
            <div className="space-y-5" key={`${topDirectory.id}${ind}12312`}>
              <TopLinksFromDirectory
                key={topDirectory.id}
                directory={topDirectory}
              />
            </div>
          );
        })}
        {loading && (
          <div className="flex w-full items-center justify-center">
            <CircularProgress />
          </div>
        )}
      </div>
      <FoldersDrawer
        foldersOpen={isFolderSectionOpen}
        handleClose={() => {
          setIsFolderSectionOpen(false);
        }}
      />
    </>
  );
};

export default UserTopUsedLinks;

const FoldersDrawer = ({
  foldersOpen,
  handleClose,
}: {
  foldersOpen: boolean;
  handleClose: () => void;
}) => {
  return (
    <ReusableFolderDrawer open={foldersOpen} handleClose={handleClose}>
      <div className="p-2">
        <div className="">
          <FolderSection />
        </div>
      </div>
    </ReusableFolderDrawer>
  );
};

export const ReusableFolderDrawer = ({
  open,
  handleClose,
  children,
}: {
  open: boolean;
  handleClose: () => void;
  children: React.ReactNode;
}) => {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      sx={{ '& .MuiDrawer-paper': { height: '100vh' } }}
    >
      <Box
        sx={{
          width: '100%',
          overflowX: 'hidden',
          overflowY: 'scroll',
          px: 1,
        }}
        role="presentation"
      >
        <IconButton onClick={handleClose} className="!pb-4">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '20px' }}
          >
            arrow_forward_ios
          </span>
        </IconButton>
        {children}
      </Box>
    </Drawer>
  );
};

// const UserTopUsedLinks1 = ({ withTitle }: { withTitle?: boolean }) => {
//   const dispatch = useDispatch();
//   const { user } = useUser();
//   const { loading, setLoading, error, setError } = useAsyncState();
//   const { topUsedLinksList } = useAppSelector((state) => state.quicklinksLinks);
//   const { topUsedDirectoryList } = useAppSelector(
//     (state) => state.quicklinksDirectory
//   );

//   useEffect(() => {
//     if (!user?.id) {
//       return;
//     }
//     const getTopUsedLinks = async () => {
//       if (topUsedLinksList.length > 0) dispatch(setTopUsedLinksList([]));

//       setLoading(true);
//       try {
//         const topUsedLinksData: UserLink[] = await QuicklinksSdk.getData(
//           `/api/quicklinks/link/user-link?userId=${user.id}&linkType=${USERLINKTYPE.TOPUSED}`
//         );

//         // console.log("topused", topUsedLinksData);
//         dispatch(
//           setTopUsedLinksList(
//             topUsedLinksData.map((link) => (link as any).linkData)
//           )
//         );
//         setLoading(false);
//       } catch (e) {
//         setLoading(false);
//         console.log(e);
//         return null;
//       }
//     };

//     getTopUsedLinks();
//   }, [dispatch, user?.id, setLoading]);
//   return (
//     <div>
//       <div className=" flex justify-between items-center">
//         {withTitle && (
//           <h1 className="py-[10px] font-bold text-xl flex gap-4 items-center">
//             <span className="material-symbols-outlined border border-neutral-200 rounded-full p-2">
//               link
//             </span>{" "}
//             <span className="text-2xl font-bold flex items-center gap-4">
//               Your Top Used Links
//             </span>
//           </h1>
//         )}
//         <ViewButtonGroup />
//       </div>
//       <LinkList
//         allQuicklinks={topUsedLinksList}
//         // withView="thumbnail"
//         isLoading={loading}
//       />
//     </div>
//   );
// };
