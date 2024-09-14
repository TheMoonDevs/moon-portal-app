import { useState, useEffect } from "react";
import { hashPassphrase } from "@/utils/security/hashing";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { useUser } from "@/utils/hooks/useUser";
import { LOCAL_STORAGE } from "../constants/appInfo";
import { toast } from "sonner";

export const usePassphrase = () => {
  const { user, refetchUser } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"set" | "verify">("set");
  const [localPassphrase, setLocalPassphrase] = useState<string | null>(null);

  useEffect(() => {
    try {
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
    } catch (error) {
      toast.error("Error retrieving passphrase from local storage.");
      console.error("Error retrieving passphrase from local storage:", error);
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
      refetchUser();
    } catch (error) {
      toast.error("Error updating passphrase in the database.");
      console.error("Error updating passphrase in the database:", error);
      throw error;
    }
  };

  const handleSetPassphrase = async (passphrase: string) => {
    try {
      const { hash: localHash } = hashPassphrase(passphrase);
      localStorage.setItem(LOCAL_STORAGE.passphrase, localHash);
      setLocalPassphrase(localHash);

      const { hash: dbHash } = hashPassphrase(localHash);

      if (user?.id) {
        await updateUserPassphrase(user.id, dbHash);
        setShowModal(false);
        toast.success("Passphrase set successfully.");
      } else {
        toast.error("User ID is not available.");
        console.error("User ID is not available.");
      }
    } catch (error) {
      toast.error("Failed to set passphrase.");
      console.error("Failed to set passphrase:", error);
    }
  };

  const handleVerifyPassphrase = async (passphrase: string) => {
    try {
      const { hash: localHash } = hashPassphrase(passphrase);
      const { hash: dbHash } = hashPassphrase(localHash);

      if (dbHash === user?.passphrase) {
        localStorage.setItem(LOCAL_STORAGE.passphrase, localHash);
        setLocalPassphrase(localHash);
        toast.success("Passphrase verified successfully.");
        setShowModal(false);
      } else {
        toast.error("Incorrect passphrase. Please try again.");
        console.error("Incorrect passphrase. Please try again.");
      }
    } catch (error) {
      toast.error("Error verifying passphrase.");
      console.error("Error verifying passphrase:", error);
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
