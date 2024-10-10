import { useState, useEffect } from "react";
import {
  hashPassphrase,
  generateRandomPassphrase,
} from "@/utils/security/hashing";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { useUser } from "@/utils/hooks/useUser";
import { LOCAL_STORAGE } from "../constants/appInfo";
import { toast } from "sonner";

export const usePassphrase = () => {
  const { user, refetchUser } = useUser();
  const [localPassphrase, setLocalPassphrase] = useState<string | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);

  useEffect(() => {
    try {
      const storedPassphrase = localStorage.getItem(LOCAL_STORAGE.passphrase);
      if (storedPassphrase) {
        setLocalPassphrase(storedPassphrase);
      } else if (!user?.passphrase) {
        handleGeneratePassphrase();
      } else {
        setLocalPassphrase("");
      }
    } catch (error) {
      toast.error("Error retrieving passphrase from local storage.");
      console.error("Error retrieving passphrase from local storage:", error);
    }
  }, [user]);

  const updateUserPassphrase = async (
    userId: string,
    hashedPassphrase: string
  ) => {
    try {
      await PortalSdk.putData("/api/user/", {
        id: userId,
        passphrase: hashedPassphrase,
      });
      // console.log("Passphrase updated successfully in the database");
      refetchUser();
    } catch (error) {
      toast.error("Error updating passphrase in the database.");
      console.error("Error updating passphrase in the database:", error);
      throw error;
    }
  };

  const handleGeneratePassphrase = async () => {
    try {
      const newPassphrase = generateRandomPassphrase(16);
      localStorage.setItem(LOCAL_STORAGE.passphrase, newPassphrase);
      setLocalPassphrase(newPassphrase);

      const { hash: dbHash } = hashPassphrase(newPassphrase);
      if (user?.id) {
        await updateUserPassphrase(user.id, dbHash);
        toast.success("Passphrase generated.");
      } else {
        toast.error("User ID is not available.");
      }
    } catch (error: any) {
      toast.error("Failed to generate and set passphrase.", error.message);
    }
  };

  const verifyPassphrase = async (passphrase: string) => {
    try {
      const { hash: dbHash } = hashPassphrase(passphrase);
      if (dbHash === user?.passphrase) {
        setLocalPassphrase(passphrase);
        await refetchUser();
        localStorage.setItem(LOCAL_STORAGE.passphrase, passphrase);
        setShowVerifyModal(false);
        toast.success("Passphrase verified.");
      }
    } catch (error: any) {
      toast.error("Wrong passphrase.");
      console.error("Error verifying passphrase:", error.message);
    }
  };

  const handleResetPassphrase = async () => {
    const userId = user?.id;
    if (!userId) return;
    try {
      toast.info("Resetting private logs");
      const query = `?logType=privateWorklogs&userId=${userId}`;
      const data = await PortalSdk.deleteData(
        `/api/user/worklogs/private${query}`,
        null
      );
      if (data.success) {
        toast.info("Creating new passphrase");
        handleGeneratePassphrase();
      }
    } catch (error: any) {
      toast.error("Error while resetting your private logs.");
      console.error(error.message);
    }
  };

  return {
    localPassphrase,
    verifyPassphrase,
    showVerifyModal,
    setShowVerifyModal,
    setLocalPassphrase,
    handleResetPassphrase,
  };
};
