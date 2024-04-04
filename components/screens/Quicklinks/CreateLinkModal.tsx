"use client";
import {
  addNewQuicklink,
  setIsCreateLinkModalOpen,
  setToast,
} from "@/utils/redux/quicklinks/quicklinks.slice";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { Button, CircularProgress } from "@mui/material";
import { usePathname } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Dropdown } from "./elements/Dropdown";
import { useUser } from "@/utils/hooks/useUser";
import { Department } from "@prisma/client";
import useAsyncState from "@/utils/hooks/useAsyncState";
import {
  MoonToast,
  ToastSeverity,
  useMoonToast,
} from "@/components/elements/Toast";

function getParentDirID({
  path,
  selectedDepartment,
  departments,
}: {
  path: string | null;
  selectedDepartment: { id: string; title: string };
  departments: Department[];
}) {
  let parentDirId;
  let departmentId = null;

  const isDashboard = path === "/quicklinks/dashboard";
  const isDepartmentPath = path?.startsWith("/quicklinks/department");
  const isCommonResourcesPath = path?.startsWith(
    "/quicklinks/common-resources"
  );

  if (!isDashboard) {
    if (isDepartmentPath && path !== "/quicklinks/department") {
      parentDirId = path?.split("/")[4];
      departmentId = departments.find(
        (department) => department.slug === path?.split("/")[3]
      )?.id;
    } else if (isCommonResourcesPath) {
      parentDirId = path?.split("/")[3];
    } else {
      parentDirId = selectedDepartment.id;
    }
  } else {
    parentDirId = selectedDepartment.id;
  }

  return { parentDirId, departmentId };
}

export const CreateLinkModal = () => {
  const { showToast, toastMsg, toastSev } = useMoonToast();
  const { user } = useUser();
  const path = usePathname();
  const [selectedDepartment, setSelectedDepartment] = useState({
    id: "",
    title: "",
  });

  const { departments } = useAppSelector((state) => state.quicklinks);
  const { parentDirId, departmentId } = getParentDirID({
    path,
    selectedDepartment,
    departments,
  });
  const dispatch = useAppDispatch();
  const { loading, setLoading } = useAsyncState();

  const { isCreateLinkModalOpen } = useAppSelector((state) => state.quicklinks);

  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<FormData | null>(null);

  useEffect(() => {
    if (path === "/quicklinks/dashboard") {
      setStep(1);
    } else setStep(0);
  }, [path]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevFormData) => {
      const newFormData = prevFormData || new FormData();
      newFormData.set(name, value);
      return newFormData;
    });
  };

  const handleOptionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedDepartment({
      id: departments.find((option) => option.title === value)?.id || "",
      title: value,
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    if (!formData) return;

    const link = formData.get("link") as string;
    try {
      if (!user?.id) {
        throw new Error("User not found");
      }
      const metadata = await QuicklinksSdk.getLinkMetaData(link);
      // store the metadata in db
      const newLinkData = {
        title: metadata.title,
        description: metadata.description,
        logo: metadata.image,
        url: metadata.url,
        clickCount: 0,
        directoryId: parentDirId,
        departmentId:
          departmentId ||
          (selectedDepartment.id !== "" && selectedDepartment.id) ||
          null,
        authorId: user?.id,
      };

      const response = await QuicklinksSdk.createData(
        "/api/quicklinks/link",
        newLinkData
      );

      if (path !== "/quicklinks/dashboard") {
        dispatch(addNewQuicklink(response.data.link));
      }

      dispatch(
        setToast({
          toastMsg: `Successfully created link: ${response.data.link.title}`,
          toastSev: ToastSeverity.success,
        })
      );

      setLoading(false);
      dispatch(setIsCreateLinkModalOpen(false));
    } catch (error) {
      dispatch(
        setToast({
          toastMsg: `Failed to create link: ${(error as Error).message}`,
          toastSev: ToastSeverity.error,
        })
      );
      setLoading(false);
      console.log(error);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <label htmlFor="link" className="text-3xl">
              Create New Link
            </label>
            <input
              className="border-b focus:outline-none focus:border-b-gray-600 transition-colors duration-500"
              type="text"
              name="link"
              id="link"
              required
              onChange={handleInputChange}
            />
            <Button
              className="!mt-8 w-full"
              color="inherit"
              variant="outlined"
              startIcon={
                loading && <CircularProgress size={20} color="inherit" />
              }
              endIcon={
                <span className="material-icons-outlined">arrow_forward</span>
              }
              onClick={() => setStep(2)}
            >
              Next
            </Button>
          </>
        );
      case 2:
        return (
          <>
            <Dropdown
              options={departments}
              placeholder="Select Department"
              handleOptionChange={handleOptionChange}
              selectedDepartment={selectedDepartment}
            />
            <div className="flex gap-4">
              <Button
                className="!mt-8 w-full"
                color="inherit"
                variant="outlined"
                startIcon={
                  <span className="material-icons-outlined">arrow_back</span>
                }
                onClick={handleBack}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="!mt-8 w-full"
                color="inherit"
                variant="outlined"
                startIcon={
                  loading && <CircularProgress size={20} color="inherit" />
                }
                endIcon={<span className="material-icons-outlined">add</span>}
                disabled={loading}
              >
                Create
              </Button>
            </div>
          </>
        );
      default:
        return (
          <>
            <label htmlFor="link" className="text-3xl">
              Create New Link
            </label>
            <input
              className="border-b focus:outline-none focus:border-b-gray-600 transition-colors duration-500"
              type="text"
              name="link"
              id="link"
              required
              onChange={handleInputChange}
            />
            <Button
              type="submit"
              className="!self-end !mt-8 w-full"
              color="inherit"
              variant="outlined"
              endIcon={<span className="material-icons-outlined">add</span>}
              disabled={loading}
              startIcon={
                loading && <CircularProgress size={20} color="inherit" />
              }
            >
              Create
            </Button>
          </>
        );
    }
  };

  return (
    <div
      className={`absolute bottom-0 left-0  w-full !overflow-hidden bg-white transition-all ${
        isCreateLinkModalOpen ? "h-full p-4" : "h-0 p-0"
      } duration-300`}
    >
      <div className="w-1/2 mx-auto h-full">
        <span
          className="absolute top-10 right-20 material-icons-outlined cursor-pointer text-gray-500"
          onClick={() => dispatch(setIsCreateLinkModalOpen(false))}
        >
          close
        </span>
        <form
          className="p-6 space-y-4 flex flex-col justify-center h-4/5"
          onSubmit={handleSubmit}
        >
          {renderStepContent()}
        </form>
      </div>
    </div>
  );
};
