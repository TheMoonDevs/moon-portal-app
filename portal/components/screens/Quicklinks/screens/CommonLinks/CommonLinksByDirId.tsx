"use client";

import store, { useAppSelector } from "@/utils/redux/store";
import { SubDirectoryLinks } from "../ParentDirectory/SubDirectoryLinks";
import { useQuickLinkDirs } from "../../hooks/useQuickLinksDirs";
import { setActiveDirectoryId } from "@/utils/redux/quicklinks/quicklinks.slice";
import { useRef } from "react";
import QuicklinkHeaderWrapper from "../../global/QuicklinkHeaderWrapper";

// import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
// import { useEffect } from "react";
// import LinkList from "../../LinkList/LinkList";
// import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
// import { setAllQuicklinks } from "@/utils/redux/quicklinks/quicklinks.slice";
// import useAsyncState from "@/utils/hooks/useAsyncState";
// import { LinkFiltersHeader } from "../../LinkList/LinkFiltersHeader";
// import { useSearchParams } from "next/navigation";
// import { useQuickLinkDirs } from "../../hooks/useQuickLinksDirs";

// export const CommonLinksByDirId = ({
//   directorySlug,
//   departmentSlug,
// }: {
//   directorySlug: string;
//   departmentSlug: string;
// }) => {
//   const dispatch = useAppDispatch();
//   const params = useSearchParams();
//   const directoryId = params?.get("id");
//   const { thisDirectory, parentDirecotry } = useQuickLinkDirs(directoryId);
//   const { allQuicklinks } = useAppSelector((state) => state.quicklinks);
//   const { loading, setLoading, error, setError } = useAsyncState();
//   useEffect(() => {
//     const getData = async () => {
//       setLoading(true);

//       try {
//         console.log("sent", directoryId);
//         const allQuicklinks = await QuicklinksSdk.getData(
//           `/api/quicklinks/link?directoryId=${directoryId}`
//         );
//         console.log("received", allQuicklinks);
//         dispatch(setAllQuicklinks(allQuicklinks.data.links));

//         setLoading(false);
//       } catch (error) {
//         console.log(error);
//       }
//     };

//     getData();
//   }, [directoryId, dispatch, setLoading]);
//   return (
//     <div className="flex flex-col w-full">
//       <LinkFiltersHeader title={thisDirectory?.title} />
//       <LinkList allQuicklinks={allQuicklinks} isLoading={loading} />
//     </div>
//   );
// };

export const CommonLinksByDirId = ({
  directoryId,
}: {
  directoryId?: string;
}) => {
  const { activeDirectoryId } = useAppSelector((state) => state.quicklinks);
  const { rootParentDirectory } = useQuickLinkDirs(activeDirectoryId);
  const initialize = useRef(false);

  if (!initialize.current) {
    store.dispatch(setActiveDirectoryId(directoryId));
    initialize.current = true;
  }
  return (
    <div>
      <QuicklinkHeaderWrapper>
        <h1 className="text-3xl font-bold flex items-center gap-4">
          <span className="material-symbols-outlined border border-neutral-200 rounded-full p-2">
            stack
          </span>{" "}
          <span>{rootParentDirectory?.title}</span>
        </h1>
      </QuicklinkHeaderWrapper>
      <SubDirectoryLinks />
    </div>
  );
};
