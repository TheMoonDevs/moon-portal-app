import { Metadata } from "next";
import CustomBotsHeader from "@/components/screens/CustomBots/Header";
export const metadata: Metadata = {
    title: 'Custom Bots',
    description:
        `Enter the new age 
      of Ai-first, custom made, 
      branded bots`,
};


export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {

    return (
        <main>
            <CustomBotsHeader />
            <div className="h-14" />
            {children}
        </main>
    )
}