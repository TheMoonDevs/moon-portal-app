import { AdminExchangeSetter } from "@/components/screens/Dashboard/adminExchangeSetter/AdminExchangeSetter";
import { ClaimReqs } from "@/components/screens/Dashboard/claim-requests/ClaimReqs";
import { PayUpiID } from "@/components/screens/Dashboard/pay-upi-id/PayUpiID";
import { AdminWrapper } from "@/utils/configure/AdminPage";

export default function PayAdmin() {
  return (
    <AdminWrapper>
      <div className="flex gap-8 p-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold">Stipend Adder/Editor</h2>
          <PayUpiID />
        </div>
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold">Admin Exchnage Rate of TMD</h2>
          <AdminExchangeSetter />
        </div>
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold">TMD Claims</h2>
          <ClaimReqs />
        </div>
      </div>
    </AdminWrapper>
  );
}
