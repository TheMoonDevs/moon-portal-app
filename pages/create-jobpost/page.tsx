import React, { ChangeEvent, useState } from "react";
import GeneralModal from "../../components/elements/Modal";

interface NewJobPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => void; // Adjust the type based on your needs
}

const NewJobPostModal: React.FC<NewJobPostModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
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

  const [formData, setFormData] = useState(initialFormData);
  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleFormSubmit = async () => {
    try {
      const response = await fetch("/api/jobpost/new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        console.log("Job Post created successfully");
        onClose();
        window.location.reload();
      } else {
        console.error("Error creating Job Post");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <GeneralModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleFormSubmit}
      defaultValues={initialFormData}
      modalTitle="Job Post"
    >
      <>
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
      </>
    </GeneralModal>
  );
};

export default NewJobPostModal;
