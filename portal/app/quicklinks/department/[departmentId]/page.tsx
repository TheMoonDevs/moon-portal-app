import { DepartmentLinks } from "@/components/screens/Quicklinks/screens/Department/DepartmentQuicklinks";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { notFound } from "next/navigation";

async function slugToIdConversion(slug: string) {
  try {
    const response = await QuicklinksSdk.getData(
      `${APP_BASE_URL}/api/quicklinks/parent-directory?slug=${slug}`
    );
    return response.data.parentDirs[0].id;
  } catch (error) {
    console.log(error);
    notFound();
  }
}

const Departments = async ({
  params,
}: {
  params: { departmentId: string };
}) => {
  const departmentSlug = params.departmentId;
  const rootParentDirId = await slugToIdConversion(departmentSlug);
  return (
    <DepartmentLinks
      rootParentDirId={rootParentDirId}
      // departmentSlug={departmentSlug}
    />
  );
};

export default Departments;
