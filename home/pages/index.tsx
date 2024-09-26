import Image from 'next/image'
import { Inter } from 'next/font/google'
import { HomePage } from "@/components/Pages/HomePage/HomePage";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return <HomePage />;
}

export const getStaticProps = async () => {
  return {
    props: {
      meta: {
        robots: "index,follow",
      },
      fonts: [inter],
    },
  };
};