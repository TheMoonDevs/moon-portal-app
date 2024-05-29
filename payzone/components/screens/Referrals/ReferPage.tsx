'use client';

import { Header } from '@/components/global/Header';
import ReferralHeroSection from './ReferralHeroSection';

const ReferPage = () => {
  return (
    <div className='bg-black px-8 overflow-visible h-screen'>
      <Header title='Refer  &  Earn' />
      <ReferralHeroSection />
    </div>
  );
};

export default ReferPage;
