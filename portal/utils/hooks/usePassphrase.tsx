import { useState, useEffect } from "react";
import { hashPassphrase } from "@/utils/privacy/hashing";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { useUser } from "@/utils/hooks/useUser";
import { LOCAL_STORAGE } from "../constants/appInfo";

export const usePassphrase = () => {
  const { user, refetchUser } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"set" | "verify">("set");
  const [localPassphrase, setLocalPassphrase] = useState<string | null>(null);

  useEffect(() => {
    const storedPassphrase = localStorage.getItem("local_passphrase");
    if (storedPassphrase) {
      setLocalPassphrase(storedPassphrase);
    } else if (user?.passphrase) {
      setModalMode("verify");
      setShowModal(true);
    } else {
      setModalMode("set");
      setShowModal(true);
    }
  }, [user]);

  const updateUserPassphrase = async (
    userId: string,
    doubleHashedPassphrase: string
  ) => {
    try {
      await PortalSdk.putData("/api/user/", {
        id: userId,
        passphrase: doubleHashedPassphrase,
      });
      console.log("Passphrase updated successfully in the database");
      refetchUser(); // Update local storage and Redux store
    } catch (error) {
      console.error("Error updating passphrase:", error);
      throw error;
    }
  };

  const handleSetPassphrase = async (passphrase: string) => {
    const { hash: localHash } = hashPassphrase(passphrase);
    localStorage.setItem(LOCAL_STORAGE.passphrase, localHash);
    setLocalPassphrase(localHash);

    const { hash: dbHash } = hashPassphrase(localHash); // Double hashing for storage

    if (user?.id) {
      try {
        await updateUserPassphrase(user.id, dbHash);
        setShowModal(false);
      } catch (error) {
        // Handle error (e.g., show error message to user)
        console.error("Failed to set passphrase:", error);
      }
    } else {
      console.error("User ID is not available");
    }
  };

  const handleVerifyPassphrase = async (passphrase: string) => {
    const { hash: localHash } = hashPassphrase(passphrase);
    const { hash: dbHash } = hashPassphrase(localHash);

    if (dbHash === user?.passphrase) {
      localStorage.setItem(LOCAL_STORAGE.passphrase, localHash);
      setLocalPassphrase(localHash);
      setShowModal(false);
    } else {
      // Handle incorrect passphrase
      alert("Incorrect passphrase. Please try again.");
    }
  };

  return {
    showModal,
    setShowModal,
    modalMode,
    localPassphrase,
    handleSetPassphrase,
    handleVerifyPassphrase,
  };
};
