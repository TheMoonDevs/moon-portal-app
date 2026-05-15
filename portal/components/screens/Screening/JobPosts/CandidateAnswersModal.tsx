import { Modal, Portal } from '@mui/material';

interface CandidateAnswersModalProps {
  isOpen: boolean;
  handleClose: () => void;
  candidateData: any;
}
export const CandidateAnswersModal: React.FC<CandidateAnswersModalProps> = ({
  isOpen,
  handleClose,
  candidateData,
}) => {
  return (
    <Portal>
      <Modal onClose={handleClose} open={isOpen}>
        <div className="absolute left-1/2 top-1/2 h-1/2 w-4/5 -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md bg-white p-8 md:h-4/5 md:w-1/2">
          <h1 className="text-2xl font-bold">Candidate Response</h1>
          <div className="my-3 flex w-fit flex-col gap-1">
            <span>{candidateData?.name}</span>
            <a
              href={`mailto:${candidateData?.email}`}
              className="text-blue-700 underline"
            >
              <span>{candidateData?.email}</span>
            </a>
            <span>{candidateData?.mobileNumber}</span>
          </div>
          <hr></hr>
          <div className="mt-5 flex flex-col">
            {candidateData?.applicantAnswers.map(
              (
                { question, answer }: { question: string; answer: string },
                index: number,
              ) => (
                <div key={index} className="mt-6">
                  <p className="mb-3 font-semibold"> {question}</p>
                  <p> {answer}</p>
                </div>
              ),
            )}
          </div>
        </div>
      </Modal>
    </Portal>
  );
};
