"use client"
import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import DropzoneAdminButton from "@/components/screens/UploadFile/DropzoneAdminButton";
import { DropzoneButton } from "@/components/screens/UploadFile/DropzoneButton";
import FilesTable from "@/components/screens/UploadFile/FilesTable";
import Searchbar from "@/components/screens/UploadFile/Searchbar";
import { useUser } from "@/utils/hooks/useUser";

export default function Home() {
  const { user } = useUser();
  return (
    <PageAccess isAuthRequired={true}>
      <div className="md:mx-4 md:mt-6 flex flex-col gap-4">
        <h1 className="lg:text-2xl md:text-xl md:mx-3 font-semibold">
          Upload Files
        </h1>
        <Searchbar />
        {user?.isAdmin ? <DropzoneAdminButton /> : <DropzoneButton />}
        <FilesTable />
        <Bottombar />
      </div>
    </PageAccess>
  );
}
