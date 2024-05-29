import { MyServerApi } from "@/utils/service/MyServerApi";
import { Avatar, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { toastSeverity } from "../Toast";
import { User, UserReferrals } from "@prisma/client";
import { statuses } from "../AddRecordModal";
// import { updateReferralData } from "@/utils/redux/db/db.slice";
// import { useAppDispatch } from "@/utils/redux/store";
import useAsyncState from "@/utils/hooks/useAsyncState";

interface IReferralAdminTableProps {
  fetchedReferralData: any[];
  setToast: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      message: string;
      severity: toastSeverity;
    }>
  >;
  allUsers: User[];
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  user: User | undefined | null;
}

interface IUpdatedReferralData {
  data: {
    updatedReferral: UserReferrals;
  };
}

const tableHeadings = [
  "Name",
  "Status",
  "Engagement Span",
  "Total Spent",
  "Ref Earn (20%)",
  "Referral",
  "Actions",
];

export const ReferralAdminTable = ({
  fetchedReferralData,
  setToast,
  allUsers,
  setIsModalOpen,
  user,
}: IReferralAdminTableProps) => {
  const { loading, setLoading } = useAsyncState();

  // const [updatedRecords, setUpdatedRecords] = useState<any>({}); //state for updating referrals
  const [editableFields, setEditableFields] = useState<Record<string, any>>({});
  const [currentReferralId, setCurrentReferralId] = useState<string | null>(
    null
  );
  // const dispatch = useAppDispatch();

  useEffect(() => {
    const initialFields = fetchedReferralData.reduce((acc, referral) => {
      acc[referral.id] = referral;
      return acc;
    }, {});
    setEditableFields(initialFields);
  }, [fetchedReferralData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
    id: string,
    field: string
  ) => {
    const updatedFields = {
      ...editableFields,
      [id]: {
        ...editableFields[id],
        [field]: e.target.value,
      },
    };
    setEditableFields(updatedFields);
    // setUpdatedRecords({
    //   ...updatedRecords,
    //   [id]: {
    //     ...updatedRecords[id],
    //     [field]: e.target.value,
    //   },
    // });
  };

  const handleUpdateClick = async (id: string) => {
    // console.log(updatedRecords[id]);
    setLoading(true);
    setCurrentReferralId(id);

    try {
      const updatedData = {
        id,
        ...editableFields[id],
        totalSpent: Number(editableFields[id].totalSpent),
      };
      const response = (await MyServerApi.updateReferral(
        updatedData
      )) as IUpdatedReferralData;
      setEditableFields((prevFields) => ({
        ...prevFields,
        [id]: response.data.updatedReferral,
      }));
      // dispatch(updateReferralData(response.data.updatedReferral));
      setToast({
        open: true,
        message: "Referral updated successfully",
        severity: "success",
      });
      setLoading(false);
    } catch (error) {
      console.error(error);
      setEditableFields((prevFields) => {
        return { ...prevFields };
      });
      setToast({
        open: true,
        message: "Failed to update referral",
        severity: "error",
      });
      setLoading(false);
    }
  };

  return (
    <div className=" w-full bg-[#F3F3F3] mt-6 p-4">
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-col">
          <span className="font-semibold text-2xl tracking-[0.2rem] text-black">
            All Referrals
          </span>
          <span className="text-[1rem] text-black font-thin mt-3">
            Referral link -- https://themoondevs.com?ref={user?.id}
          </span>
        </div>
        <button
          className="text-black font-semibold text-[1rem] border border-[#B4B4B4] px-4 py-2 hover:bg-[#e0e0e0]"
          onClick={() => setIsModalOpen(true)}
        >
          Add new manual record
        </button>
      </div>
      <table className="w-full mt-5">
        <thead className="border-b border-midGrey w-full">
          <tr className=" w-full bg-neutral-100 rounded-lg divide-x-2">
            {tableHeadings.map((heading) => (
              <th
                key={heading}
                className="text-md font-semibold text-neutral-800 text-left p-2 pl-4 tracking-[1px]"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fetchedReferralData.map((referral) => (
            <tr
              key={referral.id}
              className="border-b-2 border-neutral-200 w-full divide-x-2"
            >
              <td className="text-sm p-2 pl-4">
                <input
                  className="w-full  outline-none border boder-black bg-transparent
            "
                  type="text"
                  value={editableFields[referral.id]?.referralName || ""}
                  onChange={(e) =>
                    handleInputChange(e, referral.id, "referralName")
                  }
                />
              </td>
              <td className="text-sm p-2">
                <select
                  value={
                    editableFields[referral.id]?.currentReferralStatus || ""
                  }
                  onChange={(e) =>
                    handleInputChange(e, referral.id, "currentReferralStatus")
                  }
                  className="w-full  outline-none border boder-black bg-transparent"
                >
                  {statuses.map((status, index) => (
                    <option
                      key={`${index}-${status.label}`}
                      value={status.value}
                    >
                      {status.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="text-sm p-2">
                <input
                  className="w-full  outline-none border boder-black bg-transparent"
                  type="text"
                  value={editableFields[referral.id]?.engagementSpan || ""}
                  onChange={(e) =>
                    handleInputChange(e, referral.id, "engagementSpan")
                  }
                />
              </td>
              <td className="text-sm p-2">
                <input
                  className="w-full  outline-none border boder-black bg-transparent"
                  type="number"
                  value={editableFields[referral.id]?.totalSpent || ""}
                  onChange={(e) => {
                    handleInputChange(e, referral.id, "totalSpent");
                  }}
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </td>
              <td className="text-sm p-2">{referral?.totalSpent * 0.2}</td>
              <td className="text-sm p-2 flex items-center justify-start gap-2">
                <Avatar
                  alt=""
                  src={
                    allUsers.find((user) => user?.id === referral?.userId)
                      ?.avatar || ""
                  }
                  sx={{ width: 24, height: 24 }}
                />
                <span>
                  {allUsers.find((user) => user?.id === referral?.userId)?.name}
                </span>
              </td>
              <td className="text-sm p-2">
                <button
                  className="text-black font-semibold border border-[#B4B4B4] px-2 py-1 hover:bg-[#e0e0e0]"
                  onClick={() => handleUpdateClick(referral.id)}
                >
                  {loading && currentReferralId === referral.id ? (
                    <div className="flex justify-center items-center gap-2">
                      <CircularProgress size={20} color="inherit" />
                      <span>Saving...</span>
                    </div>
                  ) : (
                    "Update Record"
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
