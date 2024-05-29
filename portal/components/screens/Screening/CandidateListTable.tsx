import React, { useState } from "react";
import { CandidateAnswersModal } from "./JobPosts/CandidateAnswersModal";
import { ScreeningModal } from "./JobPosts/ScreeningModal/ScreeningModal";
import { Candidate } from "@prisma/client";

export const CandidateListTable = ({
  candidates,
  openModal,
}: {
  candidates: Candidate[];
  openModal: (modalType: string, _candidate: Candidate) => void;
}) => {
  const tableHeadings = [
    "Name",
    "Email",
    "Mobile Number",
    "Portfolio",
    "Resume",
    "Applicant Answers",
    "Screening Round 1",
    "Screening Round 2",
    "Status",
  ];
  return (
    <div className="overflow-x-scroll md:overflow-visible">
      <table id="candidate-list" className="w-full">
        <thead>
          <tr className=" w-full bg-neutral-100 rounded-lg divide-x-2">
            {tableHeadings.map((heading) => (
              <th
                key={heading}
                className="text-md font-semibold text-neutral-800 text-left p-2"
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
                className="border-b-2 border-neutral-200 w-full divide-x-2"
              >
                <td className="text-sm p-2">{name}</td>
                <td className="text-sm p-2">
                  <a className="underline" href={`mailto:${email}`}>
                    {email}
                  </a>
                </td>
                <td className="text-sm p-2">{mobileNumber}</td>
                <td className="text-sm p-2">
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
                    "N/A"
                  )}
                </td>
                <td className="text-sm p-2">{resume || "No Resume"}</td>
                <td
                  className="text-sm p-2  cursor-pointer hover:bg-gray-100"
                  onClick={() => openModal("candidateAnswers", candidate)}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-icons-outlined !text-sm pt-1">
                      visibility
                    </span>
                    <span>View</span>
                  </div>
                </td>
                <td
                  className="text-sm p-2  cursor-pointer hover:bg-gray-100"
                  onClick={() => openModal("screeningModal1", candidate)}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-icons-outlined !text-sm pt-1">
                      visibility
                    </span>
                    <span>View</span>
                  </div>
                </td>
                <td
                  className="text-sm p-2  cursor-pointer hover:bg-gray-100"
                  onClick={() => openModal("screeningModal2", candidate)}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-icons-outlined !text-sm pt-1">
                      visibility
                    </span>
                    <span>View</span>
                  </div>
                </td>
                <td className="text-sm p-2">status </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
