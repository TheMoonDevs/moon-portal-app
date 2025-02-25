import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { usePassphrase } from '@/utils/hooks/usePassphrase';
import { Modal, Box, Typography, Button, TextField } from '@mui/material';
import { Lock, Unlock } from 'lucide-react';

export const PassphraseVerification = () => {
  const [isResetModalOpen, setResetModalOpen] = useState<boolean>(false);
  const [passphraseInput, setPassphraseInput] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const {
    showVerifyModal,
    setShowVerifyModal,
    verifyPassphrase,
    handleResetPassphrase,
    localPassphrase,
  } = usePassphrase();
  // Handle passphrase verification
  const handleVerify = () => {
    toast.info('Verifying passphrase');
    verifyPassphrase(passphraseInput);
  };

  // Handle passphrase reset confirmation
  const handleConfirmReset = () => {
    if (confirmInput === 'CONFIRM') {
      handleResetPassphrase();
    } else {
      toast.error('You must type CONFIRM to reset.');
    }
  };

  useEffect(() => {
    if (localPassphrase) {
      setPassphraseInput('');
      setConfirmInput('');
      setShowVerifyModal(false);
      setResetModalOpen(false);
    }
  }, [localPassphrase]);

  return (
    <>
      {/* Warning message */}
      <div className="flex h-full w-[95%] items-center justify-center">
        <button
          className="group relative flex justify-center text-xl font-semibold outline-none"
          onClick={() => setShowVerifyModal(true)}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <span className="opacity-100 transition-opacity duration-200 group-hover:opacity-0">
                <Lock className="text-3xl" />
              </span>
              <span className="absolute left-0 top-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <Unlock />
              </span>
            </div>
            <span className="text-sm">You need to verify to view this</span>
          </div>
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
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: 'background.paper',
            borderRadius: 4,
            boxShadow: 24,
            display: 'flex',
            px: 3,
            py: 2,
            flexDirection: 'column',
            width: '400px',
          }}
        >
          <h1 className="text-lg font-semibold">Verify Passphrase</h1>
          <input
            type="password"
            placeholder="Enter passphrase"
            value={passphraseInput}
            onChange={(e) => setPassphraseInput(e.target.value)}
            className="my-3 h-12 w-full rounded-2xl border border-black px-2 py-1 outline-none"
          />
          <div className="mb-2 space-x-1 text-gray-500">
            <span>Passphrase slipped your mind?</span>
            <button
              className="ml-1 text-blue-600 hover:text-blue-400"
              onClick={() => {
                setShowVerifyModal(false);
                setResetModalOpen(true);
              }}
            >
              Reset it.
            </button>
          </div>
          <button
            className="w-fit rounded-2xl border border-black bg-black px-3 py-1 text-white transition-all hover:bg-white hover:text-black"
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
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: 'background.paper',
            borderRadius: 4,
            boxShadow: 24,
            display: 'flex',
            px: 3,
            py: 2,
            flexDirection: 'column',
            width: '400px',
          }}
        >
          <h1 className="text-lg font-semibold">Reset Passphrase</h1>
          <h1 className="text-sm font-semibold text-red-600">
            To reset the passphrase, type "CONFIRM" in all caps:
          </h1>
          <input
            type="text"
            placeholder="CONFIRM"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            className="my-3 h-12 w-full rounded-2xl border border-black px-2 py-1 outline-none"
          />
          <div className="-mt-1 mb-2 space-x-1 text-gray-500">
            <span>Protect your logs</span>
            <button
              className="hover:text-black"
              onClick={() => {
                setResetModalOpen(false);
                setShowVerifyModal(true);
              }}
            >
              verify here!
            </button>
          </div>
          <button
            className="w-fit rounded-2xl border border-black bg-black px-3 py-1 text-white transition-all hover:bg-white hover:text-black"
            onClick={handleConfirmReset}
          >
            Confirm Reset
          </button>
        </Box>
      </Modal>
    </>
  );
};
