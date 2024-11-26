import { truncateAddress } from '.';
import { PayData } from '../ProfileDrawer';

export const PayDataUI = ({ payData }: { payData: PayData }) => {
  return (
    <div className="flex flex-col gap-1 pb-4">
      <h6 className="pb-2 font-bold">Payment Details</h6>
      <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-gray-900 p-4 text-white">
        <div className="flex items-center justify-between border-b border-neutral-600 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl">
              account_balance_wallet
            </span>
            <p className="text-sm font-bold">UPI ID </p>
          </div>
          <span className="font-normal">{payData?.upiId || 'N/A'}</span>
        </div>
        <div className="flex items-center justify-between border-b border-neutral-600 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl">
              account_balance
            </span>
            <p className="text-sm font-bold">Wallet Address </p>
          </div>
          <span className="font-normal">
            {truncateAddress(payData?.walletAddress) || 'N/A'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl">
              attach_money
            </span>
            <p className="text-sm font-bold">Pay Out: </p>
          </div>
          <span className="font-normal">
            {payData?.stipendAmount || 'N/A'} {payData?.stipendCurrency || ''}
          </span>
        </div>
      </div>
    </div>
  );
};
