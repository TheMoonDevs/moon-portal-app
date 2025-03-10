import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { StickyBoundary } from './PricingPage';

const faq = [
  {
    question: 'Why should I choose your studio for MVP development?',
    answer:
      'We specialize in rapid MVP development tailored to startups. Our approach focuses on speed, efficiency, scalability, and delivering a product that meets your business goals while minimizing costs.',
  },
  {
    question: 'What is your typical timeline for MVP development?',
    answer:
      'Depending on the complexity of the project, timelines range from 3–4 weeks for Simpleton MVP to custom schedules for Complex MVPs.',
  },
  {
    question: 'How do you determine the features to include in my MVP?',
    answer:
      'We conduct a thorough analysis of your target audience, business goals, and competitive landscape. This helps us prioritize features that solve user pain points and deliver maximum value.',
  },
  {
    question: 'Can I make changes to the project scope during development?',
    answer:
      'Yes! We offer flexibility in our Premium and Complex MVP plans to accommodate evolving requirements.',
  },
  {
    question: 'Do you offer payment plans or refunds?',
    answer:
      'Yes! Flexible payment options are available for Premium and Complex tiers. Refund policies depend on project milestones achieved.',
  },
  {
    question: 'Are there any hidden costs?',
    answer:
      'No hidden costs! All expenses are transparently outlined before starting the project.',
  },
  {
    question: 'Do you provide post-launch support?',
    answer:
      'Yes! All plans include bug-fix support after launch. Complex MVPs also come with advanced support services like team-building assistance and scaling guidance.',
  },
  {
    question: 'Can you help me secure funding after launching my MVP? - Explore Partnership plan',
    answer:
      'Yes! We offer assistance in securing funding after launching your MVP through our Explore Partnership plan.',
  },
  {
    question: 'Can I customize my plan based on specific needs?',
    answer:
      'Absolutely! Complex MVPs are fully customizable to meet unique requirements such as regulatory compliance scanning or cross-chain compatibility.',
  },
  {
    question: 'How will I communicate with your team during development?',
    answer:
      'We offer multiple communication channels (Slack/Telegram/Email), daily worklog syncs (Premium & Complex), and weekly progress updates (Simpleton).',
  },
  {
    question: 'Will I have access to progress tracking tools?',
    answer:
      'Yes! All plans include a portal dashboard where you can monitor milestones and updates in real-time.',
  },
];

const Faqs = () => {
  return (
    <>
      <div className="relative w-full">
        <StickyBoundary className="absolute left-0 right-0 top-0 z-50" />

        <div className="flex flex-col items-start gap-y-6 text-black md:flex-row">
          <div className='md:sticky top-20'>
            <div className="hidden h-28 border-gray-200 md:block"></div>
            <div className="w-full pl-6 md:px-20 md:pl-10 md:pr-40">
              <h2 className="mt-10 hidden text-2xl font-bold !leading-[1.15] tracking-tight md:mt-0 md:block lg:text-4xl">
                Frequently <br /> asked <br /> questions.
              </h2>
              <h2 className="mt-10 w-full text-2xl font-bold !leading-[1.15] tracking-tight md:mt-0 md:hidden lg:text-4xl">
                Frequently asked questions.
              </h2>
            </div>
          </div>
          <div className="w-full border-l border-gray-200">
            <div className="hidden w-full grid-cols-2 grid-rows-1 divide-x divide-gray-200 border-b md:grid">
              <div className="h-28 w-full"></div>
              <div className="h-28 w-full"></div>
            </div>
            <Accordion className="w-full border-t">
              {faq.map(({ question, answer }, index) => (
                <AccordionItem
                  key={question}
                  className="w-full text-ellipsis p-6 py-4"
                  value={`question-${index}`}
                >
                  <AccordionTrigger className="text-left text-base font-bold">
                    {question}
                  </AccordionTrigger>
                  <AccordionContent className="w-full text-base text-neutral-600">
                    {answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

        {/* <StickyBoundary
          className="absolute  left-0 right-0 z-50"
          isAtBottom
        /> */}
      </div>
    </>
  );
};

export default Faqs;
