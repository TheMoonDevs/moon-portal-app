import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { MUIThemeRegistry } from "@/styles/provider";
import { ReduxProvider } from "@/utils/redux/provider";

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  manifest: "/manifest.json", // we are accessing our manifest file here
  title: "The Moon Devs",
  description:
    "A community of developers and designers building the future of the web",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <MUIThemeRegistry options={{ key: "mui" }}>
          <ReduxProvider>
            {/* <Header /> */}
            {/* <Sidebar /> */}
            {children}
          </ReduxProvider>
        </MUIThemeRegistry>
      </body>
    </html>
  );
}
