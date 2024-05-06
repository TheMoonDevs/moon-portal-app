import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import UploadFileComponent from "@/components/screens/UploadFile/UploadFileComponent";

export default function Home() {
  return (
    <PageAccess isAuthRequired={true}>
      <UploadFileComponent />
      <Bottombar />
    </PageAccess>
  );
}
