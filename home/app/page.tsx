import { Metadata } from 'next';
import { HomePage } from '@/components/Pages/HomePage/HomePage';
import dynamic from 'next/dynamic';

const DynamicHome = dynamic(
  () =>
    import('@/components/Pages/HomePage/HomePage').then((mod) => mod.HomePage),
  { ssr: false },
);

export const metadata: Metadata = {
  title: 'Home',
  robots: 'index,follow',
};

export default function Home() {
  return <DynamicHome />;
}
