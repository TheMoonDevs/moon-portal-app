import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePassphrase } from "@/utils/hooks/usePassphrase";
import { Modal, Box, Typography, Button, TextField } from "@mui/material";
import { Lock, Unlock } from "lucide-react";

export const PassphraseVerification = () => {
  const [isResetModalOpen, setResetModalOpen] = useState<boolean>(false);
  const [passphraseInput, setPassphraseInput] = useState("");
  const [confirmInput, setConfirmInput] = useState("");
  const {
    showVerifyModal,
    setShowVerifyModal,
    verifyPassphrase,
    handleResetPassphrase,
    localPassphrase,
  } = usePassphrase();
  // Handle passphrase verification
  const handleVerify = () => {
    toast.info("Verifying passphrase");
    verifyPassphrase(passphraseInput);
  };

  // Handle passphrase reset confirmation
  const handleConfirmReset = () => {
    if (confirmInput === "CONFIRM") {
      handleResetPassphrase();
    } else {
      toast.error("You must type CONFIRM to reset.");
    }
  };

  useEffect(() => {
    if (localPassphrase) {
      setPassphraseInput("");
      setConfirmInput("");
      setShowVerifyModal(false);
      setResetModalOpen(false);
    }
  }, [localPassphrase]);

  return (
    <>
      {/* Warning message */}
      <div className="absolute top-0 flex h-full w-[95%] justify-center items-center">
      <button
  className="flex justify-center text-xl font-semibold relative group outline-none"
  onClick={() => setShowVerifyModal(true)}
>
  <span>
    <span className="absolute transition-opacity duration-200 opacity-100 group-hover:opacity-0">
      <Lock className="text-3xl"/>
    </span>
    <span className="absolute transition-opacity duration-200 opacity-0 group-hover:opacity-100">
      <Unlock />
    </span>
  </span>
</button>
      </div>

      {/* Verify Modal */}
      <Modal
        open={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        aria-labelledby="verify-modal-title"
        aria-describedby="verify-modal-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            borderRadius: 4,
            boxShadow: 24,
            display: "flex",
            px: 3,
            py: 2,
            flexDirection: "column",
            width: "400px",
          }}
        >
          <h1 className="text-lg font-semibold">Verify Passphrase</h1>
          <input
            type="password"
            placeholder="Enter passphrase"
            value={passphraseInput}
            onChange={(e) => setPassphraseInput(e.target.value)}
            className="outline-none border border-black rounded-2xl px-2 py-1 w-full h-12 my-3"
          />
          <div className="text-gray-500 mb-2 space-x-1">
            <span>
            Passphrase slipped your mind?
            </span>
            <button className="hover:text-black ml-1" onClick={()=>{
              setShowVerifyModal(false);
              setResetModalOpen(true)
            }}>Reset it here!</button>
          </div>
          <button
            className="bg-black text-white px-3 py-1 rounded-2xl border border-black  hover:bg-white hover:text-black transition-all w-fit"
            onClick={handleVerify}
          >
            Verify
          </button>
        </Box>
      </Modal>

      {/* Reset Modal */}
      <Modal
        open={isResetModalOpen}
        onClose={() => setResetModalOpen(false)}
        aria-labelledby="reset-modal-title"
        aria-describedby="reset-modal-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            borderRadius: 4,
            boxShadow: 24,
            display: "flex",
            px: 3,
            py: 2,
            flexDirection: "column",
            width: "400px",
          }}
        >
          <h1 className="text-lg font-semibold">Reset Passphrase</h1>
          <h1 className="text-sm text-red-600 font-semibold">
            To reset the passphrase, type "CONFIRM" in all caps:
          </h1>
          <input
            type="text"
            placeholder="CONFIRM"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            className="outline-none border border-black rounded-2xl px-2 py-1 w-full h-12 my-3"
          />
          <div className="text-gray-500 mb-2 -mt-1 space-x-1">
          <span>Protect your logs</span>
            <button className="hover:text-black" onClick={()=>{
              setResetModalOpen(false)
              setShowVerifyModal(true);
            }}>verify here!</button>
          </div>
          <button
            className="bg-black text-white px-3 py-1 rounded-2xl border border-black  hover:bg-white hover:text-black transition-all w-fit"
            onClick={handleConfirmReset}
          >
            Confirm Reset
          </button>
        </Box>
      </Modal>
    </>
  );
};
