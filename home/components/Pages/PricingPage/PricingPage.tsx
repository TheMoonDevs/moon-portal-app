'use client';

import Button from '@/components/elements/Button';
import { BaseCard } from '@/components/elements/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Testimonial } from './Testimonial';
import Faqs from './Faqs';
import {
  FilloutFormIds,
  useFilloutPopup,
} from '@/components/App/Global/FilloutPopup';
import { cn } from '@/lib/utils';
import { describe } from 'node:test';
import { CardDescription } from '@/components/ui/card';

const Plans = [
  {
    name: 'Simpleton MVP',
    description:
      'The perfect starting place for your project. fixed price of 3,999$.',
    features: [
      { icon: 'speed_2x', title: 'Upto 2x complexity' },
      { icon: 'sync', title: 'End to End solution (design + build + deploy)' },
      { icon: 'phone_callback', title: '2 free consults  <-> fractional CTOs' },
      { icon: 'reply', title: 'Email / Slack / Telgram support' },
      { icon: 'schedule', title: '100% on-time delivery' },
      { icon: 'timeline', title: 'Portal Dashboard to track progress' },
      { icon: 'task_alt', title: 'Weekly sync with project lead' },
      { icon: 'handshake', title: 'Long term support for bug-fixes' },
    ],
    buttonText: 'Start a New Project',
    highlight: true,
  },
  {
    name: 'Premium MVP',
    description:
      'Everything you need to build and scale your web app, from $2,999/week.',
    features: [
      { icon: 'stacks', title: 'Upto 4x complexity' },
      { icon: 'speed', title: 'Double Speed & Efficiency' },
      { icon: 'vital_signs', title: 'Daily worklogs Sync' },
      { icon: 'safety_divider', title: '4+ hrs of Timezone Overlap' },
      { icon: 'partner_exchange', title: 'Direct Team communication access' },
      { icon: 'currency_exchange', title: 'Investor Network Access' },
      { icon: 'bolt', title: 'Intensive MVP-Sprint support' },
      { icon: 'front_hand', title: 'Pause / Cancel anytime' },
    ],
    buttonText: 'Start a free trial',
    highlight: false,
  },
  {
    name: 'Complex MVP',
    description: 'Critical security, performance, observability and support.',
    features: [
      { icon: '✔', title: 'Guest & Team access controls' },
      { icon: '✔', title: 'SCIM & Directory Sync' },
      { icon: '✔', title: 'Managed WAF Rulesets' },
      { icon: 'explore', title: 'Multi-region compute & failover' },
      { icon: 'rocket_launch', title: '99.99% SLA' },
      { icon: '✔', title: 'Advanced Support' },
      { icon: 'category', title: 'Scale up & Team building support' },
    ],
    buttonText: 'Request Trial',
    extraButton: 'Contact Sales',
    highlight: false,
  },
];

const UnitPlans = [
  {
    icon: 'all_inclusive',
    name: 'Fullstack Dev',
    description: 'Engage Sr.Developers with 6+ years in all industries & stacks',
    buttonText: 'Start Engagement',
    price: '32 - 52$ per hour',
    highlight: false,
    unitPlan: true,
    features: [
    ],
  },
  {
    icon: 'verified',
    name: 'Fractional CTO',
    description: 'Consult with industry experts for guidance & tech advice',
    buttonText: 'Book a call',
    price: '150 - 400$ per hour',
    highlight: true,
    unitPlan: true,
    features: [
    ],
  },
  {
    icon: 'desktop_cloud',
    name: 'DevOps Engineer',
    description: 'Automate & Architect your cloud infrastructure',
    buttonText: 'Start Engagement',
    price: '38 - 92$ per hour',
    highlight: false,
    unitPlan: true,
    features: [
    ],
  },
  {
    icon: 'draw',
    name: 'UX/UI Engineer',
    description: 'Hybrid developers with stunning design skills',
    buttonText: 'Start Engagement',
    price: '36 - 85$ per hour',
    highlight: false,
    unitPlan: true,
    features: [
    ],
  },
  {
    icon: 'content_cut',
    name: 'Code Review',
    description: 'Do you have an AI made app & need an expert review?',
    buttonText: 'Start Engagement',
    price: '25$ per ~3k codelines',
    highlight: false,
    unitPlan: true,
    features: [
    ],
  },
  {
    icon: 'shape_line',
    name: 'Tech lead',
    description: 'Need to train your new startup tech team ?',
    buttonText: 'Book a call',
    price: '8k - 16k$ per month',
    highlight: false,
    unitPlan: true,
    features: [
    ],
  },
  {
    name: 'Not sure what to pick ?',
    expandeble: true,
    description: 'TheMoonDevs is a cohort of passionate devs, who are always interested in challenging projects & discuss exciting ideas.',
    extraButton: 'Book a call to discuss',
    buttonText: 'Ask Chatbot for help',
    highlight: true,
    unitPlan: true,
    features: [
      { icon: 'phone_callback', title: 'Free Consultation & Support.' },
      { icon: 'task_alt', title: 'No commitment required.' },
      { icon: 'hourglass_empty', title: 'We take at max. 24hrs to get back.' },
    ],
  },
  // {
  //   icon: 'draw',
  //   name: 'UX/UI Engineer',
  //   description: 'Hybrid developers with stunning design skills',
  //   buttonText: 'Start Engagement',
  //   price: '36 - 85$ per hour',
  //   highlight: false,
  //   unitPlan: true,
  //   features: [
  //   ],
  // },
]

