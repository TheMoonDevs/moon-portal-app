"use client";
import { PageAccess } from "@/components/global/PageAccess";
import { FileUpload } from "@/components/screens/UploadFile/FileUpload";

export default function Home() {
  return (
    <PageAccess isAuthRequired={true}>
      <FileUpload />
    </PageAccess>
  );
}
