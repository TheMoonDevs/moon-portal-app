import { DepartmentLinksByDirId } from "@/components/screens/Quicklinks/screens/DepartmentQuicklinks/DepartmentLinksByDirId";

export default async function Home({
  params,
}: {
  params: { directoryId: string };
}) {
  const directoryId = params.directoryId;

  return <DepartmentLinksByDirId directoryId={directoryId} />;
}
