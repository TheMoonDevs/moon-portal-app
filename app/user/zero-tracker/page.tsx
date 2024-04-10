import { PageAccess } from "@/components/global/PageAccess";
import ClientSideComponent from "@/components/screens/ZeroTracker/ClientSideComponent";

export default function Worklogs() {
  return (
    <PageAccess isAuthRequired={true}>
      <ClientSideComponent />
    </PageAccess>
  );
}
