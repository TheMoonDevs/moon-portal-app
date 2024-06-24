"use client";
import { chainEnum, TOKEN_INFO } from "@/utils/constants/appInfo";
import { useWallet } from "@/utils/hooks/useWallet";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState, useEffect } from "react";
import Modal from "@mui/material/Modal";
import { useEthersSigner } from "@/utils/hooks/useEthers";
import { Contract, formatEther, parseEther } from "ethers";
import TMDToken from "../../../../../contract/artifacts/contracts/TMDToken.sol/TMDToken.json";
import { MyServerApi, SERVER_API_ENDPOINTS } from "@/utils/service/MyServerApi";
import {
  TRANSACTIONCATEGORY,
  TRANSACTIONSTATUS,
  TRANSACTIONTYPE,
} from "@prisma/client";
import { useAuthSession } from "@/utils/hooks/useAuthSession";
<<<<<<< HEAD
import { useSyncBalances } from "@/utils/hooks/useSyncBalances";
import CurrencyModal from "@/components/global/CurrencyModal";
=======
import {
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Popover,
} from "@mui/material";
import { close } from "../../../../public/icons/index";
import Image from "next/image";
import { useSyncBalances } from "@/utils/hooks/useSyncBalances";
import { addClaimTransaction } from "@/utils/redux/db/db.slice";
import {
  updateSelectedCurrency,
  updateSelectedCurrencyValue,
} from "@/utils/redux/balances/balances.slice";
import CurrencySelectPopover from "@/components/global/CurrencySelectPopover";
>>>>>>> main

