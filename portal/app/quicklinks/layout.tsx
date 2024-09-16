import { QuicklinksLayout } from "@/components/screens/Quicklinks/global/QuicklinksLayout";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { DirectoryList } from "@prisma/client";

const getParentDirsAndSubDirs = async () => {
  try {
    const {
      data,
    }: {
      data: {
        directoryList: DirectoryList[];
      };
    } = await QuicklinksSdk.getData(
      `${APP_BASE_URL}/api/quicklinks/directory-list`
    );

    const parentDirs: DirectoryList[] = data.directoryList.filter(
      (dir) => dir.parentDirId === null
    );
    const directories: DirectoryList[] = data.directoryList.filter(
      (dir) => dir.parentDirId !== null
    );

    return { parentDirs, directories };

    // const ArrayOfPromises = [
    //   QuicklinksSdk.getData(`${APP_BASE_URL}/api/quicklinks/parent-directory`),
    //   QuicklinksSdk.getData(`${APP_BASE_URL}/api/quicklinks/directory`),
    // ];
    // const responses = await Promise.all(ArrayOfPromises);
    // const [departmentRes, directoryRes] = responses;
    // const parentDirs: ParentDirectory[] = departmentRes.data.parentDirs;
    // const directories: Directory[] = directoryRes.data.directoryList;
    // return { parentDirs, directories };
  } catch (error) {
    console.log(error);
  }
};

export const revalidate = 0;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  let response = await getParentDirsAndSubDirs();

  if (!response) {
    response = {
      parentDirs: [],
      directories: [],
    };
  }

  return <QuicklinksLayout response={response}>{children}</QuicklinksLayout>;
}
