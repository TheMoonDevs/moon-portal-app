import { QuotesData } from "@/utils/constants/quotesData";

const randomQuote = QuotesData[Math.floor(Math.random() * QuotesData.length)];
export const StartSection = () => {
  return (
    <div className="p-8 mt-[30px] flex flex-col mx-2 mt-2 mb-3 gap-3 bg-white rounded-[1.15em]">
      <h4 className="text-2xl tracking-[0.1em] font-semibold text-lefy text-neutral-900 dark:text-neutral-100">
        {randomQuote.quote}
      </h4>
      <p className="text-left font-serif text-neutral-700 dark:text-neutral-300 text-sm mt-2">
        -- {randomQuote.author}
      </p>
    </div>
  );
};
