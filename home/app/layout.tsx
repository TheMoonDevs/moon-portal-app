/* eslint-disable @next/next/no-page-custom-font */
/* eslint-disable @next/next/google-font-display */
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
// import "./globals.css";
import { MUIThemeRegistry } from '@/styles/provider';
import { ReduxProvider } from '@/redux/provider';
import { PrismicPreview } from '@prismicio/next';

import { repositoryName } from '@/prismicio';
import { Header } from '@/components/App/Header/Header';
import MetaInfo, { MetaInfoProps } from '@/components/App/MetaInfo';
import '../styles/globals.css';
import NewHeader from '@/components/App/Header/NewHeader';
import { FooterSection } from '@/components/Pages/HomePage/FooterSection';
import {
  ProgressBar,
  ProgressBarProvider,
} from '@/components/App/Global/react-transition-progress/CustomProgress';
import { TallyPopupProvider } from '@/components/App/Global/TallyPopup';
import Script from 'next/script';
// import Footer from "@/components/Global/Footer";
import '@fillout/react/style.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  manifest: '/manifest.json',
  title: 'The Moon Devs',
  description:
    'A community of developers and designers building the future of the web',
};

const meta: MetaInfoProps = {
  title: metadata.title?.toString() ?? undefined,
  description: metadata.description?.toString() ?? undefined,
  openGraph: {
    ogType: 'website',
    image: '/path/to/image.jpg',
    url: 'https://yourwebsite.com',
  },
  keywords: 'developers, designers, web development',
  robots: undefined,
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        ></link>
        <Script
          src="https://tally.so/widgets/embed.js"
          strategy="afterInteractive"
          defer
        />
      </head>
      <body className={inter.className}>
        <MUIThemeRegistry options={{ key: 'mui' }}>
          <MetaInfo meta={meta} />
          <ReduxProvider>
            <ProgressBarProvider>
              <ProgressBar className="fixed top-0 z-[9999] h-1 bg-black shadow-lg shadow-sky-500/20" />
              <TallyPopupProvider>
                <NewHeader />
                <main>{children}</main>
                <FooterSection />
              </TallyPopupProvider>
              {/* <AppPageLoader /> */}
            </ProgressBarProvider>
          </ReduxProvider>
        </MUIThemeRegistry>
        <PrismicPreview repositoryName={repositoryName} />
      </body>
    </html>
  );
}
