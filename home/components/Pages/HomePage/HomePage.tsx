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
import NewHeroSection from './HeroSection/NewHeroSection';
import PricingSection from './PricingSection/PricingSection';
import StackSection from './StacksSection/StackSection';
import Image from 'next/image';

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
      {/* Image section */}
      <div className="relative overflow-hidden">
        <div className="absolute left-0 top-0 -z-20 h-full w-full">
          <Image
            src="/images/hero.png"
            alt="hero"
            className="h-full w-full object-cover"
            fill
            loading="lazy"
          />
        </div>
        <NewHeroSection />
        <StackSection />
      </div>
      <PricingSection />
    </div>
  );
};
