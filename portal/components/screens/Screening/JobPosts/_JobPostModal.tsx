import type { JobPost } from '@db/client';
import { JOBPOST, JOBSTATUS, USERVERTICAL } from '@db/client';
import { Modal, Portal } from '@mui/material';
import type { ChangeEvent } from 'react';
import React, { useEffect, useState } from 'react';

import { Button } from '@/components/elements/Button';
import { AppDropdown } from '@/components/elements/Dropdown';
import { Spinner } from '@/components/elements/Loaders';
import { useAppDispatch } from '@/utils/redux/store';
import { setJobPostsRefresh } from '@/utils/redux/ui/ui.slice';
import { PortalSdk } from '@/utils/services/PortalSdk';

export interface NewJobPostModalProps {
  isOpen: boolean;
  handleClose: () => void;
  jobPostData: any; // Data of the job post to be edited
}

export const modalCenterStyle = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
};

export const NewJobPostModal: React.FC<NewJobPostModalProps> = ({
  isOpen,
  handleClose,
  jobPostData,
}) => {
  const initialFormData: JobPost = {
    id: jobPostData ? jobPostData.id : null,
    title: '',
    deptName: USERVERTICAL.DEV,
    description: '',
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
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prevData: any) => ({ ...prevData, [name]: value }));
  };

  const handleFormSubmit = () => {
    setLoading(true);
    let promise: Promise<any>;
    if (formData.id)
      promise = PortalSdk.putData('/api/jobPost', { data: formData });
    else promise = PortalSdk.postData('/api/jobPost', { data: formData });
    promise
      .then((response) => {
        console.log(response);
        dispatch(setJobPostsRefresh(null));
        handleClose();
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        console.error('Error submitting form:', err);
      });
  };

  return (
    <Portal>
      <Modal open={isOpen} onClose={handleClose}>
        <div
          style={{ ...modalCenterStyle }}
          className="h-4/5 w-[50%] overflow-y-auto rounded-md bg-white p-4"
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
              className="mt-1 w-full rounded-md border border-gray-300 p-2"
            />
          </label>

          <AppDropdown
            className="mt-4 flex w-full flex-col items-stretch"
            id="deptName"
            label="Department"
            options={Object.values(USERVERTICAL)}
            value={formData.deptName}
            onChange={(e) => handleInputChange(e as any)}
          />

          <label className="mt-4 block">
            Job Description:
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="mt-1 w-full rounded-md border border-gray-300 p-2"
            />
          </label>

          <div className="mt-8 flex flex-row">
            <Button
              onClick={handleFormSubmit}
              className="flex flex-row items-center gap-2"
            >
              {loading && (
                <Spinner className="size-3 fill-green-400 text-green-600" />
              )}
              {formData.id ? 'Save Job Post' : 'Create Job Post'}
            </Button>
          </div>
        </div>
      </Modal>
    </Portal>
  );
};
