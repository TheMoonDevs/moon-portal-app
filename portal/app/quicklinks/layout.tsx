import { QuicklinksLayout } from "@/components/screens/Quicklinks/global/QuicklinksLayout";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { ParentDirectory, Directory } from "@prisma/client";

const getDirectoryAndDepartment = async () => {
  try {
    const ArrayOfPromises = [
      QuicklinksSdk.getData(`${APP_BASE_URL}/api/quicklinks/department`),
      QuicklinksSdk.getData(`${APP_BASE_URL}/api/quicklinks/directory`),
    ];
    const responses = await Promise.all(ArrayOfPromises);
    const [departmentRes, directoryRes] = responses;
    const departments: ParentDirectory[] = departmentRes.data.departments;
    const directories: Directory[] = directoryRes.data.directoryList;

    return { departments, directories };
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
  let response = await getDirectoryAndDepartment();

  if (!response) {
    response = {
      departments: [],
      directories: [],
    };
  }

  return <QuicklinksLayout response={response}>{children}</QuicklinksLayout>;
}