interface IPlan {
  name: string;
  description: string;
  highlight: boolean;
  features: { icon: string; title: string }[];
  buttonText: string;
  price?: string;
  icon?: string
  extraButton?: string;
  unitPlan?: boolean;
  expandeble?: boolean;
}

export const StickyBoundary = ({
  className,
  isAtBottom,
}: {
  className?: string;
  isAtBottom?: boolean;
}) => {
  return (
    <div
      className={cn('top-24 z-20 flex items-center justify-center', className)}
    >
      <span
        className={cn(
          'absolute -left-[0.5rem] -top-[1rem] z-20 text-xl font-bold text-gray-400',

          isAtBottom && '-bottom-[0.8rem] top-[unset]',
        )}
      >
        +
      </span>
      <div
        className={cn(
          'absolute left-0 right-0 top-0 h-[1px] bg-gray-100',
          isAtBottom && 'bottom-0 top-[unset]',
        )}
      ></div>
      <span
        className={cn(
          'absolute -right-[0.5rem] -top-[1rem] text-xl font-bold text-gray-400',
          isAtBottom && '-bottom-[0.8rem] top-[unset]',
        )}
      >
        +
      </span>
    </div>
  );
};
const PricingPage = () => {
  return (
    <main className="flex flex-col items-center justify-center bg-white">
      <div className="mt-20 w-11/12 border border-gray-200 md:mt-40 md:w-9/12">
        <StickyBoundary className="sticky top-16 md:top-24" />
        <div className="relative">
          {/* <StickyBoundary
            className="absolute bottom-0 left-0 right-0 z-50"
            isAtBottom
          /> */}
          <Header />
          <PricingTabs />
        </div>
        <Testimonial />
        <Faqs />
      </div>
    </main>
  );
};

const Header = () => (
  <div className="mt-20 flex flex-col items-center gap-4 px-4">
    <h1 className="text-center text-4xl font-bold text-black md:text-5xl">
      Find a plan to power your projects.
    </h1>
    <p className="text-center text-neutral-600 md:text-xl">
      From early-stage startups to growing enterprises, Vercel has you covered.
    </p>
  </div>
);

const PricingTabs = () => {
  const { openForm } = useFilloutPopup();

  return (
    <Tabs defaultValue="mvp" className="mt-10 flex w-full flex-col">
      <TabsList className="mx-auto w-80 md:w-96">
        <TabsTrigger className="w-full" value="mvp">
          MVP Plans
        </TabsTrigger>
        <TabsTrigger className="w-full" value="unit">
          Unit Plans
        </TabsTrigger>
      </TabsList>
      <TabsContent
        value="mvp"
        className="mx-auto mt-16 grid grid-rows-3 justify-center divide-y-[1px] divide-gray-200 border-b border-t border-gray-200 md:grid-cols-3 md:grid-rows-1 md:divide-x-[1px] md:divide-y-0"
      >
        {Plans.map((plan, index) => {
          return (
            <PlanCards
              plan={plan}
              index={index}
              key={plan.name}
              onActionClick={(_plan) => {
                if (_plan.name === 'Simpleton MVP') {
                  openForm(FilloutFormIds.SimpletonGetStarted);
                } else if (_plan.name === 'Premium MVP') {
                  openForm(FilloutFormIds.BookCall);
                } else if (_plan.name === 'Complex MVP') {
                  openForm(FilloutFormIds.BookCall);
                }
              }}
            />
          );
        })}
      </TabsContent>
      <TabsContent value="unit" className='grid grid-cols-1 sm:grid-cols-2  divide-y-[1px] divide-gray-200  border-b border-t border-gray-200 lg:grid-cols-4 md:divide-x-[1px] md:divide-y-[1px]'>
        {UnitPlans.map((plan, index) => (
          <PlanCards
            plan={plan}
            index={index}
            key={plan.name}
            onActionClick={(_plan) => {

            }}
          />
        ))}
      </TabsContent>
    </Tabs>
  );
};

