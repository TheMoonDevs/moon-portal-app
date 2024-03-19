import { Bottombar } from "@/components/global/Bottombar";
import { HomePage } from "@/components/screens/Home/HomePage";
import Image from "next/image";

export default function Home() {
  return (
    <>
      <HomePage />
      <Bottombar visible={true} />
    </>
  );
}
