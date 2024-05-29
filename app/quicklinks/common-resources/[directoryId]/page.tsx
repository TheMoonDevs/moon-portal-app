import { CommonQuicklinks } from "@/components/screens/Quicklinks/screens/CommonQuicklinks";

export default async function Home({
  params,
}: {
  params: { directoryId: string };
}) {
  const directorySlug = params.directoryId;

  return <CommonQuicklinks directorySlug={directorySlug} />;
}
