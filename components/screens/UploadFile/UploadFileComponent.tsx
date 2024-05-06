"use client";
import React from "react";
import { DropzoneButton } from "./DropzoneButton";
import Searchbar from "./Searchbar";

const UploadFileComponent = () => {
  return (
    <div className="md:ml-3 md:mt-6 flex flex-col gap-4">
      <h1 className="lg:text-2xl md:text-xl font-semibold">Upload Files</h1>
      <Searchbar />
      <DropzoneButton />
    </div>
  );
};

export default UploadFileComponent;
