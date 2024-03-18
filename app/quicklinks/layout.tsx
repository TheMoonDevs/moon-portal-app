import QuicklinksHeader from "@/components/screens/Quicklinks/global/Header";
import QuicklinksSidebar from "@/components/screens/Quicklinks/global/Sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex gap-4">
      <QuicklinksSidebar />
      <div className="p-6 pr-8 pl-4 w-full">
        <QuicklinksHeader />
        {children}
      </div>
    </main>
  );
}
