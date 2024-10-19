import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import { AdminUserEditor } from "@/components/screens/Admin/AdminUserEditor/AdminUserEditor";

export default function Home() {
  return (
    <PageAccess isAuthRequired={true} isAdminRequired={true}>
      <AdminUserEditor />
      <Bottombar visible={false} />
    </PageAccess>
  );
}
