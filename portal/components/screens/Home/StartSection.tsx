import { QuotesData } from '@/utils/constants/quotesData';

const randomQuote = QuotesData[Math.floor(Math.random() * QuotesData.length)];
export const StartSection = () => {
  return (
    <div className="mx-2 mb-3 mt-4 flex flex-col gap-3 rounded-[1.15em] bg-white p-8">
      <h4 className="text-lefy text-2xl font-semibold tracking-widest text-neutral-900">
        {randomQuote.quote}
      </h4>
      <p className="mt-2 text-left font-serif text-sm text-neutral-700">
        -- {randomQuote.author}
      </p>
    </div>
  );
};
