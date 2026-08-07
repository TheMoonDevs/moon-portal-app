/* eslint-disable @next/next/no-page-custom-font */
/* eslint-disable @next/next/google-font-display */
import '@mantine/core/styles.css';
import './globals.css';
import '@mdxeditor/editor/style.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

import { MantineProvider } from '@mantine/core';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { ToastsContainer } from '@/components/elements/Toast';
import PushServiceRegistration from '@/components/global/PushServiceRegistration';
import { UpdatePWA } from '@/components/global/UpdatePWA';
import { MUIThemeRegistry } from '@/styles/provider';
import { ReduxProvider } from '@/utils/redux/provider';
import NextAuthProvider from '@/utils/services/NextAuthProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  manifest: '/manifest.json', // we are accessing our manifest file here
  title: 'The Moon Devs',
  description:
    'A community of developers and designers building the future of the web',
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
          href="https://fonts.googleapis.com/icon?family=Material+Icons&display=block"
          rel="stylesheet"
        ></link>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined&display=block"
          rel="stylesheet"
        ></link>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,100..700,0,0&display=block"
        ></link>
      </head>
      <body className={inter.className}>
        <NextAuthProvider>
          <MUIThemeRegistry options={{ key: 'mui' }}>
            <MantineProvider>
              <ReduxProvider>
                <PushServiceRegistration>
                  <UpdatePWA>{children}</UpdatePWA>
                </PushServiceRegistration>
                <ToastsContainer />
              </ReduxProvider>
            </MantineProvider>
          </MUIThemeRegistry>
        </NextAuthProvider>
      </body>
    </html>
  );
}
