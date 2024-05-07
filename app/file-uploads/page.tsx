import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import { DropzoneButton } from "@/components/screens/UploadFile/DropzoneButton";
import FilesTable from "@/components/screens/UploadFile/FilesTable";
import Searchbar from "@/components/screens/UploadFile/Searchbar";

export default function Home() {
  return (
    <PageAccess isAuthRequired={true}>
      <div className="md:mx-4 md:mt-6 flex flex-col gap-4">
        <h1 className="lg:text-2xl md:text-xl md:mx-3 font-semibold">Upload Files</h1>
        <Searchbar />
        <DropzoneButton />
        <FilesTable />
        <Bottombar />
      </div>
    </PageAccess>
  );
}
