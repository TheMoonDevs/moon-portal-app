import Button from '@/components/elements/Button';
import { BaseCard } from '@/components/elements/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Testimonial } from './Testimonial';
import Faqs from './Faqs';

const Plans = [
  {
    name: 'Simple MVP',
    description:
      'The perfect starting place for your web app or personal project. Free forever.',
    features: [
      { icon: '✔', title: 'Import your repo, deploy in seconds' },
      { icon: '✔', title: 'Automatic CI/CD' },
      { icon: '✔', title: 'Fluid compute' },
      { icon: '✔', title: 'Traffic & performance insights' },
      { icon: '✔', title: 'DDoS Mitigation' },
      { icon: '✔', title: 'Web Application Firewall' },
      { icon: '✔', title: 'Community Support' },
    ],
    buttonText: 'Start Deploying',
    highlight: true,
  },
  {
    name: 'Premium MVP',
    description:
      'Everything you need to build and scale your web app, from $20/month.',
    features: [
      { icon: '✔', title: '10x more included infrastructure usage' },
      { icon: '✔', title: 'Observability tools' },
      { icon: '✔', title: 'Faster builds' },
      { icon: '✔', title: 'Cold start prevention' },
      { icon: '✔', title: 'Advanced WAF Protection' },
      { icon: '✔', title: 'Email support' },
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
      { icon: '✔', title: 'Multi-region compute & failover' },
      { icon: '✔', title: '99.99% SLA' },
      { icon: '✔', title: 'Advanced Support' },
    ],
    buttonText: 'Request Trial',
    extraButton: 'Contact Sales',
    highlight: false,
  },
];

interface IPlan {
  name: string;
  description: string;
  highlight: boolean;
  features: { icon: string; title: string }[];
  buttonText: string;
  extraButton?: string;
}
const PricingPage = () => {
  return (
    <main className="flex flex-col items-center justify-center bg-white">
      <div className="mt-20 w-11/12 border border-gray-200 md:mt-40 md:w-9/12">
        <Header />
        <PricingTabs />
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

const PricingTabs = () => (
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
        return <PlanCards plan={plan} index={index} key={plan.name} />;
      })}
    </TabsContent>
    <TabsContent value="unit"></TabsContent>
  </Tabs>
);

const PlanCards = ({ plan, index }: { plan: IPlan; index: number }) => (
  <div className="relative">
    <BaseCard
      className={`${plan.highlight ? 'bg-white' : 'bg-gray-50'} w-full rounded-none p-6 shadow-none`}
      key={plan.name}
      cardHeader={
        <h1 className="mb-4 mt-8 text-2xl font-bold text-black">{plan.name}</h1>
      }
      cardActions={<PlanCardActions plan={plan} />}
      cardContent={<PlanCardContent plan={plan} index={index} />}
    />
    {index === 0 && (
      <div className="absolute -top-9 rounded-tr-xl bg-black px-4 py-2 text-sm text-white">
        <span>Popular</span>
      </div>
    )}
  </div>
);

const PlanCardActions = ({ plan }: { plan: IPlan }) => {
  return (
    <>
      {!plan.extraButton && (
        <Button
          variant="outlined"
          className={`mb-8 mt-8 w-full gap-8 rounded-full border border-gray-300 px-4 py-2 text-sm ${plan.highlight ? 'border-none bg-blue-500 text-white hover:bg-blue-600' : ''}`}
          endIcon={'arrow_forward'}
          text={plan.buttonText}
        />
      )}

      {plan.extraButton && (
        <div className="flex gap-4">
          <Button
            variant="outlined"
            className={`mb-8 mt-8 gap-8 rounded-full border border-gray-300 bg-black px-4 py-2 text-sm text-white hover:bg-neutral-800 ${plan.highlight ? 'border-none bg-blue-500 text-white hover:bg-blue-600' : ''}`}
            endIcon={'arrow_forward'}
            text={plan.extraButton}
          />
          <Button
            variant="outlined"
            className={`mb-8 mt-8 w-full rounded-full border border-gray-300 bg-white px-4 py-2 text-sm ${plan.highlight ? 'border-none bg-blue-500 text-white hover:bg-blue-600' : ''}`}
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
        {index === 1 && (
          <li className="text-sm text-neutral-500">
            <span>Everyting in Simple MVP, plus:</span>
          </li>
        )}
        {index === 2 && (
          <li className="text-sm text-neutral-500">
            <span>Everyting in Premium MVP, plus:</span>
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
