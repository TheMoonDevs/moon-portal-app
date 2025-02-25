import { BaseCard } from '@/components/elements/Card';
import { PricingSectionCards } from './PricingSection';
import Button from '@/components/elements/Button';

const CtaCardContent = () => {
  const highlights = PricingSectionCards.bookCall.highlights;
  return (
    <ul className="flex flex-col gap-3 p-4">
      {highlights.map((item) => (
        <li>
          <div className="flex items-center gap-2 text-sm text-white">
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="text-gray-300">{item.title}</span>
          </div>
        </li>
      ))}
    </ul>
  );
};

const CtaCardActions = () => {
  const cta = PricingSectionCards.bookCall.cta;
  return (
    <Button
      variant="outlined"
      bgUrl="/images/abstract-golden.png"
      text={<span className="max-w-44 text-left">{cta}</span>}
      className="mt-4 md:mt-10 flex w-full items-center justify-between gap-10 rounded-lg border-2 border-yellow-400 text-white xl:mt-0"
    />
  );
};

const CtaCard = ({ className }: { className?: string }) => {
  return (
    <BaseCard
      className={className}
      cardContent={<CtaCardContent />}
      cardActions={<CtaCardActions />}
    />
  );
};

export default CtaCard;
