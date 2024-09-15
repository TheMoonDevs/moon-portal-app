import { CommonLinksByDirId } from "@/components/screens/Quicklinks/screens/CommonLinks/CommonLinksByDirId";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { Directory, DirectoryList, ROOTTYPE } from "@prisma/client";
import { notFound } from "next/navigation";

async function slugToIdConversion(slug: string) {
  try {
    const slugString = slug.substring(0, slug.lastIndexOf("-"));
    const response = await QuicklinksSdk.getData(
      `${APP_BASE_URL}/api/quicklinks/directory-list?slug=${slugString}&tabType=${ROOTTYPE.COMMON_RESOURCES}`
    );
    return response.data.directoryList.find((directory: DirectoryList) => {
      return (
        directory.slug +
          "-" +
          new Date(directory.timestamp as Date)
            .getTime()
            .toString()
            .slice(-5) ===
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
  if (!directoryId) return notFound();
  // untitled-78976
  return <CommonLinksByDirId directoryId={directoryId} />;
}
