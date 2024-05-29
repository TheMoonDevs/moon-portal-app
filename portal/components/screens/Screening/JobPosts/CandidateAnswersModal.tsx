import { Modal, Portal } from "@mui/material";

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
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-md p-8 w-4/5 md:w-1/2 h-1/2 md:h-4/5 overflow-y-auto">
          <h1 className="text-2xl font-bold">Candidate Response</h1>
          <div className="flex flex-col my-3 gap-1 w-fit ">
            <span>{candidateData?.name}</span>
            <a
              href={`mailto:${candidateData?.email}`}
              className="underline text-blue-700"
            >
              <span>{candidateData?.email}</span>
            </a>
            <span>{candidateData?.mobileNumber}</span>
          </div>
          <hr></hr>
          <div className="flex flex-col mt-5">
            {candidateData?.applicantAnswers.map(
              (
                { question, answer }: { question: string; answer: string },
                index: number
              ) => (
                <div key={index} className="mt-6">
                  <p className="font-semibold mb-3"> {question}</p>
                  <p> {answer}</p>
                </div>
              )
            )}
          </div>
        </div>
      </Modal>
    </Portal>
  );
};
