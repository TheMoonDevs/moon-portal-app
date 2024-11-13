"use client";

import useAsyncState from "@/utils/hooks/useAsyncState";
import { useUser } from "@/utils/hooks/useUser";
import { useAppSelector } from "@/utils/redux/store";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { USERDIRECTORYTYPE } from "@prisma/client";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { ViewButtonGroup } from "../../../LinkList/ViewButtonGroup";

import { setTopUsedDirectoryList } from "@/utils/redux/quicklinks/slices/quicklinks.directory.slice";
import TopLinksFromDirectory from "./TopLinksFromDirectory";
import { CircularProgress } from "@mui/material";

const UserTopUsedLinks = ({ withTitle }: { withTitle?: boolean }) => {
  const dispatch = useDispatch();
  const { user } = useUser();
  const { loading, setLoading, error, setError } = useAsyncState();
  const { topUsedDirectoryList } = useAppSelector(
    (state) => state.quicklinksDirectory
  );

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
    <div>
      <div className="flex justify-between items-center">
        {withTitle && (
          <h1 className="py-[10px] font-bold text-xl flex gap-4 items-center">
            <span className="material-symbols-outlined border border-neutral-200 rounded-full p-2">
              link
            </span>{" "}
            <span className="text-2xl font-bold flex items-center gap-4">
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
        <div className="w-full items-center justify-center flex">
          <CircularProgress />
        </div>
      )}
    </div>
  );
};

export default UserTopUsedLinks;

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