const TMDConverter = ({
  refetchTransactions,
}: {
  refetchTransactions: () => void;
}) => {
  const { walletAddress, walletChain } = useWallet();
  const ethersSigner = useEthersSigner({
    chainId: walletChain?.id,
  });
  const [loading, setLoading] = useState(true);
  const [txProgress, setTxProgress] = useState<boolean>(false);
  const [approveProgress, setApproveProgress] = useState<boolean>(false);
  const { user } = useAuthSession();
  const Admin = user?.isAdmin;

  const [approvedAllowance, setApprovedAllowance] = useState("0.0");

  const [mintOpen, setMintOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const handleMintOpen = () => setMintOpen(true);
  const handleMintClose = () => setMintOpen(false);

  const handleSendOpen = () => setSendOpen(true);
  const handleSendClose = () => setSendOpen(false);

  const [mintAmount, setMintAmount] = useState("");
  const [mintAddress, setMintAddress] = useState("");

  const [sendAmount, setSendAmount] = useState("");
  const [sendAddress, setSendAddress] = useState("");

  const [claimAmount, setClaimAmount] = useState("");
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  const handleCurrencySelect = (currency: string, value: number) => {
    dispatch(updateSelectedCurrency(currency));
    dispatch(updateSelectedCurrencyValue(value));
    handleClose();
  };

  const { exchange, multiplicationFactor } = useSyncBalances();

  const currency = useAppSelector((state) => state.balances.selectedCurrency);

  const handleMint = async () => {
    if (!ethersSigner) return;

    setTxProgress(true);

    let amount = parseEther(mintAmount);

    const tokenContract = new Contract(
      TOKEN_INFO.contractAddress,
      TMDToken.abi,
      ethersSigner
    );

    try {
      const mintTx = await tokenContract.reward(mintAddress, amount);
      // console.log(mintTx, mintTx.hash);
      await mintTx.wait();
      setTxProgress(false);
      refetchTransactions();
      setMintAddress("");
      setMintAmount("");
      handleMintClose();
    } catch (err) {
      console.log(err, "minting failed");
      return;
    }
  };

  const handleClaim = async () => {
    if (!ethersSigner) return;

    setTxProgress(true);

    let amount = parseEther(claimAmount);
    const tokenContract = new Contract(
      TOKEN_INFO.contractAddress,
      TMDToken.abi,
      ethersSigner
    );

    try {
      const claimTx = await tokenContract.claim(amount);
      // console.log("hash", claimTx.hash);
      await claimTx.wait();

      setTxProgress(false);
      let userData = { ...user };
      userData.payData = null;
      userData.workData = null;
      const updatedData = {
        userId: user?.id,
        user: userData,
        txStatus: TRANSACTIONSTATUS.PROCESSING,
        txType: TRANSACTIONTYPE.FIAT,
        txCategory: TRANSACTIONCATEGORY.CLAIM,
        amount: parseFloat(claimAmount),
        burnTxHash: claimTx.hash,
      };

      MyServerApi.updateData(SERVER_API_ENDPOINTS.updatePayment, updatedData)
        .then((updatedTransaction) => {
          alert("Claim Request Sent");
        })
        .catch((error) => {
          console.error("Error updating PayTransaction:", error);
        });

      refetchTransactions();
      setClaimAmount("");
    } catch (error) {
      console.log(error, "claim failed");
      return;
    }
  };

  const approveTokens = async () => {
    if (!ethersSigner) return;
    setApproveProgress(true);
    let amount = parseEther(sendAmount);

    const tokenContract = new Contract(
      TOKEN_INFO.contractAddress,
      TMDToken.abi,
      ethersSigner
    );

    try {
      const approveTx = await tokenContract.approve(sendAddress, amount);
      // console.log(approveTx, approveTx.hash);
      await approveTx.wait();
      const allowance: Number = await tokenContract.allowance(
        walletAddress,
        sendAddress
      );
      // console.log("allowance", allowance);

      if (parseFloat(allowance.toString()) > 0) {
        setApprovedAllowance(formatEther(allowance.toString()));
      }
      setApproveProgress(false);
    } catch (err) {
      console.log(err, "approve failed");
      return;
    }
  };

  const sendTokens = async () => {
    if (!ethersSigner) return;
    setTxProgress(true);
    let amount = parseEther(sendAmount);

    const tokenContract = new Contract(
      TOKEN_INFO.contractAddress,
      TMDToken.abi,
      ethersSigner
    );

    try {
      const approveTx = await tokenContract.transfer(sendAddress, amount);

      await approveTx.wait();
      setTxProgress(false);
      refetchTransactions();
      setSendAddress("");
      setSendAmount("");
      handleSendClose();
    } catch (err) {
      console.log(err);

      return;
    }
  };

  return (
    <div className="bg-whiteSmoke h-fit flex flex-col p-4 justify-between gap-4">
      {/* <button className="text-sm font-black p-2 w-2/5 text-whiteSmoke bg-black">
            Connect Wallet
          </button> */}
      <ConnectButton />

      <p className="text-sm font-thin text-midGrey">
        To perform transactions of TMD credits, you need to connect your Wallet,
        please import your private key shared by the administration after
        Metamask logging
      </p>

      <div className="flex gap-2">
        <button
          className="text-sm font-black border border-midGrey p-2"
          onClick={handleSendOpen}
        >
          Send TMD
        </button>
        {/* <button className="text-sm font-black border border-midGrey p-2">
              Receive TMD
            </button> */}
        {Admin && (
          <button
            className="text-sm text-white bg-black font-black p-2"
            onClick={handleMintOpen}
          >
            Mint TMD
          </button>
        )}
      </div>

      <Modal
        open={mintOpen}
        onClose={handleMintClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/3 bg-white border-2 border-midGrey shadow-lg p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleMint();
            }}
          >
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Address"
                value={mintAddress}
                onChange={(e) => setMintAddress(e.target.value)}
                className="w-full h-10 p-2 border border-midGrey rounded-sm text-black"
                required
                disabled={txProgress}
              />
              <input
                type="text"
                placeholder="Amount"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                className="w-full h-10 p-2 border border-midGrey rounded-sm text-black"
                required
                disabled={txProgress}
              />
            </div>
            {!txProgress ? (
              <div className="flex gap-2 mt-3">
                <button
                  className="text-sm w-fit font-black text-whiteSmoke bg-black p-2"
                  type="submit"
                >
                  Mint TMD
                </button>
                <button
                  className="text-sm font-black w-fit text-whiteSmoke bg-black p-2"
                  onClick={handleMintClose}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="text-sm font-black w-fit text-whiteSmoke bg-black p-2 mt-3"
                disabled
              >
                Minting...
              </button>
            )}
          </form>
        </div>
      </Modal>

      <Modal
        open={sendOpen}
        onClose={handleSendClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/3 bg-white border-2 border-midGrey shadow-lg p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendTokens();
            }}
          >
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Address"
                value={sendAddress}
                disabled={txProgress}
                onChange={(e) => setSendAddress(e.target.value)}
                className="w-full h-10 p-2 border border-midGrey rounded-sm text-black"
                required
              />
              <input
                type="text"
                placeholder="Amount"
                value={sendAmount}
                disabled={txProgress}
                onChange={(e) => setSendAmount(e.target.value)}
                className="w-full h-10 p-2 border border-midGrey rounded-sm text-black"
                required
              />
              <p className="text-sm text-bgBlack">
                Approved : {approvedAllowance}
              </p>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                className="text-sm w-fit font-black text-whiteSmoke bg-black p-2"
                onClick={(e) => {
                  e.preventDefault();
                  approveTokens();
                }}
              >
                {!approveProgress ? "Approve" : "Approving..."}
              </button>
              <button
                className="text-sm font-black w-fit text-whiteSmoke bg-black p-2"
                type="submit"
              >
                {!txProgress ? "Send" : "Sending..."}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <span className="flex justify-between items-center">
        <p className="text-sm font-thin">Current Price</p>
        {exchange ? (
          <Button
            className="text-sm font-black text-black border border-neutral-500 px-2 py-1 rounded flex justify-center items-center"
            variant="outlined"
            aria-describedby={id}
            onClick={handleClick}
            sx={{
              '&:hover': {
                borderColor: '#f5f5f5'
              }
            }}
          >
            1 TMD === {multiplicationFactor} {currency}
            <span className="material-symbols-outlined">arrow_drop_down</span>
          </Button>
        ) : (
          <p className="text-sm text-black">loading...</p>
        )}
      </span>
<<<<<<< HEAD
=======

      <CurrencySelectPopover
        popoverProps={{ id, open, anchorEl, onClose: handleClose }}
        handleCurrencySelect={handleCurrencySelect}
      />

      <div className="flex justify-between items-center">
        <p className="text-sm font-thin">Available Fiat for conversion</p>
        <p className="text-sm font-black">{liquidityTMDCredits} TMD</p>
      </div>
>>>>>>> main
      <span className="flex justify-between">
        <p className="text-sm font-thin">Previously Claimed Credits</p>
        <p className="text-sm font-black">1,234 TMD</p>
      </span>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleClaim();
        }}
      >
        <div className="flex gap-2">
          <input
            type="number"
            className="w-8/12 h-10 p-2 border border-midGrey"
            placeholder="Request TMD Conversion"
            value={claimAmount}
            onChange={(e) => setClaimAmount(e.target.value)}
            disabled={txProgress}
          />
          <button
            className={`text-sm font-black w-1/3 text-whiteSmoke bg-black ${
              txProgress && "opacity-50"
            }`}
            type="submit"
            disabled={txProgress}
          >
            Claim Now
          </button>
        </div>
      </form>
    </div>
  );
};

export default TMDConverter;
