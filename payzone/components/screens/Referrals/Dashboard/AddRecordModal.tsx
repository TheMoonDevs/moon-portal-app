"use client";

import React, { useRef, useState } from "react";
import { CircularProgress, Modal } from "@mui/material";
import { MyServerApi } from "@/utils/service/MyServerApi";
import useAsyncState from "@/utils/hooks/useAsyncState";
import Toast, { toastSeverity } from "./Toast";
import { User, UserReferrals } from "@prisma/client";
import { addReferralData } from "@/utils/redux/db/db.slice";
import { useAppDispatch } from "@/utils/redux/store";
import { Toaster, toast } from "sonner";

export interface ICreatedReferralData {
  data: { referral: UserReferrals };
}

export const statuses = [
  {
    label: "Select One",
    value: "",
  },
  {
    label: " Cold",
    value: "COLD",
  },
  {
    label: " Discovery",
    value: "DISCOVERY",
  },
  {
    label: " First Contact",
    value: "FIRST_CONTACT",
  },
  {
    label: " Trial Period",
    value: "TRIAL_PERIOD",
  },
  {
    label: " In Engagement",
    value: "IN_ENGAGEMENT",
  },
  {
    label: " Pay Overdue",
    value: "PAY_OVERDUE",
  },
  {
    label: " Finished",
    value: "FINISHED",
  },
];

interface IAddRecordModalProps {
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  users: User[];
}

const AddRecordModal = ({
  isModalOpen,
  setIsModalOpen,
  users,
}: IAddRecordModalProps) => {
  const { loading, setLoading } = useAsyncState();
  const [showDropdown, setShowDropdown] = useState(false);
  const dispatch = useAppDispatch();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  // const [toast, setToast] = useState<{
  //   message: string;
  //   severity: toastSeverity;
  // }>({
  //   message: "",
  //   severity: "success",
  // }); //state for toast message
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const filteredUsers = users.filter((user: any) =>
    user?.name?.toLowerCase().includes(referredBy?.toLowerCase())
  );

  const handleInputChange = (e: any) => {
    setReferredBy(e.target.value);
    setShowDropdown(e.target.value.trim().length > 0);
  };

  const handleSelect = (user: any) => {
    setReferredBy(user.name);
    setSelectedUser(user);
    setShowDropdown(false);
  };

  const formRef = useRef(null);
  const handleSubmitData = async () => {
    setLoading(true);

    const formData = formRef.current ? new FormData(formRef.current) : null;
    if (!formData) return;
    const referralName = formData.get("referralName") || "";
    const currentReferralStatus = formData.get("currentReferralStatus") || "";
    const engagementSpan = formData.get("engagementSpan") || "";
    const totalSpent = formData.get("totalSpent") || "";

    const formDataObject = {
      referralName,
      currentReferralStatus,
      engagementSpan,
      totalSpent: parseFloat(totalSpent.toString()),
    };
    try {
      const response = (await MyServerApi.addManualRecord({
        ...formDataObject,
        userId: selectedUser?.id,
      })) as ICreatedReferralData;

      // setToast({
      //   message: "Referral updated successfully",
      //   severity: "success",
      // });

      toast.success("Referral updated successfully");

      setLoading(false);
      setIsModalOpen(false);
      dispatch(addReferralData(response.data.referral));
    } catch (error) {
      // setToast({
      //   message: "Failed to update referral",
      //   severity: "error",
      // });
      toast.error("Failed to update referral");

      setLoading(false);
      setIsModalOpen(false);
    }
  };

  const handleClose = (event: any, reason: any) => {
    if (reason === "clickaway") {
      return;
    }
    // setToast((prevToast) => ({ ...prevToast, open: false }));
    toast.dismiss();
  };

  return (
    <div>
      <Modal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        aria-labelledby="referrals-modal"
        aria-describedby="referrals-modal"
      >
        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmitData();
          }}
          className=" p-5 bg-white text-black h-[500px] w-[500px] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        >
          <div className="my-2">
            <label className="block text-sm font-medium mb-2">
              Referral Name
            </label>
            <input
              name="referralName"
              type="text"
              className="outline-none border border-[#B4B4B4] w-full p-2"
              // value={formState.referralName}
              // onChange={handleFormChange}
              required
            />
          </div>
          <label className="block text-sm font-medium mb-2">Referred By</label>
          <input
            name="selectedUser"
            type="text"
            className="outline-none border border-[#B4B4B4] w-full p-2"
            value={referredBy || ""}
            onChange={handleInputChange}
            required
          />
          {showDropdown && (
            <div className="border border-[#B4B4B4] p-2 absolute left-0 right-0 shadow-lg overflow-y-auto z-10 bg-white w-full gap-[-0.5rem] ">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user: any) => (
                  <div
                    key={user.id}
                    onClick={() => handleSelect(user)}
                    className=""
                  >
                    <span className="h-[2rem] bg-gray flex items-center  bg-[#E0E0E0] p-2 hover:bg-[#D9D9D9] my-[2px] rounded-sm cursor-pointer">
                      {user.name}
                    </span>
                  </div>
                ))
              ) : (
                <div>No users found</div>
              )}
            </div>
          )}
          <div className="my-2">
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              name="currentReferralStatus"
              className="outline-none border border-[#B4B4B4] w-full p-2"
              // value={formState.currentReferralStatus}
              // onChange={handleFormChange}
              required
            >
              {statuses.map((status, index) => (
                <option key={`${index}-${status.label}`} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="my-2">
            <label className="block text-sm font-medium mb-2">
              Engagement Span
            </label>
            <input
              name="engagementSpan"
              type="text"
              className="outline-none border border-[#B4B4B4] w-full p-2"
              // value={formState.engagementSpan}
              // onChange={handleFormChange}
              required
            />
          </div>
          <div className="my-2">
            <label className="block text-sm font-medium mb-2">
              Total Spent
            </label>
            <input
              name="totalSpent"
              type="number"
              className="outline-none border border-[#B4B4B4] w-full p-2"
              onWheel={(e) => e.currentTarget.blur()}
              // value={formState.totalSpent}
              // onChange={handleFormChange}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="text-black font-semibold text-sm border border-[#B4B4B4] px-2 py-1 hover:bg-[#e0e0e0 absolute bottom-10 left-[50%] translate-x-[-50%]"
          >
            {loading ? (
              <div className="flex justify-center items-center gap-2">
                <CircularProgress size={20} color="inherit" />
                <span>Saving...</span>
              </div>
            ) : (
              "Add new manual record"
            )}
          </button>
        </form>
      </Modal>
      {/* <Toaster message={toast.message} severity={toast.severity} /> */}
    </div>
  );
};

export default AddRecordModal;