const PlanCards = ({
  plan,
  index,
  onActionClick,
}: {
  plan: IPlan;
  index: number;
  onActionClick: (plan: IPlan) => void;
}) => (
  <div className={`relative ${plan.expandeble ? 'md:col-span-2' : 'md:col-span-1'
    }`}>
    {index === 0 && <StickyBoundary className="block md:hidden" />}
    <StickyBoundary isAtBottom className="block md:hidden" />
    <BaseCard
      className={`${plan.highlight ? 'bg-white' : 'bg-gray-50'} w-full rounded-none p-6 shadow-none`}
      key={plan.name}
      cardHeader={
        <h1 className={`${plan.unitPlan ? "mb-0" : "mb-4"} mt-8 text-2xl font-bold text-black flex flex-col items-start gap-2`}>
          {plan.icon &&
            <span className='material-symbols-outlined inherit h-[1.2em]'>{plan.icon}</span>
          }
          {plan.name}
        </h1>
      }
      cardActions={<PlanCardActions plan={plan} onClick={onActionClick} />}
      cardContent={<PlanCardContent plan={plan} index={index} />}
    />
    {index === 0 && (
      <div className="absolute -top-9 rounded-tr-xl bg-black px-4 py-2 text-sm text-white">
        <span>Popular</span>
      </div>
    )}
  </div>
);

const PlanCardActions = ({
  plan,
  onClick,
}: {
  plan: IPlan;
  onClick: (plan: IPlan) => void;
}) => {
  return (
    <>
      {!plan.extraButton && (
        <Button
          variant="outlined"
          className={`mb-8 mt-8 w-full gap-8 rounded-full border border-gray-300 px-4 py-2 text-sm ${plan.highlight ? 'border-none bg-blue-500 text-white hover:bg-blue-600' : ''}`}
          endIcon={'arrow_forward'}
          text={plan.buttonText}
          onClick={() => onClick(plan)}
        />
      )}

      {plan.extraButton && (
        <div className="flex gap-4">
          <Button
            variant="outlined"
            className={`mb-8 mt-8 gap-8 rounded-full border border-gray-300 bg-black px-4 py-2 text-sm text-white hover:bg-neutral-800 `}
            endIcon={'arrow_forward'}
            text={plan.extraButton}
          />
          <Button
            variant="outlined"
            className={`hidden sm:block mb-8 mt-8 w-full rounded-full border border-gray-300 bg-white px-4 py-2 text-sm ${plan.highlight && !plan.expandeble ? 'border-none bg-blue-500 text-white hover:bg-blue-600' : ''}`}
            endIcon={false}
            text={plan.buttonText}
          />
        </div>
      )}
    </>
  );
};
const PlanCardContent = ({ plan, index }: { plan: IPlan; index: number }) => {
  return (
    <div className="text-black">
      <p className="my-4 mb-8 text-base text-neutral-600">{plan.description}</p>
      <ul className="flex flex-col gap-3">
        {plan.name === Plans[0].name && (
          <li className="text-sm text-neutral-500">
            <span>Turnaround in <b>3-4 weeks</b></span>
          </li>
        )}
        {plan.name === Plans[1].name && (
          <li className="text-sm text-neutral-500">
            <span>Everyting in Simple MVP, plus:</span>
          </li>
        )}
        {plan.name === Plans[2].name && (
          <li className="text-sm text-neutral-500">
            <span>Everyting in Premium MVP, plus:</span>
          </li>
        )}
        {plan.unitPlan && plan.price && (
          <li className="text-lg text-neutral-500">
            <span>{plan.price}</span>
          </li>
        )}
        {plan.features.map((feature, index) => {
          return (
            <li key={feature.title} className="flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined">{feature.icon}</span>
              <span className="text-neutral-500">{feature.title}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
export default PricingPage;
