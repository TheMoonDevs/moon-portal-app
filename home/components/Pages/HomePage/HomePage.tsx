"use client";

import { useEffect } from "react";
import { BenefitsSectionWithGrids } from "./BenefitsSection";
import { CompareSectionWithGrids } from "./CompareSection";
import { ExpertiseSectionWithGrids } from "./ExpertiseSection";
import { FAQSection, FAQSectionWithGrids } from "./FAQSection";
import { FooterSectionWithGrids } from "./FooterSection";
import { HeroSectionWithGrids } from "./HeroSection";
import { HomePageStyled } from "./HomePage.styles";
import { HowItWorksSectionWithGrids } from "./HowItWorksSection";
import { SocialProofSectionWithGrids } from "./SocialProofSection";
import useCampaignAnalytics from "@/utils/hooks/useCampaignAnalytics";
import { MediumBlogsWithGrids } from "./MediumBlogsSection";

export const HomePage = () => {
  const { logEventsFromQuery } = useCampaignAnalytics();

  useEffect(() => {
    logEventsFromQuery();
  }, [logEventsFromQuery]);

  return (
    <HomePageStyled>
      <HeroSectionWithGrids />
      <SocialProofSectionWithGrids />
      <BenefitsSectionWithGrids />
      <CompareSectionWithGrids />
      <ExpertiseSectionWithGrids />
      <HowItWorksSectionWithGrids />
      <MediumBlogsWithGrids />
      <FAQSectionWithGrids />
      <FooterSectionWithGrids />
    </HomePageStyled>
  );
};
