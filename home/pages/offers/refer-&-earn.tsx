import Image from "next/image";
import { Inter } from "next/font/google";
import { ReferPage } from "@/components/Pages/ReferPage/ReferPage";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return <ReferPage />;
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
