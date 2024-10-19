import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { TrailPage } from '@/components/Pages/GetStartedPage/TrailPage/GetStartedTrailPage';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Get Started',
  description: 'This is the Get Started Trail Page',
  robots: 'index,follow',
};

export default function GetStarted() {
  return (
    <div style={{ fontFamily: inter.style.fontFamily }}>
      <TrailPage />
    </div>
  );
}
