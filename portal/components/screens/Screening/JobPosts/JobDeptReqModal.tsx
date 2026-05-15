import { Modal, Portal, Tooltip } from '@mui/material';
import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/elements/Button';
import { AppDropdown } from '@/components/elements/Dropdown';
import { Spinner } from '@/components/elements/Loaders';
import type { JobPostDeptReq } from '@/types/db/job-post';
import { workExpInYears } from '@/types/db/job-post';
import { useAppDispatch } from '@/utils/redux/store';
import { setJobPostsRefresh } from '@/utils/redux/ui/ui.slice';
import { PortalSdk } from '@/utils/services/PortalSdk';

import type { NewJobPostModalProps } from './_JobPostModal';
import { modalCenterStyle } from './_JobPostModal';

export const JobDeptReqModal: React.FC<NewJobPostModalProps> = ({
  isOpen,
  handleClose,
  jobPostData,
}) => {
  const initialFormData: JobPostDeptReq = {};
  const [formData, setFormData] = useState<JobPostDeptReq>(initialFormData);

  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [isInputFocused, setInputFocused] = useState(false);
  const [inputQuestion, setInputQuestion] = useState('');
  const [inputSkill, setInputSkill] = useState('');

  // load default req
  useEffect(() => {
    if (jobPostData) {
      setFormData(jobPostData.defaultReq);
    }
  }, [jobPostData]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prevData: any) => ({ ...prevData, [name]: value }));
  };

  const handleFormSubmit = () => {
    setLoading(true);
    PortalSdk.putData('/api/jobPost', {
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
        console.error('Error submitting form:', err);
      });
  };

  if (!jobPostData) return null;

  return (
    <Portal>
      <Modal open={isOpen} onClose={handleClose}>
        <div
          style={{ ...modalCenterStyle }}
          className="h-4/5 w-[50%] overflow-y-auto rounded-md bg-white p-4"
        >
          <p className="text-2xl font-bold">Department Requirements</p>
          <p className="text-sm text-gray-500">
            Create/Edit a job post for your company | job id - {jobPostData.id}
          </p>

          {/* Skills */}
          <div className="mt-2 flex w-full flex-col items-stretch">
            <label>Add Skills Required</label>
            <input
              className="mb-2 w-full rounded-md border border-gray-300 p-2"
              id="skills"
              placeholder="e.g Java, JavaScript, Python"
              value={inputSkill}
              onChange={(e) => setInputSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (inputSkill.trim() === '') {
                    // input is empty, do not add skill
                    return;
                  }
                  const newSkills = inputSkill
                    .split(',')
                    .map((skill) => skill.trim());
                  setFormData((f) => {
                    const existingSkills = f.skills || [];
                    const uniqueSkills = newSkills.filter(
                      (skill) =>
                        !existingSkills
                          .map((s) => s.toLowerCase())
                          .includes(skill.toLowerCase()),
                    );
                    return {
                      ...f,
                      skills: [...existingSkills, ...uniqueSkills],
                    };
                  });
                  setInputSkill('');
                }
              }}
              type="text"
            />
            <div className="flex flex-wrap gap-2">
              {formData.skills?.map((skill, index) => (
                <div
                  key={index}
                  className="flex w-fit flex-row gap-2 rounded-md bg-neutral-800 p-2 text-white"
                >
                  <p>{skill}</p>
                  <span
                    className="material-symbols-outlined cursor-pointer"
                    onClick={() => {
                      setFormData((f) => {
                        const newSkills = [...(f.skills || [])] as string[];
                        newSkills.splice(index, 1);
                        return { ...f, skills: newSkills };
                      });
                    }}
                  >
                    close
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Work Experience */}
          <AppDropdown
            className="mt-4 flex w-full flex-col items-stretch"
            id="workExpInYears"
            label="Work Experience (in years)"
            options={Object.values(workExpInYears)}
            value={formData.workExpInYears || ''}
            onChange={(e) => handleInputChange(e as any)}
          />

          <p className="mt-8 border-t-2 pt-8 text-2xl font-bold">
            Applicant Questions (Optional)
          </p>
          <p className="text-sm text-gray-500">
            -will be shown on application form to candidate. Keep the no. of
            questions as less as possible.
          </p>

          <div className="mt-8 flex flex-col">
            <div>
              {/* ADDED QUESTIONS */}
              {formData.applicantQuestions?.map((question, index) => (
                <div
                  key={index}
                  className="flex flex-row items-center justify-between gap-2 rounded-md bg-gray-100 p-3"
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
                      className="cursor-pointer hover:text-red-500"
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

            {/* ADD QUESTIONS */}
            <input
              type="text"
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 p-2"
            />
            <div
              onClick={() => {
                setFormData((f) => ({
                  ...f,
                  applicantQuestions: [
                    ...(f.applicantQuestions || []),
                    { question: inputQuestion, description: '', type: 'text' },
                  ],
                }));
                setInputQuestion('');
              }}
              className={`mt-3 flex w-fit cursor-pointer flex-row items-center gap-2 rounded-md p-2 transition-all duration-100 ease-in-out ${
                isInputFocused
                  ? 'bg-neutral-800 text-white'
                  : 'bg-neutral-100 hover:bg-neutral-200'
              }`}
            >
              {loading && (
                <Spinner className="size-3 fill-green-400 text-green-600" />
              )}
              {'Add Question'}
            </div>
          </div>

          <div className="mt-8 flex flex-row">
            <Button
              onClick={handleFormSubmit}
              className="flex flex-row items-center gap-2"
            >
              {loading && (
                <Spinner className="size-3 fill-green-400 text-green-600" />
              )}
              {'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>
    </Portal>
  );
};
