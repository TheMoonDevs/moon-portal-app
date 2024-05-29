"use client";
import { Header } from "@/components/global/Header";
import { HeroSection } from "./HeroSection";

export const HomePage = () => {
  return (
    <div className="px-8 overflow-hidden h-screen">
      <Header title="PayZone"/>
      <HeroSection />
    </div>
  );
};
