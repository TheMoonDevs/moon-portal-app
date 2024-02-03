import React, {
  ChangeEvent,
  MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Backdrop, Modal, Portal, Tooltip } from "@mui/material";
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
  const [isInputFocused, setInputFocused] = useState(false);
  const [inputQuestion, setInputQuestion] = useState("");

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
          <label className="block mt-2">
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

          {/* ADD QUESTIONS */}
          <div className="flex flex-col mt-8">
            <div>
              {/* ADDED QUESTIONS */}
              {formData.applicantQuestions?.map((question, index) => (
                <div
                  key={index}
                  className="flex flex-row justify-between items-center gap-2 p-3 bg-gray-100 rounded-md"
                >
                  <p className="font-medium text-gray-700">
                    Q{index + 1}. {question.question}
                  </p>
                  <div className="flex flex-row gap-2">
                    <Tooltip title="Edit" className="cursor-pointer">
                      <span className="material-symbols-outlined">edit</span>
                    </Tooltip>
                    <Tooltip
                      title="Delete"
                      className=" hover:text-red-500 cursor-pointer"
                      onClick={() => {
                        const newApplicantQuestions = [
                          ...(formData.applicantQuestions || []),
                        ];
                        newApplicantQuestions.splice(index, 1);
                        setFormData((f) => ({
                          ...f,
                          applicantQuestions: newApplicantQuestions,
                        }));
                      }}
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
            <input
              type="text"
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              className="mt-1 p-2 border border-gray-300 rounded-md w-full"
            />
            <div
              onClick={() => {
                setFormData((f) => ({
                  ...f,
                  applicantQuestions: [
                    ...(f.applicantQuestions || []),
                    { question: inputQuestion, description: "", type: "text" },
                  ],
                }));
                setInputQuestion("");
              }}
              className={`cursor-pointer flex flex-row mt-3 items-center w-fit gap-2 p-2 rounded-md transition-all duration-100 ease-in-out ${
                isInputFocused
                  ? "bg-neutral-800 text-white"
                  : "bg-neutral-100 hover:bg-neutral-200"
              }`}
            >
              Add Question
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
