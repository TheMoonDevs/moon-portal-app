import React, {
  ChangeEvent,
  MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import GeneralModal from "../../../elements/Modal";
import { Backdrop } from "@mui/material";
import { Button } from "@/components/elements/Button";
import { useAppDispatch } from "@/utils/redux/store";
import { setJobPostsRefresh } from "@/utils/redux/ui/ui.slice";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { JobPost } from "@/utils/services/models/JobPost";

export interface NewJobPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => void; // Adjust the type based on your needs
  jobPostData: any; // Data of the job post to be edited
}

export const NewJobPostModal: React.FC<NewJobPostModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  jobPostData,
}) => {
  const initialFormData = {
    title: "",
    dept_name: "",
    description: "",
    skill_requirement: "",
    education_qualification: "",
    work_exp: "",
    work_hours_requirement: "",
    min_contract_period: "",
    expected_salary_range: "",
    location: "",
    status: "",
    jobpost: "",
    created_at: "",
  };

  const [formData, setFormData] = useState<any>(initialFormData);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (jobPostData) {
      setFormData(jobPostData);
    }
  }, [jobPostData]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData: any) => ({ ...prevData, [name]: value }));
  };

  const handleFormSubmit = () => {
    onSubmit(formData);
    PortalSdk.postData("/api/jobpost/new", { data: formData })
      .then((response) => {
        console.log(response);
        dispatch(setJobPostsRefresh(null));
        onClose();
      })
      .catch((err) => {
        console.error("Error submitting form:", err);
      });
  };

  const paperRef = useRef<HTMLDivElement>(null);
  const onBackdropOutside = (evt: MouseEvent<HTMLElement>) => {
    if (paperRef.current?.contains(evt.target as Node)) {
      return;
    }
    onClose();
  };

  return (
    // <GeneralModal
    //   isOpen={isOpen}
    //   onClose={onClose}
    //   onSubmit={handleFormSubmit}
    //   defaultValues={initialFormData}
    //   modalTitle="Job Post"
    // >
    <Backdrop open={isOpen} onAbort={onClose} onClick={onBackdropOutside}>
      <div
        ref={paperRef}
        className="bg-white rounded-md p-4 w-[50%] h-[80%] overflow-y-auto"
      >
        <p className="text-2xl font-bold">Create Job Post</p>
        <p className="text-sm text-gray-500">
          Create a new job post for your company | job id - {formData._id}
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

        <label className="block mt-4">
          Department Name:
          <input
            type="text"
            name="dept_name"
            value={formData.dept_name}
            onChange={handleInputChange}
            className="mt-1 p-2 border border-gray-300 rounded-md w-full"
          />
        </label>

        <label className="block mt-4">
          Job Description:
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="mt-1 p-2 border border-gray-300 rounded-md w-full"
          />
        </label>

        <label className="block mt-4">
          Skill Requirement:
          <input
            type="text"
            name="skill_requirement"
            value={formData.skill_requirement}
            onChange={handleInputChange}
            className="mt-1 p-2 border border-gray-300 rounded-md w-full"
          />
        </label>
        <div className="flex flex-row mt-8">
          <Button onClick={handleFormSubmit}>
            {formData._id ? "Save Job Post" : "Create Job Post"}
          </Button>
        </div>
      </div>
    </Backdrop>
    // </GeneralModal>
  );
};
