import { CommonQuicklinks } from "@/components/screens/Quicklinks/screens/CommonLinks/CommonQuicklinks";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";

export async function slugToIdConversion({ slug }: { slug: string }) {
  const response = await QuicklinksSdk.getData(
    `${APP_BASE_URL}/api/quicklinks/parent-directory?slug=${slug}`
  );
  return response.data.parentDirs[0].id;
}

const CommonLinks = async ({
  params,
}: {
  params: { departmentId: string };
}) => {
  const departmentSlug = params.departmentId;
  const rootParentDirId = await slugToIdConversion({ slug: departmentSlug });
  return <CommonQuicklinks rootParentDirId={rootParentDirId} />;
};

export default CommonLinks;
