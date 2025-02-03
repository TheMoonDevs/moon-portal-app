import Image from 'next/image';
import { Inter } from 'next/font/google';
import { HomePage } from '@/components/Pages/HomePage/HomePage';
import MetaInfo from '@/components/App/MetaInfo';

const inter = Inter({ subsets: ['latin'] });

export default function Home() {
  return (
    <>
      <MetaInfo enableOpenGraph enableTwitter />
      <HomePage />
    </>
  );
}

export const getStaticProps = async () => {
  return {
    props: {
      meta: {
        robots: 'index,follow',
      },
      fonts: [inter],
    },
  };
};
