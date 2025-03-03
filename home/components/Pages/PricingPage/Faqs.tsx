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
    question: 'What is your return policy?',
    answer:
      'You can return unused items in their original packaging within 30 days for a refund or exchange. Contact support for assistance.',
  },
  {
    question: 'How do I track my order?',
    answer:
      'Track your order using the link provided in your confirmation email, or log into your account to view tracking details.',
  },
  {
    question: 'Do you ship internationally?',
    answer:
      'Yes, we ship worldwide. Shipping fees and delivery times vary by location, and customs duties may apply for some countries.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept Visa, MasterCard, American Express, PayPal, Apple Pay, and Google Pay, ensuring secure payment options for all customers.',
  },
  {
    question: 'What if I receive a damaged item?',
    answer:
      'Please contact our support team within 48 hours of delivery with photos of the damaged item. We’ll arrange a replacement or refund.',
  },
];

const Faqs = () => {
  return (
    <>
      <div className="relative w-full">
        <StickyBoundary
          className="absolute bottom-0 left-0 right-0 z-50"
          isAtBottom
        />
        <div className="flex flex-col items-start gap-y-6 text-black md:flex-row">
          <div>
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
      </div>
    </>
  );
};

export default Faqs;
