import { DepartmentLinksByDirId } from "@/components/screens/Quicklinks/screens/DepartmentQuicklinks/DepartmentLinksByDirId";

export default async function Home({
  params,
}: {
  params: { directoryId: string; departmentId: string };
}) {
  const directorySlug = params.directoryId;
  const departmentSlug = params.departmentId;

  return (
    <DepartmentLinksByDirId
      directorySlug={directorySlug}
      departmentSlug={departmentSlug}
    />
  );
}
