import ReferralHeader from "@/components/screens/Referrals/Dashboard/ReferralHeader";
import { ReferralSidebar } from "@/components/screens/Referrals/ReferralSidebar";

export default function ReferralsDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="lg:flex lg:flex-row h-screen flex-col bg-white">
      <div className="lg:w-[15%] px-4  w-full bg-bgBlack lg:fixed left-0 top-0 bottom-0">
        <ReferralSidebar />
      </div>
      <div className="w-full flex flex-col text-black lg:ml-[15%]">
        <div className="mx-6 my-2">
          <ReferralHeader />
        </div>
        {children}
      </div>
    </div>
  );
}
