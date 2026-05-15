import { Button } from '@mui/material';
import { useEffect, useState } from 'react';

export const ScreeningFields = ({
  tabindex,
  data,
  handleScreeningRoundSave,
}: {
  tabindex: number;
  data: any;
  handleScreeningRoundSave: (
    e: any,
    data: any,
    candidateId: string,
  ) => Promise<any>;
}) => {
  const [isEditable, setIsEditable] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    comments: '',
    ratings: '',
  });
  const headerText = tabindex === 0 ? 'Reviewer' : 'Interviewer';

  const handleEdit = () => {
    setIsEditable(true);
  };

  const handleSave = async (
    e: React.MouseEvent<HTMLButtonElement>,
    fromData: any,
  ) => {
    e.preventDefault();
    const reviewerData = {
      reviewer: {
        name: formData.name,
        comments: formData.comments,
        ratings: formData.ratings,
      },
    };

    const interviewerData = {
      interviewer: {
        name: formData.name,
        comments: formData.comments,
        ratings: formData.ratings,
      },
    };
    if (tabindex === 0)
      await handleScreeningRoundSave(e, reviewerData, data.id);
    if (tabindex === 1)
      await handleScreeningRoundSave(e, interviewerData, data.id);
    setIsEditable(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  useEffect(() => {
    if (!data) setIsEditable(true);
  }, [data]);

  return (
    <form className="m-auto mt-14 w-4/5">
      <div className="flex flex-col gap-4">
        <label className="font-semibold">{`${headerText} Name`}</label>
        <input
          className={`rounded-md border-2 p-2 ${
            isEditable ? '' : 'cursor-default border-none focus:outline-none'
          }`}
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          readOnly={!isEditable}
        />
        <label className="font-semibold">{`${headerText} Feedback`}</label>
        <textarea
          className={`rounded-md border-2 p-2 ${
            isEditable
              ? ''
              : 'cursor-default resize-none border-none focus:outline-none'
          }`}
          name="comments"
          value={formData.comments}
          onChange={handleChange}
          readOnly={!isEditable}
        />
        <label className="font-semibold">{`${headerText} Ratings`}</label>
        <input
          type="number"
          className={`rounded-md border-2 p-2 ${
            isEditable ? '' : 'cursor-default border-none focus:outline-none'
          }`}
          name="ratings"
          value={formData.ratings}
          onChange={handleChange}
          readOnly={!isEditable}
        />
      </div>
      {isEditable ? (
        <div className="flex gap-2">
          <Button
            className="!mt-4 !bg-neutral-800 !text-white hover:!bg-neutral-700"
            onClick={(e) => handleSave(e, formData)}
          >
            Save
          </Button>
          <Button
            variant="outlined"
            className="!mt-4 rounded !border-none !bg-transparent px-4 py-2 font-bold !text-red-500 hover:!text-red-400"
            onClick={() => setIsEditable(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          className="!mt-4 rounded !bg-neutral-800 px-4 py-2 font-bold !text-white hover:!bg-neutral-700"
          onClick={handleEdit}
        >
          Edit
        </Button>
      )}
    </form>
  );
};
