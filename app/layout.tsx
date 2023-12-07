import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { MUIThemeRegistry } from "@/styles/provider";
import { ReduxProvider } from "@/utils/redux/provider";
import { ToastsContainer } from "@/components/elements/Toast";
import { SessionProvider, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import NextAuthProvider from "@/utils/services/NextAuthProvider";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import { AppLayout } from "@/components/global/AppLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  manifest: "/manifest.json", // we are accessing our manifest file here
  title: "The Moon Devs",
  description:
    "A community of developers and designers building the future of the web",
};

export default function RootLayout({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        ></link>
      </head>
      <body className={inter.className}>
        <NextAuthProvider session={session}>
          <MUIThemeRegistry options={{ key: "mui" }}>
            <ReduxProvider>
              <AppLayout>{children}</AppLayout>
              <ToastsContainer />
            </ReduxProvider>
          </MUIThemeRegistry>
        </NextAuthProvider>
      </body>
    </html>
  );
}
