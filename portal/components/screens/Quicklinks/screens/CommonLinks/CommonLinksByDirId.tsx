"use client";

import store, { useAppSelector } from "@/utils/redux/store";
import { SubDirectoryLinks } from "../ParentDirectory/SubDirectoryLinks";
import { useQuickLinkDirs } from "../../hooks/useQuickLinksDirs";
import { useRef } from "react";
import QuicklinkHeaderWrapper from "../../global/QuicklinkHeaderWrapper";
import { useQuickLinkDirectory } from "../../hooks/useQuickLinkDirectory";
import ListOfDirectories from "../../DirectoryList";
import { usePathname } from "next/navigation";
import { setActiveDirectoryId } from "@/utils/redux/quicklinks/slices/quicklinks.directory.slice";

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
  const initialize = useRef(false);
  const pathname = usePathname();
  const pathArray = pathname?.split("/");
  const basePath = pathArray?.slice(0, -1).join("/");
  const { allQuicklinks } = useAppSelector((state) => state.quicklinksLinks);
  const { activeDirectoryId, directories } = useQuickLinkDirectory();
  const { thisDirectory } = useQuickLinkDirs(activeDirectoryId);
  const filteredDirectories = directories.filter(
    (directory) => directory.parentDirId === activeDirectoryId
  );

  if (!initialize.current) {
    store.dispatch(setActiveDirectoryId(directoryId));
    initialize.current = true;
  }
  return (
    <div>
      <QuicklinkHeaderWrapper
        title={thisDirectory?.title || ""}
        icon="group"
        withBreadcrumb={{
          rootType: "COMMON_RESOURCES",
        }}
      />
      {allQuicklinks.length === 0 && filteredDirectories.length === 0 ? (
        <div className="w-full flex items-center justify-center h-full">
          Start by adding a folder or link
        </div>
      ) : (
        <div className="flex gap-10">
          <div className="mt-4 flex justify-stretch gap-6 w-[70%]">
            <div className="w-full">
              <SubDirectoryLinks />
            </div>
          </div>
          <div className="my-8 w-[30%]">
            <h1 className="text-xl font-bold">Folders</h1>
            <ListOfDirectories
              view="listView"
              pathname={basePath}
              directories={filteredDirectories}
            />
          </div>
        </div>
      )}
    </div>
  );
};
