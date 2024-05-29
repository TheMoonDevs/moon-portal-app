"use client";

import { useUser } from "@/utils/hooks/useUser";
import dayjs, { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { User, ZeroRecords } from "@prisma/client";
import CalendarView from "./CalendarView";
import { ZeroTrackerHeader } from "./ZeroTrackerHeader";
import { Meeting } from "./Meeting/Meeting";
import { setLoggedInUserMeetingRecord } from "@/utils/redux/zerotracker/zerotracker.slice";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { ZeroMarkerSection } from "./ZeroMarkerSection";
import { Zeros } from "./Zeros/Zeros";
import { ThisMonthSection } from "./ThisMonthSection";
import { MeetingButton } from "./MeetingButton";

const dayjsLib = dayjs();
export type TrackerMode = "leave" | "zero" | "meeting" | "normal" | "extra";
export const ZeroTrackerPage = () => {
  const { user } = useUser(false);
  const [currentMonthDayjs, setCurrentMonthDayJs] = useState<Dayjs>(
    dayjs().month(dayjsLib.month())
  );
  const [zeroUsers, setZeroUsers] = useState<any>([]);
  const [zeroRecord, setZeroRecord] = useState<ZeroRecords | null>(null);
  const [trackerMode, setTrackerMode] = useState<TrackerMode>("normal");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [meetingDate, setMeetingDate] = useState<string>(
    dayjsLib.format("YYYY-MM-DD")
  );
  const dispatch = useAppDispatch();
  const loggedInUserMeetingRecord = useAppSelector(
    (state) => state.zerotracker.loggedInUserMeetingRecord
  );
  useEffect(() => {
    if (!user) return;
    PortalSdk.getData(
      `/api/user/zeros?userId=${user?.id}&userType=${
        user.userType
      }&config=meeting&year=${dayjsLib.year()}`,
      null
    )
      .then(({ data }) => {
        dispatch(setLoggedInUserMeetingRecord(data.zeroRecords[0]));
      })
      .catch((error) => {
        console.error(error);
      });
  }, [dispatch, user]);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    PortalSdk.getData(
      `/api/user/zeros?userId=${user?.id}&config=zero&year=${dayjsLib.year()}`,
      null
    )
      .then(({ data }) => {
        //console.log(data);
        if (data?.zeroRecords?.length === 0 || !data?.zeroRecords) {
          setZeroRecord({
            id: "",
            userId: user.id,
            year: dayjsLib.year().toString(),
            config: "zero",
            allZeros: [],
            allMeetings: [],
          } as ZeroRecords);
          setIsLoading(false);
          return;
        }
        setZeroRecord(data.zeroRecords[0]);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setIsLoading(false);
      });
    Promise.all([
      PortalSdk.getData(
        `/api/user/zeros?year=${dayjsLib.year()}&config=zero`,
        null
      ),
      PortalSdk.getData(`/api/user?userType=${user.userType}`, null),
    ])
      .then((responses) => {
        console.log(responses);
        const all_zeros: ZeroRecords[] = responses[0].data.zeroRecords;
        // setAllZeroRecords(all_zeros);
        const all_users: User[] = responses[1].data.user;
        setAllUsers(all_users);
        const days_zeros = all_zeros.flatMap((z) => [
          ...z.allZeros.map((a_zero: any) => ({
            ...a_zero,
            userId: z.userId,
            user: all_users.find((u) => u.id === z.userId),
            year: z.year,
            config: z.config,
          })),
        ]);
        let zeros_filtered: any[] = [];
        days_zeros.forEach((a_zero) => {
          if (zeros_filtered.find((z) => z.date === a_zero.date)) {
            zeros_filtered = zeros_filtered.map((z) => {
              return z.date === a_zero.date
                ? { ...z, users: [...z.users, a_zero.user] }
                : z;
            });
          } else {
            zeros_filtered.push({
              ...a_zero,
              users: [a_zero.user],
            });
          }
        });
        // console.log(days_zeros, zeros_filtered);
        setZeroUsers(zeros_filtered);
        //setUser(response[1].data);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [user]);

  const updateDates = () => {
    let _newTypeZeros = [...selectedDates];
    const _zeros = zeroRecord?.allZeros
      ? zeroRecord.allZeros?.filter((a_zero: any) => {
          return a_zero.type !== trackerMode;
        })
      : [];
    const type_zeros = zeroRecord?.allZeros
      ? zeroRecord.allZeros?.filter((a_zero: any) => {
          return (
            a_zero.type === trackerMode && _newTypeZeros.includes(a_zero.date)
          );
        })
      : [];
    _newTypeZeros = _newTypeZeros.filter((date) => {
      return !type_zeros.find((a_zero: any) => a_zero.date === date);
    });
    _zeros.push(
      ...type_zeros,
      ..._newTypeZeros.map((date) => ({ date, type: trackerMode }))
    );
    const _zeroRecord = {
      ...zeroRecord,
      year: dayjsLib.format("YYYY"),
      userId: user?.id,
      allZeros: _zeros,
    };
    //console.log("final zeros record", _zeroRecord);
    setTrackerMode("normal");
    setSelectedDates([]);
    PortalSdk.putData(`/api/user/zeros`, { data: _zeroRecord })
      .then(({ data }) => {
        //console.log(data);
        if (!data?.zeroRecords) return;
        setZeroRecord(data.zeroRecords);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const handleZeroMarkerButtonClick = () => {
    setTrackerMode("zero");
    setSelectedDates(
      zeroRecord?.allZeros
        ?.filter((a_zero: any) => a_zero.type === "zero")
        .map((a_zero: any) => a_zero.date) || []
    );
  };

  const handleZeroDateClick = (date: string) => {
    if (dayjs(date).isBefore(_today, "date")) return;
    setSelectedDates((_dates) => _dates.filter((a_date) => a_date !== date));
  };

  const handleMeetingButtonClick = () => {
    setTrackerMode("meeting");
    setSelectedDates(
      loggedInUserMeetingRecord?.allMeetings?.map(
        (a_zero: any) => a_zero.date
      ) || []
    );
  };
  // TO-DO : need to enable as a fail-safe for must-adding workData.
  //if (!user?.workData) return null;

  // const today = new Date();
  const _today = currentMonthDayjs;
  const totalWorkingDays = Array.from({
    length: currentMonthDayjs.daysInMonth(),
  }).filter((_, index) => {
    const date = currentMonthDayjs.date(index + 1);
    return date.day() !== 0 && date.day() !== 6;
  }).length;
  const totalZeros = zeroRecord?.allZeros?.filter(
    (a_zero: any) => a_zero.type === "zero"
  ).length;
  const totalExtraWork = zeroRecord?.allZeros?.filter(
    (a_zero: any) => a_zero.type === "extra"
  ).length;
  const totalLeaves = zeroRecord?.allZeros?.filter(
    (a_zero: any) => a_zero.type === "leave"
  ).length;
  const stipendPercentage =
    totalExtraWork &&
    totalLeaves &&
    (((totalExtraWork - totalLeaves) * 100) / totalWorkingDays).toFixed(1);
  const zeroUsage = totalZeros && ((totalZeros / 30) * 100).toFixed(0);

  return (
    <div className="flex flex-col">
      <ZeroTrackerHeader
        currentMonthDayjs={currentMonthDayjs}
        setCurrentMonthDayJs={setCurrentMonthDayJs}
        dayjs={dayjs}
      />
      <div className="w-4/5 mx-auto max-w-[400px] m-auto my-1 max-md:w-full relative ">
        {!isLoading && (
          <CalendarView
            currentMonthDayjs={currentMonthDayjs}
            zeroRecord={zeroRecord}
            selectedDates={selectedDates}
            setSelectedDates={setSelectedDates}
            trackerMode={trackerMode}
            setTrackerMode={setTrackerMode}
            setMeetingDate={setMeetingDate}
            meetingDate={meetingDate}
          />
        )}
        {isLoading && (
          <div className="flex flex-row items-center justify-center gap-2 h-[400px]">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-neutral-800"></div>
            <p className="text-neutral-900">Initialising...</p>
          </div>
        )}
        {!isLoading && trackerMode === "normal" && (
          <>
            <ZeroMarkerSection
              zeroRecord={zeroRecord}
              handleZeroMarkerButtonClick={handleZeroMarkerButtonClick}
              zeroUsage={zeroUsage}
            />
            <MeetingButton
              handleMeetingButtonClick={handleMeetingButtonClick}
            />
            <ThisMonthSection
              currentMonthDayjs={currentMonthDayjs}
              zeroUsers={zeroUsers}
            />
          </>
        )}
        {!isLoading && trackerMode === "normal" && (
          <div className="flex flex-row justify-between w-full py-2 px-3 gap-2">
            {/* <div className="h-[175px] flex-1 flex flex-col items-start justify-start gap-1 p-4 rounded-[0.75em] bg-neutral-100 text-neutral-900">
            <p className="text-[0.7em] text-neutral-500 leading-none tracking-[0.2em] ">
              {" "}
              THIS MONTH
            </p>
            <div></div>
          </div> */}
            <div className="flex flex-col gap-2">
              {/* <div
              onClick={() => {
                //console.log("leave", zeroRecord);
                setTrackerMode("leave");
                setSelectedDates(
                  zeroRecord?.allZeros
                    ?.filter((a_zero: any) => a_zero.type === "leave")
                    .map((a_zero: any) => a_zero.date) || []
                );
              }}
              className="flex flex-row items-center justify-between gap-1 p-4 rounded-[0.75em] overflow-hidden bg-red-500 text-neutral-100"
            >
              <p className="text-[0.7em] font-bold tracking-[0.2em] ">
                {" "}
                LEAVE MARKER
              </p>
              <span className="icon_size material-icons">
                add_circle_outline
              </span>
            </div> */}

              {/* <div
              onClick={() => {
                // setTrackerMode("extra");
                // setSelectedDates(
                //   zeroRecord?.allZeros
                //     ?.filter((a_zero: any) => a_zero.type === "extra")
                //     .map((a_zero: any) => a_zero.date) || []
                // );
              }}
              className="flex flex-row items-center justify-between gap-1 p-4 rounded-[0.75em] overflow-hidden bg-green-500 text-neutral-100"
            >
              <p className="text-[0.7em] font-bold tracking-[0.2em] ">
                {" "}
                EXTRA WORK
              </p>
              <span className="icon_size material-icons">
                add_circle_outline
              </span>
            </div> */}
            </div>
          </div>
        )}

        {trackerMode === "leave" && (
          <div className="flex flex-col justify-between w-full p-4 gap-2">
            <div className="flex flex-row items-center justify-start gap-1  overflow-hidden text-neutral-900">
              <p className="text-[1.5em] font-bold  ">
                {" "}
                Select your Leaves in Calendar
              </p>
              {/* <span className="icon_size material-icons">ios_arrow_forward</span> */}
            </div>
            <p className="text-[0.7em] text-neutral-500 leading-none ">
              Note that leaves will cause a deduction in your stipend.
            </p>
            <div className="flex flex-row items-center justify-start gap-1 my-2">
              {selectedDates.map((date, index) => (
                <div
                  key={index}
                  className="flex flex-row items-center justify-center gap-1 p-2 rounded-[0.75em] bg-white-500 border border-red-500 text-neutral-900"
                >
                  <p className="text-[0.7em] font-bold tracking-[0.2em] ">
                    {" "}
                    {dayjs(date).format("DD")}
                  </p>
                  <span
                    onClick={() => {
                      if (dayjs(date).isBefore(_today, "date")) return;
                      setSelectedDates((_dates) =>
                        _dates.filter((a_date) => a_date !== date)
                      );
                    }}
                    className="icon_size material-icons"
                  >
                    close
                  </span>
                </div>
              ))}
            </div>
            <div className="flex flex-row gap-2">
              <div
                onClick={() => setTrackerMode("normal")}
                className="flex-1 flex-grow flex flex-row items-center justify-start gap-1 p-4 rounded-[0.75em] bg-neutral-100 text-neutral-900"
              >
                <span className="icon_size material-symbols-outlined">
                  arrow_back
                </span>
                <p className="text-[0.7em] whitespace-nowrap font-bold tracking-[0.2em] ">
                  {" "}
                  BACK
                </p>
              </div>
              <div
                onClick={updateDates}
                className="flex-1 flex-grow flex flex-row items-center justify-start gap-1 p-4 rounded-[0.75em] bg-red-500 text-neutral-100"
              >
                <p className="text-[0.7em] whitespace-nowrap font-bold tracking-[0.2em] ">
                  {" "}
                  SAVE CHANGES
                </p>
                <span className="icon_size material-icons">task_alt</span>
              </div>
            </div>
          </div>
        )}
        {trackerMode === "zero" && (
          <Zeros
            currentMonthDayjs={currentMonthDayjs}
            handleZeroDateClick={handleZeroDateClick}
            selectedDates={selectedDates}
            setTrackerMode={setTrackerMode}
            updateDates={updateDates}
          />
        )}

        {trackerMode === "meeting" && (
          <Meeting
            allUsers={allUsers}
            meetingDate={meetingDate}
            setMeetingDate={setMeetingDate}
            setTrackerMode={setTrackerMode}
          />
        )}
      </div>
    </div>
  );
};
