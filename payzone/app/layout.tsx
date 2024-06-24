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
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        ></link>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined"
          rel="stylesheet"
        ></link>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,100..700,0,0"
        ></link>
      </head>
      <body>
        <main className=" ">
          <ReduxProvider>
            <MUIThemeProvider>
              <MantineProvider>
                <WalletWagmiProvider>
                  <AppLayout>{children}</AppLayout>
                </WalletWagmiProvider>
              </MantineProvider>
            </MUIThemeProvider>
          </ReduxProvider>
        </main>
      </body>
    </html>
  );
}
