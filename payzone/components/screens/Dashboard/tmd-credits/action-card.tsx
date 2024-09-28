import Image from "next/image";
import React from "react";

interface ActionInfo {
  [key: string]: {
    title: string;
    desc: string;
    btntitle: string;
    btncolor: string;
    img: string;
  };
}

const actionInfo: ActionInfo = {
  sendtmd: {
    title: "Send TMD to a Friend",
    desc: "$TMD Tokens are integral to the meritocractic society being established at the moon devs, You can gain certain advantages,or exchange for certain benefits in the future.",
    btntitle: "SEND $TMD",
    btncolor: "bg-[#FF0054] hover:bg-[#FF0054]/90 text-white",
    img: "/icons/sendtmd.svg",
  },
  minttmd: {
    title: "Mint TMD to a Contributor",
    desc: "Mint TMDTokens to a worthy contributor.",
    btntitle: "Mint $TMD",
    btncolor: "bg-[#00C2B1] hover:bg-[#00C2B1]/90",
    img: "/icons/minttmd.svg",
  },
};

interface ActionCardProps {
  action: string;
  onClickAction: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({ action, onClickAction }) => {
  const actionDetails = actionInfo[action];

  if (!actionDetails) {
    return null; // or some fallback UI
  }

  return (
    <div className="bg-white p-4 rounded-3xl flex justify-between gap-3 items-center">
      <div className="w-24 h-24">
        <Image src={actionDetails.img} width={65} height={65} alt="" />
      </div>
      <div className="flex flex-col w-full gap-2">
        <h1 className="font-medium text-xl">{actionDetails.title}</h1>
        <p className="font-light text-[10px]">{actionDetails.desc}</p>
        <button
          className={`w-fit ${actionDetails.btncolor} rounded-full px-4 py-1`}
          onClick={onClickAction}
        >
          {actionDetails.btntitle}
        </button>
      </div>
    </div>
  );
};

export default ActionCard;
