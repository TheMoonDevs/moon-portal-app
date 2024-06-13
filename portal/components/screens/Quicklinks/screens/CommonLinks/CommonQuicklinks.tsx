"use client";
import store, { useAppSelector } from "@/utils/redux/store";
import { ParentDirectoryLinks } from "../ParentDirectory/ParentDirectoryLinks";
import { useQuickLinkDirs } from "../../hooks/useQuickLinksDirs";
import { useRef } from "react";
import { setActiveDirectoryId } from "@/utils/redux/quicklinks/quicklinks.slice";
import QuicklinkHeaderWrapper from "../../global/QuicklinkHeaderWrapper";
// import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
// import { useSearchParams } from "next/navigation";
// import { useEffect } from "react";
// import LinkList from "../../LinkList/LinkList";
// import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
// import {
//   setAllQuicklinks,
//   setTopUsedList,
// } from "@/utils/redux/quicklinks/quicklinks.slice";
// import TopUsedLink from "../Dashboard/TopUsedLink";
// import { Link } from "@prisma/client";
// import useAsyncState from "@/utils/hooks/useAsyncState";
// import { LinkFiltersHeader } from "../../LinkList/LinkFiltersHeader";
// import { useQuickLinkDirs } from "../../hooks/useQuickLinksDirs";

// export const CommonQuicklinks = ({
//   departmentSlug,
// }: {
//   departmentSlug: string;
// }) => {
//   const dispatch = useAppDispatch();
//   const params = useSearchParams();
//   const rootParentDirId = params?.get("id");
//   const { thisDirectory, parentDirecotry } = useQuickLinkDirs(rootParentDirId);

//   const { allQuicklinks, topUsedList } = useAppSelector(
//     (state) => state.quicklinks
//   );
//   const { loading, setLoading, error, setError } = useAsyncState();

//   //Fetch link by department Id
//   useEffect(() => {
//     const getData = async () => {
//       setLoading(true);
//       // try {
//       const reponse = await QuicklinksSdk.getData(
//         `/api/quicklinks/link?rootParentDirId=${rootParentDirId}`
//       );

//       let quicklinks: Link[] = reponse.data.links;
//       console.log(quicklinks);
//       dispatch(setAllQuicklinks(quicklinks));

//       const sortedQuicklinks = [...quicklinks]
//         .sort((a, b) => b.clickCount - a.clickCount)
//         .slice(0, 5);
//       dispatch(setTopUsedList(sortedQuicklinks));

//       setLoading(false);
//       // } catch (error) {
//       //   console.log(error);
//       // }
//     };
//     getData();
//   }, [rootParentDirId, dispatch, setLoading]);

//   return (
//     <div>
//       <TopUsedLink title={`Top Used in ${thisDirectory?.title}`}>
//         <LinkList
//           allQuicklinks={topUsedList}
//           withView="thumbnail"
//           isLoading={loading}
//         />
//       </TopUsedLink>
//       <div className="flex flex-col w-full">
//         <LinkFiltersHeader title={`View All in ${thisDirectory?.title}`} />
//         <LinkList allQuicklinks={allQuicklinks} isLoading={loading} />
//       </div>
//     </div>
//   );
// };

export const CommonQuicklinks = ({
  rootParentDirId,
}: {
  rootParentDirId: string;
}) => {
  const initialize = useRef(false);

  if (!initialize.current) {
    store.dispatch(setActiveDirectoryId(rootParentDirId));
    initialize.current = true;
  }
  const { activeDirectoryId } = useAppSelector((state) => state.quicklinks);
  const { thisDirectory } = useQuickLinkDirs(activeDirectoryId);
  return (
    <div>
      <QuicklinkHeaderWrapper>
        <h1 className="text-3xl font-bold flex items-center gap-4">
          <span className="material-symbols-outlined border border-neutral-200 rounded-full p-2">
            stack
          </span>{" "}
          <span>{thisDirectory?.title}</span>
        </h1>
      </QuicklinkHeaderWrapper>
      <ParentDirectoryLinks />
    </div>
  );
};
