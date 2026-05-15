'use client';

import React from 'react';

import { OnboardingPage } from '@/components/screens/Members/OnboardingPage';
import { useUser } from '@/utils/hooks/useUser';

const OnboardingSignup = () => {
  const { user } = useUser();
  console.log('user', user);
  // if (user?.status !== "INACTIVE") redirect("/");
  // else {
  return (
    <main className="mt-10 flex-col items-center justify-center gap-4">
      <h1 className="text-center text-3xl font-semibold">
        Member Onboarding Page
      </h1>
      <OnboardingPage />;
    </main>
  );
  // }
};

export default OnboardingSignup;
