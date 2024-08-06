"use client";

import store, { useAppSelector } from "@/utils/redux/store";
import { useQuickLinkDirs } from "../../hooks/useQuickLinksDirs";
import { SubDirectoryLinks } from "../ParentDirectory/SubDirectoryLinks";
import { useRef } from "react";
import {
  setActiveDirectoryId,
  setIsQLSidebarOpen,
} from "@/utils/redux/quicklinks/quicklinks.slice";
import QuicklinkHeaderWrapper from "../../global/QuicklinkHeaderWrapper";
import { Menu } from "@mui/icons-material";
import { useDispatch } from "react-redux";

// import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
// import { useEffect } from "react";
// import LinkList from "../../LinkList/LinkList";
// import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
// import { setAllQuicklinks } from "@/utils/redux/quicklinks/quicklinks.slice";
// import useAsyncState from "@/utils/hooks/useAsyncState";
// import { LinkFiltersHeader } from "../../LinkList/LinkFiltersHeader";
// import { useSearchParams } from "next/navigation";
// import { useQuickLinkDirs } from "../../hooks/useQuickLinksDirs";

// export const DepartmentLinksByDirId = ({
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

export const DepartmentLinksByDirId = ({
  directoryId,
}: {
  directoryId: string;
}) => {
  const initialize = useRef(false);

  if (!initialize.current) {
    store.dispatch(setActiveDirectoryId(directoryId));
    initialize.current = true;
  }
  const { activeDirectoryId } = useAppSelector((state) => state.quicklinks);
  const { rootParentDirectory } = useQuickLinkDirs(activeDirectoryId);
  const dispatch = useDispatch();
  const { isQLSideBarOpen } = useAppSelector((state) => state.quicklinks);
  return (
    <div>
      <QuicklinkHeaderWrapper>
        <div className="text-3xl font-bold flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex gap-3 items-center">
            <button
              className="rounded-lg md:hidden border-[1px] flex p-2"
              onClick={() => {
                console.log("yoink");
                dispatch(setIsQLSidebarOpen(!isQLSideBarOpen));
              }}
            >
              <Menu />
            </button>
            <span className="material-symbols-outlined border border-neutral-200 rounded-full p-2">
              groups
            </span>
          </div>
          <span>{rootParentDirectory?.title}</span>
        </div>
      </QuicklinkHeaderWrapper>
      <SubDirectoryLinks />
    </div>
  );
};
