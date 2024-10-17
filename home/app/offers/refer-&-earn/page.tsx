import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ReferPage } from '@/components/Pages/ReferPage/ReferPage';

const inter = Inter({ subsets: ['latin'] });

const metadata: Metadata = {
  title: 'Refer Page',
  description: 'This is the refer page',
  robots: 'index,follow',
};

export default function Home() {
  return (
    <div style={{ fontFamily: inter.style.fontFamily }}>
      <ReferPage />
    </div>
  );
}
