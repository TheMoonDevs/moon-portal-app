'use client';

import { useEffect } from 'react';
import { BenefitsSectionWithGrids } from './BenefitsSection';
import { CompareSectionWithGrids } from './CompareSection';
import { ExpertiseSectionWithGrids } from './ExpertiseSection';
import { FAQSection, FAQSectionWithGrids } from './FAQSection';
import { FooterSectionWithGrids } from './FooterSection';
import { HeroSectionWithGrids } from './HeroSection';
import { HomePageStyled } from './HomePage.styles';
import { HowItWorksSectionWithGrids } from './HowItWorksSection';
import { SocialProofSectionWithGrids } from './SocialProofSection';
import useCampaignAnalytics from '@/utils/hooks/useCampaignAnalytics';
import { MediumBlogsWithGrids } from './MediumBlogsSection';
import NewHeroSection from './NewHeroSection';
import PricingSection from './PricingSection/PricingSection';
import IndustrySection from './IndustrySection/IndustrySection';

export const HomePage = () => {
  const { logEventsFromQuery } = useCampaignAnalytics();

  useEffect(() => {
    logEventsFromQuery();
  }, [logEventsFromQuery]);

  return (
    // <HomePageStyled>
    //   <HeroSectionWithGrids />
    //   <SocialProofSectionWithGrids />
    //   <BenefitsSectionWithGrids />
    //   <CompareSectionWithGrids />
    //   <ExpertiseSectionWithGrids />
    //   <HowItWorksSectionWithGrids />
    //   <MediumBlogsWithGrids />
    //   <FAQSectionWithGrids />
    //   <FooterSectionWithGrids />
    // </HomePageStyled>
    <div>
      <NewHeroSection />
      <PricingSection />
      <IndustrySection />
    </div>
  );
};
