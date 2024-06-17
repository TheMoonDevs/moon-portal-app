import { DepartmentLinksByDirId } from "@/components/screens/Quicklinks/screens/Department/DepartmentLinksByDirId";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { Directory } from "@prisma/client";
async function slugToIdConversion(slug: string) {
  try {
    const slugString = slug.substring(0, slug.lastIndexOf("-"));
    const response = await QuicklinksSdk.getData(
      `${APP_BASE_URL}/api/quicklinks/directory?slug=${slugString}`
    );

    return response.data.directoryList.find((directory: Directory) => {
      return (
        directory.slug +
          "-" +
          new Date(directory.timestamp).getTime().toString().slice(-5) ===
        slug
      );
    })?.id;
  } catch (error) {
    console.log(error);
  }
}
export default async function Home({
  params,
}: {
  params: { directoryId: string };
}) {
  const directoryId = await slugToIdConversion(params.directoryId);

  return (
    <DepartmentLinksByDirId
      directoryId={directoryId}
      // directorySlug={directorySlug}
      // departmentSlug={departmentSlug}
    />
  );
}
