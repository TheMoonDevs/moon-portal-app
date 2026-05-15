import type { Candidate } from '@db/client';
import React from 'react';

export const CandidateListTable = ({
  candidates,
  openModal,
}: {
  candidates: Candidate[];
  openModal: (modalType: string, _candidate: Candidate) => void;
}) => {
  const tableHeadings = [
    'Name',
    'Email',
    'Mobile Number',
    'Portfolio',
    'Resume',
    'Applicant Answers',
    'Screening Round 1',
    'Screening Round 2',
    'Status',
  ];
  return (
    <div className="overflow-x-scroll md:overflow-visible">
      <table id="candidate-list" className="w-full">
        <thead>
          <tr className="w-full divide-x-2 rounded-lg bg-neutral-100">
            {tableHeadings.map((heading) => (
              <th
                key={heading}
                className="text-md p-2 text-left font-semibold text-neutral-800"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate: any) => {
            const {
              id,
              name,
              email,
              mobileNumber,
              portfolio,
              resume,
              applicantAnswers,
            } = candidate;
            return (
              <tr
                key={id}
                className="w-full divide-x-2 border-b-2 border-neutral-200"
              >
                <td className="p-2 text-sm">{name}</td>
                <td className="p-2 text-sm">
                  <a className="underline" href={`mailto:${email}`}>
                    {email}
                  </a>
                </td>
                <td className="p-2 text-sm">{mobileNumber}</td>
                <td className="p-2 text-sm">
                  {portfolio ? (
                    <a
                      className="text-blue-700 underline"
                      target="_blank"
                      rel="noreferrer"
                      href={portfolio}
                    >
                      {portfolio}
                    </a>
                  ) : (
                    'N/A'
                  )}
                </td>
                <td className="p-2 text-sm">{resume || 'No Resume'}</td>
                <td
                  className="cursor-pointer p-2 text-sm hover:bg-gray-100"
                  onClick={() => openModal('candidateAnswers', candidate)}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-icons-outlined pt-1 !text-sm">
                      visibility
                    </span>
                    <span>View</span>
                  </div>
                </td>
                <td
                  className="cursor-pointer p-2 text-sm hover:bg-gray-100"
                  onClick={() => openModal('screeningModal1', candidate)}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-icons-outlined pt-1 !text-sm">
                      visibility
                    </span>
                    <span>View</span>
                  </div>
                </td>
                <td
                  className="cursor-pointer p-2 text-sm hover:bg-gray-100"
                  onClick={() => openModal('screeningModal2', candidate)}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-icons-outlined pt-1 !text-sm">
                      visibility
                    </span>
                    <span>View</span>
                  </div>
                </td>
                <td className="p-2 text-sm">status </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
