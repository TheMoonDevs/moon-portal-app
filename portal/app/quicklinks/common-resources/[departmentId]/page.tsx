import { CommonQuicklinks } from "@/components/screens/Quicklinks/screens/CommonLinks/CommonQuicklinks";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";

async function slugToIdConversion(slug: string) {
  try {
    const response = await QuicklinksSdk.getData(
      `${APP_BASE_URL}/api/quicklinks/parent-directory?slug=${slug}`
    );
    return response.data.parentDirs[0].id;
  } catch (error) {
    console.log(error);
  }
}

const CommonLinks = async ({
  params,
}: {
  params: { departmentId: string };
}) => {
  const departmentSlug = params.departmentId;
  const rootParentDirId = await slugToIdConversion(departmentSlug);
  return <CommonQuicklinks rootParentDirId={rootParentDirId} />;
};

export default CommonLinks;
