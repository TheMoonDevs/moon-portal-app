import { CommonLinksByDirId } from "@/components/screens/Quicklinks/screens/CommonLinks/CommonLinksByDirId";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { Directory } from "@prisma/client";

export async function slugToIdConversion({ slug }: { slug: string }) {
  const slugString = slug.split("-")[0];
  console.log(slugString);
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
}
export default async function Home({
  params,
}: {
  params: { directoryId: string };
}) {
  const directoryId = await slugToIdConversion({ slug: params.directoryId });
  const directorySlug = params.directoryId;
  // untitled-78976
  return <CommonLinksByDirId directoryId={directoryId} />;
}
