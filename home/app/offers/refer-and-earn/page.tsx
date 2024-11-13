import { ReferPage } from '@/components/Pages/ReferPage/ReferPage';
import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import dynamic from 'next/dynamic';

const inter = Inter({ subsets: ['latin'] });

const DynamicReferPage = dynamic(
  () => import('@/components/Pages/ReferPage/ReferPage').then(mod => mod.ReferPage),
  {ssr: false}
)

export default function Home() {
  return (
    <div style={{ fontFamily: inter.style.fontFamily }}>
      <DynamicReferPage />
    </div>
  );
}
