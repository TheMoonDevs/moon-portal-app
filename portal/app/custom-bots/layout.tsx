import type { Metadata } from 'next';
import { Toaster } from 'sonner';

import CustomBotsHeader from '@/components/screens/CustomBots/Header';
export const metadata: Metadata = {
  title: 'Custom Bots',
  description: `Enter the new age 
      of Ai-first, custom made, 
      branded bots`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex h-screen flex-col bg-background">
      <CustomBotsHeader />
      <Toaster position="top-right" richColors duration={3000} />
      <div className="h-16" />
      <div className="flex-1">{children}</div>
    </main>
  );
}
