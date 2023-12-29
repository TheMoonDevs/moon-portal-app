import React, { ChangeEvent, useState, useEffect } from "react";
import GeneralModal from "../../components/elements/Modal";

interface EditJobPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => void;
  jobPostData: any; // Data of the job post to be edited
}

const EditJobPostModal: React.FC<EditJobPostModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  jobPostData,
}) => {
  const [formData, setFormData] = useState<any>({}); // Use any as the type for formData

  useEffect(() => {
    const fetchJobPostData = async () => {
      try {
        if (jobPostData && jobPostData._id) {
          const response = await fetch(`/api/jobpost/${jobPostData._id}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const fetchedData = await response.json();
            setFormData(fetchedData); // Set the fetched data to formData state
          } else {
            console.error("Error fetching Job Post data");
          }
        }
      } catch (error) {
        console.error("Error fetching Job Post data:", error);
      }
    };

    if (isOpen) {
      // Fetch the initial form data when the modal is opened
      fetchJobPostData();
    }
  }, [isOpen, jobPostData]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData: any) => ({ ...prevData, [name]: value }));
  };

  const handleFormSubmit = async () => {
    try {
      if (jobPostData && jobPostData._id) {
        const response = await fetch(
          `/api/jobpost/${jobPostData.jobPosts._id}`,
          {
            method: "PATCH", // Use PATCH for updating
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
          }
        );

        if (response.ok) {
          console.log("Job Post updated successfully");
          onClose();
          window.location.reload();
        } else {
          console.error("Error updating Job Post");
        }
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
      defaultValues={formData} // Use fetched data as defaultValues
      modalTitle="Edit Job Post"
    >
      <>
        {/* Render form fields based on the fetched data */}
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
        <label className="block">
          Department Name:
          <input
            type="text"
            name="dept_name"
            value={formData.dept_name}
            onChange={handleInputChange}
            className="mt-1 p-2 border border-gray-300 rounded-md w-full"
          />
        </label>

        <label className="block">
          Job Description:
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="mt-1 p-2 border border-gray-300 rounded-md w-full"
          />
        </label>

        <label className="block">
          Skill Requirement:
          <input
            type="text"
            name="skill_requirement"
            value={formData.skill_requirement}
            onChange={handleInputChange}
            className="mt-1 p-2 border border-gray-300 rounded-md w-full"
          />
        </label>

        {/* Add more fields as needed */}
      </>
    </GeneralModal>
  );
};

export default EditJobPostModal;
