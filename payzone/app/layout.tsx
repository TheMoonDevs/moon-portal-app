import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "@/utils/redux/provider";
import { WalletWagmiProvider } from "@/utils/configure/WalletWagmiProvider";
import { APP_INFO } from "@/utils/constants/appInfo";
import { MUIThemeProvider } from "@/styles/provider";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import { AppLayout } from "@/components/global/AppLayout";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  manifest: "/manifest.json", // we are accessing our manifest file here
  title: APP_INFO.name,
  icons: [
    {
      rel: "icon",
      url: "/favicon.ico",
    },
  ],
  description: APP_INFO.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <main className=" ">
          <ReduxProvider>
            <MUIThemeProvider>
              <MantineProvider>
                <WalletWagmiProvider>
                  <AppLayout>
                    {children}
                    <Toaster />
                  </AppLayout>
                </WalletWagmiProvider>
              </MantineProvider>
            </MUIThemeProvider>
          </ReduxProvider>
        </main>
      </body>
    </html>
  );
}
