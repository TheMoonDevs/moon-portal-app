import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePassphrase } from "@/utils/hooks/usePassphrase";
import { Modal, Box, Typography, Button, TextField } from "@mui/material";

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
      <div className="bg-red-100 text-red-800 p-4 rounded-2xl">
        <p>
          You need to verify your passphrase, or your private logs will be lost.
        </p>
        <div className="flex justify-end space-x-4 mt-4">
          <button
            className="bg-green-300 text-black px-4 py-2 rounded-full hover:bg-green-600 hover:text-white transition-all"
            onClick={() => setShowVerifyModal(true)}
          >
            Verify
          </button>
          <button
            className="bg-red-300 text-black px-4 py-2 rounded-full  hover:bg-red-600 hover:text-white transition-all"
            onClick={() => setResetModalOpen(true)}
          >
            Reset
          </button>
        </div>
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
          <button
            className="bg-green-300 text-black px-3 py-1 rounded-2xl  hover:bg-green-600 hover:text-white transition-all w-fit"
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
          <button
            className="bg-red-300 text-black px-3 py-1 rounded-2xl  hover:bg-red-600 hover:text-white transition-all w-fit"
            onClick={handleConfirmReset}
          >
            Confirm Reset
          </button>
        </Box>
      </Modal>
    </>
  );
};
