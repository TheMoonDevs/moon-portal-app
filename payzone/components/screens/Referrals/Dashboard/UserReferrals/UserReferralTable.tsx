import { statuses } from "../AddRecordModal";

const headings = ["Name", "Status", "Engagement Span", "Earnings"];

interface IUserReferralTableProps {
  data: any;
  user: any;
  copied: boolean;
  setCopied: React.Dispatch<React.SetStateAction<boolean>>;
}

export const UserReferralTable = ({
  data,
  user,
  copied,
  setCopied,
}: IUserReferralTableProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText("https://themoondevs.com?ref=" + user?.id);
    setCopied(true);
  };

  return (
    <div className="bg-[#F3F3F3] p-4 lg:w-[80%] md:w-full">
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-col">
          <span className="font-semibold text-2xl tracking-[0.2rem] text-black">
            Clients you referred to TheMoonDevs{" "}
          </span>
          <span className="text-[1rem] text-black font-thin mt-3">
            Referral link -- https://themoondevs.com?ref=
            {user?.id}
          </span>
        </div>
        <button
          className="text-black font-semibold text-[1rem] border border-[#B4B4B4] px-4 py-2 hover:bg-[#e0e0e0]"
          onClick={handleCopy}
        >
          {copied ? "Copied!" : "Copy Link & Share"}
        </button>
      </div>
      <table className="w-full mt-5">
        <thead className="border-b border-midGrey w-full">
          <tr className=" w-full bg-neutral-100 rounded-lg divide-x-2">
            {headings.map((heading: string) => (
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
          {data?.map((referral: any) => (
            <tr
              className="border-b-2 border-neutral-200 w-full divide-x-2"
              key={referral?.id}
            >
              <td className="text-sm p-2">{referral?.referralName}</td>
              <td className="text-sm p-2">
                {
                  statuses?.find(
                    (status: { label: string; value: string }) =>
                      status.value === referral?.currentReferralStatus
                  )?.label
                }
              </td>
              <td className="text-sm p-2">{referral?.engagementSpan}</td>
              <td className="text-sm p-2">
                {`${referral?.totalSpent * 0.2} USD / ${
                  referral?.totalSpent
                } USD`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
