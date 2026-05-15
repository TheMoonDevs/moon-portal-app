import type { User, ZeroRecords } from '@db/client';
import dayjs from 'dayjs';
import type { SetStateAction } from 'react';
import { useEffect, useState } from 'react';

import { useUser } from '@/utils/hooks/useUser';
import { useAppSelector } from '@/utils/redux/store';
import type { IMeetingData } from '@/utils/redux/zerotracker/zerotracker.slice';
import { PortalSdk } from '@/utils/services/PortalSdk';

import type { TrackerMode } from '../ZeroTracker';
import { MeetingCard } from './MeetingCard';
import { MeetingModal } from './MeetingModal';

export const Meeting = ({
  setTrackerMode,
  meetingDate,
  setMeetingDate,
  allUsers,
}: {
  setTrackerMode: React.Dispatch<SetStateAction<TrackerMode>>;
  meetingDate: string;
  setMeetingDate: React.Dispatch<SetStateAction<string>>;
  allUsers: User[];
}) => {
  const { user } = useUser(false);
  const [allMeetingRecords, setAllMeetingRecords] = useState<ZeroRecords[]>([]);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [meetingToUpdate, setMeetingToUpdate] = useState<IMeetingData | null>(
    null,
  );
  const loggedInUserMeetingRecord = useAppSelector(
    (state) => state.zerotracker.loggedInUserMeetingRecord,
  );

  useEffect(() => {
    PortalSdk.getData(
      `/api/user/zeros?config=meeting&year=${dayjs().year()}`,
      null,
    )
      .then(({ data }) => {
        // console.log(data);
        const meetingRecordsOfAllUser = data.zeroRecords;
        setAllMeetingRecords(meetingRecordsOfAllUser);
      })
      .catch((error) => console.log(error));
  }, [user]);

  const handleMeetingCardClick = (meeting: IMeetingData) => {
    setMeetingToUpdate(meeting);
    setIsMeetingModalOpen(true);
  };

  const handleCreateNewMeeting = () => {
    setMeetingToUpdate(null);
    setIsMeetingModalOpen(true);
  };

  return (
    <>
      <div className="flex w-full flex-col justify-between gap-2 p-4">
        <div className="flex flex-row items-center justify-start gap-1 overflow-hidden text-neutral-900">
          <p className="text-[1.5em] font-bold">
            Schedule custom meetings in calendar
          </p>
        </div>
        <p className="text-[0.7em] leading-none text-neutral-500">
          Please select any date and then click on create button to schedule a
          meeting.
        </p>

        {(loggedInUserMeetingRecord?.allMeetings as IMeetingData[])?.map(
          (meeting: IMeetingData, index: number) => {
            return (
              <MeetingCard
                key={index}
                meeting={meeting}
                dayjs={dayjs}
                handleMeetingCardClick={handleMeetingCardClick}
              />
            );
          },
        )}

        <div className="flex flex-col gap-2">
          <div
            onClick={handleCreateNewMeeting}
            className="flex cursor-pointer flex-row items-center justify-center gap-1 overflow-hidden rounded-[0.75em] bg-blue-500 p-4 text-neutral-100"
          >
            <span className="icon_size material-icons">add</span>
            <p className="text-[0.7em] font-bold tracking-[0.2em]">
              CREATE NEW MEETING
            </p>
          </div>
          <div
            onClick={() => setTrackerMode('normal')}
            className="flex flex-1 grow cursor-pointer flex-row items-center justify-center gap-1 rounded-[0.75em] bg-neutral-200 p-4 text-neutral-900"
          >
            <span className="icon_size material-symbols-outlined">
              arrow_back
            </span>
            <p className="whitespace-nowrap text-[0.7em] font-bold tracking-[0.2em]">
              BACK
            </p>
          </div>
        </div>
      </div>
      {isMeetingModalOpen && (
        <MeetingModal
          setIsMeetingModalOpen={setIsMeetingModalOpen}
          meetingDate={meetingDate}
          setMeetingDate={setMeetingDate}
          user={user as User}
          allUsers={allUsers}
          allMeetingRecords={allMeetingRecords}
          setAllMeetingRecords={setAllMeetingRecords}
          currentUserMeetingRecord={loggedInUserMeetingRecord}
          meetingToUpdate={meetingToUpdate}
        />
      )}
    </>
  );
};
