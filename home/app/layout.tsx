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
import { AppPageLoader } from '@/components/App/PageLoader';
import MetaInfo, { MetaInfoProps } from '@/components/App/MetaInfo';
import '../styles/globals.css';
// import Footer from "@/components/Global/Footer";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  manifest: '/manifest.json',
  title: 'The Moon Devs',
  description: 'A community of developers and designers building the future of the web',
};

const meta: MetaInfoProps = {
  title: metadata.title?.toString() ?? null,
  description: metadata.description?.toString() ?? null,
  ogType: "website", 
  image: "/path/to/image.jpg",
  url: "https://yourwebsite.com", 
  keywords: "developers, designers, web development", 
  robots: null, 
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <head>
        <link
          href='https://fonts.googleapis.com/icon?family=Material+Icons'
          rel='stylesheet'
        ></link>
        <link
          href='https://fonts.googleapis.com/icon?family=Material+Icons+Outlined'
          rel='stylesheet'
        ></link>
        <link
          rel='stylesheet'
          href='https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'
        ></link>
      </head>
      <body className={inter.className}>
        <MUIThemeRegistry options={{ key: 'mui' }}>
        <MetaInfo meta={meta} />
          <ReduxProvider>
          <Header />
          <main>{children}</main>
          <AppPageLoader />
          </ReduxProvider>
        </MUIThemeRegistry>
        <PrismicPreview repositoryName={repositoryName} />
      </body>
    </html>
  );
}
