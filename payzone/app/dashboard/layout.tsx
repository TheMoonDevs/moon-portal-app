"use client";

import { MemberSidebar } from "@/components/screens/Dashboard/MemberSidebar";
import { useAuthSession } from "@/utils/hooks/useAuthSession";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="lg:flex lg:flex-row flex-col lg:h-screen">
      <div className="lg:w-[15%] px-4  w-full bg-bgBlack lg:fixed left-0 top-0 bottom-0">
        <MemberSidebar />
      </div>
      <div className="w-full min-h-[100vh] flex flex-col bg-white text-black lg:ml-[15%]">
        {children}
      </div>
    </div>
  );
}
