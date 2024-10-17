import { Metadata } from "next";
import { HomePage } from "@/components/Pages/HomePage/HomePage";

export const metadata: Metadata = {
  title: "Home",
  robots: "index,follow",
};

export default function Home() {
  return <HomePage />;
}
