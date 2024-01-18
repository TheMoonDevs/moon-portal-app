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
import { JobPositionType, JobPostDefaultReq } from "@/prisma/dbExtras";
import { NewJobPostModalProps, modalCenterStyle } from "./_JobPostModal";

export const JobDefaultReqModal: React.FC<NewJobPostModalProps> = ({
  isOpen,
  handleClose,
  jobPostData,
}) => {
  const initialFormData: JobPostDefaultReq = {};

  const [formData, setFormData] = useState<JobPostDefaultReq>(initialFormData);
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);

  // load default req
  useEffect(() => {
    if (jobPostData) {
      setFormData(jobPostData.defaultReq);
    }
  }, [jobPostData]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData: any) => ({ ...prevData, [name]: value }));
  };

  const handleFormSubmit = () => {
    setLoading(true);
    PortalSdk.putData("/api/jobPost", {
      data: { id: jobPostData.id, defaultReq: formData },
    })
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

  if (!jobPostData) return null;

  return (
    <Portal>
      <Modal open={isOpen} onClose={handleClose}>
        <div
          style={{ ...modalCenterStyle }}
          className="bg-white rounded-md p-4 w-[50%] h-[80%] overflow-y-auto"
        >
          <p className="text-2xl font-bold">Default Requirements</p>
          <p className="text-sm text-gray-500">
            Create/Edit a job post for your company | job id - {jobPostData.id}
          </p>
          <label className="block">
            Target Group
            <input
              type="text"
              name="targetGroup"
              value={formData.targetGroup}
              onChange={handleInputChange}
              className="mt-1 p-2 border border-gray-300 rounded-md w-full"
            />
          </label>

          <AppDropdown
            className="mt-4 w-full flex flex-col items-stretch"
            id="positionType"
            label="Position Type"
            options={Object.values(JobPositionType)}
            value={formData.positionType || ""}
            onChange={(e) => handleInputChange(e as any)}
          />

          <p className="text-2xl font-bold mt-8 pt-8 border-t-2">
            Applicant Questions (Optional)
          </p>
          <p className="text-sm text-gray-500">
            -will be shown on application form to candidate. Keep the no. of
            questions as less as possible.
          </p>
          <div className="flex flex-row mt-8">
            <div
              onClick={() =>
                setFormData((f) => ({
                  ...f,
                  applicantQuestions: [
                    ...(f.applicantQuestions || []),
                    { question: "", description: "", type: "text" },
                  ],
                }))
              }
              className="cursor-pointer flex flex-row items-center gap-2 bg-neutral-100 p-2 rounded-md hover:bg-neutral-200 transition-all duration-100 ease-in-out"
            >
              {loading && (
                <Spinner className="w-3 h-3 fill-green-400 text-green-600" />
              )}
              {"Add Question"}
            </div>
          </div>

          <div className="flex flex-row mt-8">
            <Button
              onClick={handleFormSubmit}
              className="flex flex-row items-center gap-2"
            >
              {loading && (
                <Spinner className="w-3 h-3 fill-green-400 text-green-600" />
              )}
              {"Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>
    </Portal>
  );
};
