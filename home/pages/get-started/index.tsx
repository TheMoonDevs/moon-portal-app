import Image from "next/image";
import { Inter } from "next/font/google";
import { HomePage } from "@/components/Pages/HomePage/HomePage";
import { TrailPage } from "@/components/Pages/GetStartedPage/TrailPage/GetStartedTrailPage";

const inter = Inter({ subsets: ["latin"] });

export default function GetStarted() {
  return <TrailPage />;
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
