import SimpleMvpCard from './SimpleMvpCard';
import FeatureCard from './FeatureCard';
import CtaCard from './CtaCard';
import Button from '@/components/elements/Button';
import PremiumMvpCardDesktop from './PremiumMvpCard';
import {
  FilloutFormIds,
  useFilloutPopup,
} from '@/components/App/Global/FilloutPopup';
import { useRouter } from 'next/navigation';

export const PricingSectionCards = {
  simpleMvp: {
    title: 'simpleton MVPs',
    highlights: [
      {
        icon: 'all_inclusive',
        title: 'End-to-End solution',
      },
      {
        icon: 'trending_up',
        title: 'Upto 2x Complexity Scale',
      },
      {
        icon: 'schedule',
        title: 'Turnaround in 3-4 weeks',
      },
    ],
    price: '$3,999',
    priceDuration: 'per Project',
    note: 'No Hidden Fees, No Extra Costs, No Drags',
    cta: 'Get Started',
    image: '/images/abstract-red.png',
  },
  premiumMVPs: {
    title: 'Premium MVPs',
    highlights: [
      {
        icon: 'speed',
        title: 'Fastest Turnarounds',
      },
      {
        icon: 'trending_up',
        title: 'Upto 4x Complexity Scale',
      },
      {
        icon: 'card_giftcard',
        title: 'Free trial of 1 week',
      },
      {
        icon: 'visibility',
        title: 'Transparent Worklogs',
      },
    ],
    price: '$2,999',
    priceDuration: 'per Week',
    note: 'Pause or Cancel Anytime',
    cta: 'Get Started',
    image: '/images/abstract-purple.png',
  },
  complexityScale: {
    title: "What's my Complexity Scale?",
    description: `In today's AI scaped world, a tech project's worth is measured by it's complexity. Measure yours with references.`,
    cta: '→',
  },
  roastMyProject: {
    title: 'Roast my Project.',
    description:
      'Your brilliant idea deserves some tough love. Our AI analyzes your startup concept or MVP and tells you what actually works—and what desperately needs fixing.',
    cta: '→',
  },
  bookCall: {
    highlights: [
      {
        icon: 'auto_graph', // 📊 Represents scalability and complexity growth
        title: 'Upto 10x Complexity Scale',
      },
      {
        icon: 'groups', // 👥 Represents teamwork and industry experts
        title: 'Work with Team of Industry Experts',
      },
    ],
    cta: 'Book a Call to Get a Quote.',
  },
};

const PricingSection = () => {
  return (
    <section className="bg-white p-6 pt-20 text-black md:p-16 xl:p-28">
      <div>
        <h1 className="flex flex-col text-center text-2xl font-bold md:max-w-[60%] md:gap-6 md:text-left md:text-4xl">
          <span>
            Bring your startup idea to life — Faster and more affordable than
            you think.
          </span>
        </h1>
        <div className="flex flex-col justify-between gap-6 md:w-full md:flex-row md:gap-0">
          <p className="md:text-md mx-auto mt-6 flex flex-col gap-1 text-center text-xs text-neutral-600 md:mx-0 md:max-w-[30%] md:text-left">
            <span>
              Rapid development, user-centric design, and investor-ready
              products. We specialize in building lean, scalable MVPs that get
              you noticed.
            </span>
          </p>
          <Button
            variant="outlined"
            className="flex justify-center gap-4 self-end rounded-full border-2 border-black py-2 text-sm md:ml-auto md:w-fit"
            text="See All Plans"
            startIcon="shoppingmode"
            endIcon={false}
            href="/pricing"
          />
        </div>
      </div>
      <PricingCards />
    </section>
  );
};

const PricingCards = () => {
  const { openForm } = useFilloutPopup();
  const router = useRouter();
  return (
    <div className="mt-16 grid max-h-min gap-6 xl:grid-cols-[1.5fr,1fr,1fr,1fr] xl:grid-rows-2">
      <SimpleMvpCard
        data={PricingSectionCards.simpleMvp}
        className="col-span-4 h-[inherit] bg-gray-100 shadow-none md:col-span-2 xl:col-span-1 xl:row-span-2"
        onActionClick={() => openForm(FilloutFormIds.SimpletonGetStarted)}
      />
      <SimpleMvpCard
        type="premiumMVPs"
        data={PricingSectionCards.premiumMVPs}
        className="col-span-4 flex h-[inherit] bg-gray-100 shadow-none md:col-span-2 xl:hidden"
        onActionClick={() => openForm(FilloutFormIds.BookCall)}
      />
      <PremiumMvpCardDesktop
        data={PricingSectionCards.premiumMVPs}
        style={{
          background: 'url("/images/abstract-purple.png") no-repeat',
        }}
        className="col-span-4 hidden h-[inherit] !bg-cover shadow-none xl:col-span-3 xl:block"
        onActionClick={() => openForm(FilloutFormIds.BookCall)}
      />
      <FeatureCard
        className="col-span-4 flex h-[inherit] flex-col justify-between bg-gray-100 p-6 shadow-none md:col-span-2 xl:col-span-1"
        data={PricingSectionCards.complexityScale}
        onActionClick={() => router.push('/complexity')}
      />
      <FeatureCard
        className="col-span-4 flex h-[inherit] flex-col justify-between bg-gray-100 p-6 shadow-none md:col-span-2 xl:col-span-1"
        data={PricingSectionCards.roastMyProject}
      />
      <CtaCard
        onActionClick={() => openForm(FilloutFormIds.BookCall)}
        className="col-span-4 flex h-[inherit] flex-col justify-between bg-black p-3 shadow-none xl:col-span-1"
      />
    </div>
  );
};

export default PricingSection;
