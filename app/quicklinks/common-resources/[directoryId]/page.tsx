import { CommonQuicklinks } from "@/components/screens/Quicklinks/screens/CommonQuicklinks";

export default async function Home({
  params,
}: {
  params: { directoryId: string };
}) {
  const directoryId = params.directoryId;

  return <CommonQuicklinks directoryId={directoryId} />;
}
