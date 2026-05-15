import { Modal, Portal, Tooltip } from '@mui/material';
import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/elements/Button';
import { Spinner } from '@/components/elements/Loaders';
import type { JobPostHRReq } from '@/types/db/job-post';
import useCopyToClipboard from '@/utils/hooks/useCopyToClipboard';
import { useAppDispatch } from '@/utils/redux/store';
import { setJobPostsRefresh } from '@/utils/redux/ui/ui.slice';
import { PortalSdk } from '@/utils/services/PortalSdk';

import type { NewJobPostModalProps } from './_JobPostModal';
import { modalCenterStyle } from './_JobPostModal';

interface PlatformData {
  platformName: string;
  jobPostUrl: string;
}

export const JobHRReqModal: React.FC<NewJobPostModalProps> = ({
  isOpen,
  handleClose,
  jobPostData,
}) => {
  const initialFormData: JobPostHRReq = {};
  const [formData, setFormData] = useState<JobPostHRReq>(initialFormData);

  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [isInputFocused, setInputFocused] = useState(false);
  const [inputQuestion, setInputQuestion] = useState('');
  const [showPlatformFields, setShowPlatformFields] = useState(false);
  const [inputData, setInputData] = useState({
    platformName: '',
    jobPostUrl: '',
  });
  const [addPlatformData, setAddPlatformData] = useState<PlatformData[] | []>(
    [],
  );

  const { copyToClipboard, copied } = useCopyToClipboard();
  const ref = useRef<HTMLParagraphElement | null>(null);
  const handleCopyLink = () => {
    if (ref.current) {
      copyToClipboard(ref.current.innerHTML);
    }
  };

  //   console.log(addPlatformData);

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
          <p className="text-2xl font-bold">HR Requirements</p>
          <p className="text-sm text-gray-500">
            Create/Edit a job post for your company | job id - {jobPostData.id}
          </p>

          <div className="mt-2 flex flex-col gap-1">
            <p className="text-xl font-medium">Public Posting</p>

            {/* Added platform */}
            {addPlatformData.map((data, index) => (
              <div
                key={`${data.platformName}-${data.jobPostUrl}`}
                className="flex flex-row items-center justify-between gap-2 rounded-md bg-gray-100 p-3"
              >
                <p>{data.platformName}</p>
                <div className="flex flex-row gap-2">
                  <p className="hidden" ref={ref}>
                    {data.jobPostUrl}
                  </p>
                  <Tooltip
                    title={copied ? 'Copied!' : 'Copy Link'}
                    className="cursor-pointer"
                    onClick={handleCopyLink}
                  >
                    <span className="material-symbols-outlined">link</span>
                  </Tooltip>
                  <Tooltip title="Edit" className="cursor-pointer">
                    <span className="material-symbols-outlined">edit</span>
                  </Tooltip>
                  <Tooltip
                    title="Delete"
                    className="cursor-pointer hover:text-red-500"
                    onClick={() => {
                      const newPlatformData = [...addPlatformData];
                      newPlatformData.splice(index, 1);
                      setAddPlatformData(newPlatformData);
                    }}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </Tooltip>
                </div>
              </div>
            ))}

            {/* Add platform */}
            {!showPlatformFields && (
              <div
                onClick={() => setShowPlatformFields(true)}
                className="flex w-fit cursor-pointer flex-row items-center gap-2 rounded-md bg-neutral-800 p-2 text-white"
              >
                <p>Add Platform</p>
                <span className="material-symbols-outlined">add</span>
              </div>
            )}
            {showPlatformFields && (
              <>
                <label className="block">
                  Platform Name
                  <input
                    type="text"
                    name="platformName"
                    value={inputData.platformName}
                    onChange={(e) =>
                      setInputData({
                        ...inputData,
                        platformName: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 p-2"
                  />
                </label>
                <label className="block">
                  Job Post URL
                  <input
                    type="text"
                    name="jobPostUrl"
                    value={inputData.jobPostUrl}
                    onChange={(e) =>
                      setInputData({ ...inputData, jobPostUrl: e.target.value })
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 p-2"
                  />
                </label>
                <div className="mt-2 flex flex-row">
                  <Button
                    onClick={() => {
                      if (
                        !inputData.platformName.trim() ||
                        !inputData.jobPostUrl.trim()
                      ) {
                        setShowPlatformFields(false);
                        return;
                      }

                      setAddPlatformData([
                        ...addPlatformData,
                        {
                          platformName: inputData.platformName,
                          jobPostUrl: inputData.jobPostUrl,
                        },
                      ]);
                      setInputData({ platformName: '', jobPostUrl: '' }); // reset input fields
                    }}
                    className="flex flex-row items-center gap-2"
                  >
                    Save
                  </Button>
                </div>
              </>
            )}
          </div>

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
                <div key={index} className="mb-4 rounded-sm bg-gray-100 p-2">
                  <p className="font-medium text-gray-700">
                    Q{index + 1}. {question.question}
                  </p>
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
