import React, {
  ChangeEvent,
  MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Backdrop, Modal, Portal } from "@mui/material";
import { Button } from "@/components/elements/Button";
import { useAppDispatch } from "@/utils/redux/store";
import { setJobPostsRefresh } from "@/utils/redux/ui/ui.slice";
import { PortalSdk } from "@/utils/services/PortalSdk";
import {
  JOBPOST,
  JOBSTATUS,
  JobPost,
  USERROLE,
  USERVERTICAL,
} from "@prisma/client";
import { AppDropdown } from "@/components/elements/Dropdown";
import { Spinner } from "@/components/elements/Loaders";

export interface NewJobPostModalProps {
  isOpen: boolean;
  handleClose: () => void;
  jobPostData: any; // Data of the job post to be edited
}

export const modalCenterStyle = {
  position: "absolute" as "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
};

export const NewJobPostModal: React.FC<NewJobPostModalProps> = ({
  isOpen,
  handleClose,
  jobPostData,
}) => {
  const initialFormData: JobPost = {
    id: jobPostData ? jobPostData.id : null,
    title: "",
    deptName: USERVERTICAL.DEV,
    description: "",
    status: JOBSTATUS.ACTIVE,
    jobpost: JOBPOST.INTERN,
    createdAt: new Date(),
    defaultReq: {},
    deptReq: {},
    adminReq: {},
    hrReq: {},
  };

  const [formData, setFormData] = useState<JobPost>(initialFormData);
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (jobPostData) {
      setFormData(jobPostData);
    } else {
      setFormData(initialFormData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobPostData]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData: any) => ({ ...prevData, [name]: value }));
  };

  const handleFormSubmit = () => {
    setLoading(true);
    let promise: Promise<any>;
    if (formData.id)
      promise = PortalSdk.putData("/api/jobPost", { data: formData });
    else promise = PortalSdk.postData("/api/jobPost", { data: formData });
    promise
      .then((response) => {
        console.log(response);
        dispatch(setJobPostsRefresh(null));
        handleClose();
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        console.error("Error submitting form:", err);
      });
  };

  return (
    <Portal>
      <Modal open={isOpen} onClose={handleClose}>
        <div
          style={{ ...modalCenterStyle }}
          className="bg-white rounded-md p-4 w-[50%] h-[80%] overflow-y-auto"
        >
          <p className="text-2xl font-bold">Create Job Post</p>
          <p className="text-sm text-gray-500">
            Create/Edit a job post for your company | job id - {formData.id}
          </p>
          <label className="block">
            Job Title:
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="mt-1 p-2 border border-gray-300 rounded-md w-full"
            />
          </label>

          <AppDropdown
            className="mt-4 w-full flex flex-col items-stretch"
            id="deptName"
            label="Department"
            options={Object.values(USERVERTICAL)}
            value={formData.deptName}
            onChange={(e) => handleInputChange(e as any)}
          />

          <label className="block mt-4">
            Job Description:
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="mt-1 p-2 border border-gray-300 rounded-md w-full"
            />
          </label>

          <div className="flex flex-row mt-8">
            <Button
              onClick={handleFormSubmit}
              className="flex flex-row items-center gap-2"
            >
              {loading && (
                <Spinner className="w-3 h-3 fill-green-400 text-green-600" />
              )}
              {formData.id ? "Save Job Post" : "Create Job Post"}
            </Button>
          </div>
        </div>
      </Modal>
    </Portal>
  );
};
