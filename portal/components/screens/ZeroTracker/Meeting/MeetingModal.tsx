import CircularLoader from "@/components/elements/CircularLoader";
import { useAppDispatch } from "@/utils/redux/store";
import {
  IMeetingData,
  deleteLoggedInUserMeetingRecord,
  setLoggedInUserMeetingRecord,
} from "@/utils/redux/zerotracker/zerotracker.slice";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { User, ZeroRecords } from "@prisma/client";
import { useEffect, useState } from "react";

interface MeetingModalProps {
  setIsMeetingModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  meetingDate: string;
  setMeetingDate: React.Dispatch<React.SetStateAction<string>>;
  user: User;
  allUsers: User[];
  currentUserMeetingRecord: any;
  meetingToUpdate: any;
  allMeetingRecords: ZeroRecords[];
  setAllMeetingRecords: React.Dispatch<React.SetStateAction<ZeroRecords[]>>;
}

export const MeetingModal = ({
  setIsMeetingModalOpen,
  meetingDate,
  setMeetingDate,
  user,
  allUsers,
  meetingToUpdate,
  allMeetingRecords,
  setAllMeetingRecords,
  currentUserMeetingRecord,
}: MeetingModalProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [typedUser, setTypedUser] = useState<string | undefined>(undefined);
  const [selectedMeetingMembers, setSelectedMeetingMembers] = useState<User[]>([
    user,
  ]);
  const [removedUsers, setRemovedUsers] = useState<any[]>([]);
  const [meetingTitle, setMeetingTitle] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!meetingToUpdate) return;
    setMeetingDate(meetingToUpdate?.date);
    setSelectedMeetingMembers(meetingToUpdate?.members);
    setMeetingTitle(meetingToUpdate?.title);
  }, [meetingToUpdate, setMeetingDate]);

  const handleDeleteMeeting = async (meeting: IMeetingData) => {
    setIsDeleting(true)
    try {
      const setOfSelectedMembers = new Set(
        selectedMeetingMembers.map((member: User) => member.id)
      );

      const updateMeetings = [...allMeetingRecords];

      updateMeetings.forEach((record: ZeroRecords) => {
        if (record?.userId && setOfSelectedMembers.has(record?.userId)) {
          record.allMeetings = record.allMeetings?.filter(
            (m: any) => m.id !== meeting.id
          );
        }
      });

      const reponses = await Promise.all(
        updateMeetings
          .filter((record: any) => setOfSelectedMembers.has(record.userId))
          .map((record: any) =>
            PortalSdk.putData(`/api/user/zeros`, { data: record })
          )
      );
      dispatch(deleteLoggedInUserMeetingRecord(meeting));
      setAllMeetingRecords(updateMeetings);
      setIsMeetingModalOpen(false);
      setIsDeleting(false)
    } catch (error) {
      console.log(error);
    }
  };

  const handleMeetingFormSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setIsSaving(true)

    const meetingData = {
      id: meetingToUpdate ? meetingToUpdate.id : meetingTitle + meetingDate,
      title: meetingTitle === "" ? "(No Title)" : meetingTitle,
      date: meetingDate,
      type: "meeting",
      members: selectedMeetingMembers,
    };

    const updatedRecords = updateMeetingRecords(meetingData);

    try {
      await Promise.all([
        updateExistingMembersMeetingData(updatedRecords),
        createNewMembersMeetingRecord(meetingData),
        removedUsers.length > 0 &&
          deleteRemovedMembersMeetingData(updatedRecords),
      ]);

      setIsMeetingModalOpen(false);
    } catch (error) {
      console.error(error);
    }
    setIsSaving(false)
  };

  const updateMeetingRecords = (meetingData: any) => {
    let updatedRecords = allMeetingRecords.map((record) => {
      const targetMember = selectedMeetingMembers.some(
        (member) => member.id === record.userId
      );

      if (meetingToUpdate) {
        // Update existing meeting
        if (targetMember) {
          const isMemberMeetingRecordEmpty = record.allMeetings?.length === 0;

          if (isMemberMeetingRecordEmpty) {
            return { ...record, allMeetings: [meetingData] };
          }

          let isMeetingFound = false;
          let updatedMeetings = record.allMeetings?.map((meeting: any) => {
            if (meeting?.id === meetingToUpdate.id && !isMeetingFound) {
              isMeetingFound = true;
              return meetingData;
            }
            return meeting;
          });

          if (!isMeetingFound) {
            updatedMeetings = [...updatedMeetings, meetingData];
          }

          return { ...record, allMeetings: updatedMeetings };
        }
      } else {
        // Add new meeting
        if (targetMember) {
          return {
            ...record,
            allMeetings: [...record.allMeetings, meetingData],
          };
        }
      }

      return record;
    });

    const updatedLoggedInUserMeetingRecord = updatedRecords.find(
      (record) => record.userId === user?.id
    );

    setAllMeetingRecords(updatedRecords);
    dispatch(setLoggedInUserMeetingRecord(updatedLoggedInUserMeetingRecord));

    return updatedRecords;
  };

  const updateExistingMembersMeetingData = async (updatedRecords: any[]) => {
    await Promise.all(
      updatedRecords
        .filter((record) =>
          selectedMeetingMembers.some((member) => member.id === record.userId)
        )
        .map((record) => PortalSdk.putData(`/api/user/zeros`, { data: record }))
    );
  };

  const createNewMembersMeetingRecord = async (meetingData: any) => {
    const newMembers = selectedMeetingMembers.filter(
      (member) =>
        !allMeetingRecords.some((record) => record.userId === member.id)
    );

    const newRecords = newMembers.map((member) => ({
      userId: member.id,
      year: new Date().getFullYear().toString(),
      config: "meeting",
      allMeetings: [meetingData],
    }));

    const response = await Promise.all(
      newRecords.map((record) =>
        PortalSdk.putData(`/api/user/zeros`, { data: record })
      )
    );

    setAllMeetingRecords([
      ...allMeetingRecords,
      ...(response.length > 0 ? response.map((data) => data.zeroRecords) : []),
    ]);
  };

  const deleteRemovedMembersMeetingData = async (
    updatedRecords: ZeroRecords[]
  ) => {
    const meetingToRemoveFromRecords = allMeetingRecords.filter((record) =>
      removedUsers.some((id) => id === record.userId)
    );

    const updatedRecordsToRemove = meetingToRemoveFromRecords.map((record) => {
      record.allMeetings = record.allMeetings?.filter(
        (meeting) => (meeting as any)?.id !== meetingToUpdate?.id
      );
      return record;
    });
    await Promise.all(
      updatedRecordsToRemove.map((record) =>
        PortalSdk.putData(`/api/user/zeros`, { data: record })
      )
    );
  };
  return (
    <div className="absolute z-10 top-0 left-0 w-full h-full bg-white flex flex-col justify-center items-center">
      <form
        className="flex flex-col gap-10 w-full"
        onSubmit={handleMeetingFormSubmit}
      >
        <input
          type="text"
          name="meeting_title"
          id="meeting_title"
          value={meetingTitle}
          onChange={(e) => {
            setMeetingTitle(e.target.value);
          }}
          placeholder="Enter meeting title"
          className="w-full py-4 border-b border-b-neutral-200  focus:border-b-neutral-900 outline-none transition-all"
        />
        <input
          type="date"
          name="meeting_date"
          value={
            meetingDate !== ""
              ? meetingDate
              : meetingToUpdate
              ? meetingToUpdate.date
              : new Date().toISOString().split("T")[0]
          }
          onChange={(e) => {
            setMeetingDate(e.target.value);
          }}
          id="meeting_date"
          placeholder="Enter meeting date"
          className="w-full py-4 border-b border-b-neutral-200  focus:border-b-neutral-900 outline-none transition-all"
        />
        <div className="relative">
          <input
            type="text"
            name="members"
            id="members"
            placeholder="Add members"
            className="w-full py-4 border-b border-b-neutral-200  focus:border-b-neutral-900 outline-none transition-all "
            value={typedUser}
            onChange={(e) => {
              setShowDropdown(e.target.value.trim().length > 0);
              setTypedUser(e.target.value);
            }}
          />
          {showDropdown && (
            <div className="border border-[#B4B4B4] p-2 absolute left-0 right-0 shadow-lg overflow-y-auto z-10 bg-white gap-[-0.5rem] ">
              {allUsers
                .filter((user: User) => {
                  if (typedUser && !selectedMeetingMembers.includes(user)) {
                    return (
                      user.name
                        ?.toLowerCase()
                        .includes(typedUser.toLowerCase()) ||
                      user.email
                        ?.toLowerCase()
                        .includes(typedUser.toLowerCase())
                    );
                  }
                })
                .map((user: User) => (
                  <div
                    key={user?.id}
                    onClick={() => {
                      setSelectedMeetingMembers((prev) => [...prev, user]);

                      setRemovedUsers((prev) =>
                        prev.filter((id) => id !== user.id)
                      );
                      setTypedUser("");
                      setShowDropdown(false);
                    }}
                    className=""
                  >
                    <span className="h-[2rem] flex items-center p-2 hover:bg-[#D9D9D9] my-[2px] rounded-sm cursor-pointer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={user.avatar as string}
                        alt={user.name as string}
                        height={20}
                        width={20}
                      />
                      &nbsp;
                      {user.name}
                    </span>
                  </div>
                ))}
            </div>
          )}
          <div className="mt-4">
            <span className="text-xs  text text-neutral-400">
              Added Members
            </span>
            <div className=" py-2 overflow-y-auto z-10 bg-white gap-[-0.5rem] ">
              {selectedMeetingMembers.map((user: User) => (
                <div
                  key={user?.id}
                  className="flex items-center p-2 hover:bg-[#D9D9D9] my-[2px] rounded-sm cursor-pointer"
                  onClick={() => {
                    setSelectedMeetingMembers((prev) =>
                      prev.filter((u) => u.id !== user.id)
                    );
                    setRemovedUsers((prev) => {
                      if (
                        meetingToUpdate.members.find(
                          (u: User) => u.id === user.id
                        )
                      ) {
                        return [...prev, user.id];
                      } else return prev;
                    });
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.avatar as string}
                    alt={user.name as string}
                    height={20}
                    width={20}
                  />
                  &nbsp;
                  {user.name}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <button
            type="submit"
            disabled={isSaving || isDeleting}
            className={`${isSaving|| isDeleting ? 'bg-neutral-300' : 'bg-blue-500'} font-bold text-white px-6 py-3 rounded-md flex flex-row items-center justify-center gap-1 text-[0.7em]`}
          >
            {
              !isSaving &&
                <span className="icon_size material-symbols-outlined">
                  task_alt
                </span>
            }
            {
              isSaving &&
               <CircularLoader/>
            }
            <span className="uppercase tracking-[0.2em]">Save</span>
          </button>
          {meetingToUpdate && (
            <button
              type="button"
              disabled={isSaving || isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteMeeting(meetingToUpdate);
              }}
              className={`${isSaving|| isDeleting ? 'bg-neutral-300' : 'bg-red-400'} font-bold text-white px-6 py-3 rounded-md flex flex-row items-center justify-center gap-1 text-[0.7em]`}
            >
            {
              isDeleting &&
               <CircularLoader/>
            }
            {
              !isDeleting &&
                <span className="icon_size material-symbols-outlined">
                  delete
                </span>
            }

              <span className="uppercase tracking-[0.2em]">Delete</span>
            </button>
          )}
          <button
            type="button"
            disabled={isSaving || isDeleting}
            onClick={(e) => {
              e.preventDefault();
              setIsMeetingModalOpen(false);
            }}
            className={`${isSaving|| isDeleting ? 'bg-neutral-300 text-white' : 'bg-neutral-100 text-neutral-900'} font-bold  px-6 py-3 rounded-md flex flex-row items-center justify-center gap-1 text-[0.7em]`}
          >
            <span className="icon_size material-symbols-outlined  ">
              cancel
            </span>
            <span className="uppercase tracking-[0.2em]">Cancel</span>
          </button>
        </div>
      </form>
    </div>
  );
};
