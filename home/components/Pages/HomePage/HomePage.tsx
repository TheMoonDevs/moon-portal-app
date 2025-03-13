'use client';

import { Suspense, useEffect } from 'react';
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
import IndustrySection from './IndustrySection/IndustrySection';
import DevCohortSection from './DevCohortSection/DevCohortSection';
import FooterCtaSection from './FooterCTASection/FooterCtaSection';


const CampaignAnalytics = () => {
  const { logEventsFromQuery } = useCampaignAnalytics();

  useEffect(() => {
    logEventsFromQuery();
  }, [logEventsFromQuery]);
  return <></>;
}

export const HomePage = ({
  base64Placeholder,
}: {
  base64Placeholder: string;
}) => {


  return (
    <div>
      <Suspense fallback={null}>
        <CampaignAnalytics />
      </Suspense>
      {/* Image section */}
      <div className="relative overflow-hidden">
        <div className="absolute left-0 top-0 -z-20 h-full w-full">
          <Image
            src="/images/hero.webp"
            alt="hero"
            className="h-full w-full object-cover"
            fill
            placeholder="blur"
            blurDataURL={base64Placeholder}
          />
        </div>
        <NewHeroSection />
        <StackSection />
      </div>
      <IndustrySection />
      <DevCohortSection />
      <PricingSection />
      <FooterCtaSection />
    </div>
  );
};
