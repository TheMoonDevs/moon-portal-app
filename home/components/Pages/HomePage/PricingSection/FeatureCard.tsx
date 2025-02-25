import { BaseCard } from '@/components/elements/Card';
import { PricingSectionCards } from './PricingSection';
import Button from '@/components/elements/Button';

interface FeatureCardProps {
  data:
    | typeof PricingSectionCards.complexityScale
    | typeof PricingSectionCards.roastMyProject;
  className?: string;
}

const FeatureCard = ({ data, className }: FeatureCardProps) => {
  return (
    <BaseCard
      className={className}
      cardContent={
        <div className="flex flex-col justify-between gap-4 justify-self-start">
          <h2 className="flex-1 text-2xl font-extrabold">{data.title}</h2>
          <p className="justify-self-end text-sm text-neutral-600">
            {data.description}
          </p>
        </div>
      }
      cardActions={
        <Button
          variant="outlined"
          className="flex w-fit items-center justify-between gap-4 self-end justify-self-end rounded-full border-black px-6 py-0 hover:bg-gray-200"
        />
      }
    />
  );
};

export default FeatureCard;
