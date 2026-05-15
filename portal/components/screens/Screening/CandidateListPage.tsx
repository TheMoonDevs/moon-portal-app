'use client';

import type { Candidate } from '@db/client';
import { useEffect, useState } from 'react';

import { PortalSdk } from '@/utils/services/PortalSdk';

import { CandidateListTable } from './CandidateListTable';
import { Dropdown } from './Dropdown';
import { CandidateAnswersModal } from './JobPosts/CandidateAnswersModal';
import { ScreeningModal } from './JobPosts/ScreeningModal/ScreeningModal';

export const CandidateListPage = ({ job_id }: { job_id: string }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null,
  );

  const [isModalOpen, setIsModalOpen] = useState<string | null>(null);

  const handleScreeningRound1Save = async (
    e: any,
    data: any,
    candidateId: string,
  ) => {
    console.log(data);

    // try {
    //   const screeningRound1Data = data;
    //   const response = await fetch("/api/candidate", {
    //     method: "PUT",
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({
    //       id: candidateId,
    //       name: "screeningRound1",
    //       ...screeningRound1Data,
    //     }),
    //   });
    //   if (response.ok) {
    //     console.log("Screening round 1 updated successfully");
    //   } else {
    //     console.error("Failed to update screening round 1");
    //   }
    // } catch (error) {
    //   console.error("Error updating screening round 1:", error);
    // }
  };

  const handleScreeningRound2Save = async (
    e: any,
    data: any,
    candidateId: string,
  ) => {
    console.log(data);
    // try {
    //   const screeningRound2Data = { ...data };
    //   const response = await fetch("/api/candidate", {
    //     method: "PUT",
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify(screeningRound2Data),
    //   });
    //   if (response.ok) {
    //     console.log("Screening round 2 updated successfully");
    //   } else {
    //     console.error("Failed to update screening round 2");
    //   }
    // } catch (error) {
    //   console.error("Error updating screening round 2:", error);
    // }
  };

  useEffect(() => {
    const fetchCandidateListByJobId = async () => {
      try {
        const response = await PortalSdk.getData(
          `/api/candidate/candidate-list/${job_id}`,
          null,
        );
        setCandidates(response.data.candidates);
      } catch (error) {
        console.log(error);
      }
    };
    fetchCandidateListByJobId();
  }, [job_id]);

  return (
    <div className="overflow-x-hidden md:overflow-visible">
      <div className="flex w-full flex-row items-center justify-between border-b p-4">
        <div className="flex flex-row items-center gap-4">
          <h1 className="mr-4 text-xl font-bold">Screening</h1>
          <p className="ml-[-20px] border-l-2 pl-2 text-sm font-bold">
            All Applicants
          </p>
          <p className="border-x-2 px-2 text-sm">Job ID: {job_id}</p>

          <button className="btn btn-primary flex items-center">
            Select Dept.
          </button>
          <Dropdown options={['all']} selected="" onSelected={() => {}} />
          <button className="btn btn-primary">Filter by</button>
          <Dropdown options={['all']} selected="" onSelected={() => {}} />
        </div>
        <div className="mr-6 flex flex-row gap-4">
          <button className="btn btn-primary">Save to Excel</button>
        </div>
      </div>

      <CandidateListTable
        candidates={candidates}
        openModal={(type: string, _candidate: Candidate) => {
          setSelectedCandidate(_candidate);
          setIsModalOpen(type);
        }}
      />

      <CandidateAnswersModal
        isOpen={isModalOpen === 'candidateAnswers'}
        handleClose={() => {
          setSelectedCandidate(null);
          setIsModalOpen(null);
        }}
        candidateData={selectedCandidate}
      />

      <ScreeningModal
        isOpen={isModalOpen === 'screeningModal1'}
        handleClose={() => {
          setSelectedCandidate(null);
          setIsModalOpen(null);
        }}
        title="Screening Round 1"
        handleScreeningRoundSave={handleScreeningRound1Save}
        screeningData={selectedCandidate?.screeningRound1}
      />

      <ScreeningModal
        isOpen={isModalOpen === 'screeningModal2'}
        handleClose={() => {
          setSelectedCandidate(null);
          setIsModalOpen(null);
        }}
        title="Screening Round 2"
        handleScreeningRoundSave={handleScreeningRound2Save}
        screeningData={selectedCandidate?.screeningRound2}
      />
    </div>
  );
};
