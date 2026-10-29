/* eslint-disable @next/next/no-page-custom-font */
/* eslint-disable @next/next/google-font-display */
import '@mantine/core/styles.css';
import './globals.css';
import '@/styles/portal-colors.css';
import '@/styles/project-doc.css';
import '@mdxeditor/editor/style.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

import { MantineProvider } from '@mantine/core';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';

import { ToastsContainer } from '@/components/elements/Toast';
import { PermissionDeniedToaster } from '@/components/global/PermissionDeniedToaster';
import { ServiceWorkerProvider } from '@/components/global/ServiceWorkerProvider';
import { THEME_SCRIPT } from '@/lib/theme';
import { MUIThemeRegistry } from '@/styles/provider';
import { APP_BASE_URL } from '@/utils/constants/appInfo';
import { ReduxProvider } from '@/utils/redux/provider';
import NextAuthProvider from '@/utils/services/NextAuthProvider';

// Montserrat, from the Portal brand kit (SIL Open Font License 1.1).
const montserrat = localFont({
  src: [
    { path: './fonts/Montserrat-300.woff2', weight: '300' },
    { path: './fonts/Montserrat-400.woff2', weight: '400' },
    { path: './fonts/Montserrat-500.woff2', weight: '500' },
    { path: './fonts/Montserrat-600.woff2', weight: '600' },
    { path: './fonts/Montserrat-700.woff2', weight: '700' },
  ],
  variable: '--portal-font',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_BASE_URL),
  title: 'Portal',
  description:
    'Worklogs, projects and progress for every company you work with.',
  // app/favicon.ico and app/opengraph-image.png are picked up by Next.
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: { title: 'Portal', siteName: 'Portal', type: 'website' },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={montserrat.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
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
      <body className={montserrat.className}>
        <NextAuthProvider>
          <MUIThemeRegistry options={{ key: 'mui' }}>
            <MantineProvider>
              <ReduxProvider>
                <ServiceWorkerProvider />
                {children}
                <ToastsContainer />
                <PermissionDeniedToaster />
              </ReduxProvider>
            </MantineProvider>
          </MUIThemeRegistry>
        </NextAuthProvider>
      </body>
    </html>
  );
}
