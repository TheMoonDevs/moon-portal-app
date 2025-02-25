import { PricingSectionCards } from './PricingSection';
import Button from '@/components/elements/Button';
import { BaseCard } from '@/components/elements/Card';

interface PremiumMvpDataProps {
  data: typeof PricingSectionCards.premiumMVPs;
}
const PremiumMvpCardHeader = ({ data }: PremiumMvpDataProps) => {
  const [firstWord, secondWord] = data.title.split(' ');

  return (
    <div className="w-2/3 py-10 pl-6">
      <div className="flex flex-col gap-1 text-2xl font-bold text-white">
        <span className="lowercase">{firstWord}</span>
        <span className="text-5xl">{secondWord}</span>
      </div>
      <ul className="mt-8 grid grid-cols-2 gap-3">
        {data.highlights.map((item, index) => (
          <li
            key={index}
            className="flex items-center gap-2 text-sm text-white"
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const PremiumCardDivider = () => (
  // <div className="my-auto h-4/5 w-px border-l border-dashed border-neutral-200"></div>
  <svg
    className="my-auto"
    width="20"
    height="250"
    viewBox="0 0 20 250"
    xmlns="http://www.w3.org/2000/svg"
  >
    <line
      x1="10"
      y1="0"
      x2="10"
      y2="250"
      stroke="white"
      strokeWidth="1"
      strokeDasharray="10,10"
    />
  </svg>
);

const PremiumMvpCardContent = ({ data }: PremiumMvpDataProps) => (
  <div className="mt-6 flex w-1/2 flex-col justify-end gap-3 p-4 text-white">
    <p className="text-right">
      <span className="text-base font-semibold">
        <span className="text-5xl font-bold">{data.price}</span>{' '}
        {data.priceDuration}
      </span>
    </p>
    <p className="text-right text-xs">{data.note}</p>
  </div>
);

const PremiumCardHorizontal = ({ data }: PremiumMvpDataProps) => (
  <div className="flex h-full">
    <PremiumMvpCardHeader data={data} />
    <PremiumCardDivider />
    <PremiumMvpCardContent data={data} />
  </div>
);

const PremiumMvpCardActions = ({ data }: PremiumMvpDataProps) => (
  <div className="absolute right-0 top-0 p-4">
    <Button
      variant="outlined"
      text={data.cta}
      className="flex w-full items-center justify-between gap-4 rounded-full border-gray-200 px-3 py-1 text-sm font-normal text-white hover:text-black"
    />
  </div>
);

interface PremiumMvpCardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  data: typeof PricingSectionCards.premiumMVPs;
}

const PremiumMvpCardDesktop: React.FC<PremiumMvpCardProps> = ({
  className,
  data,
  ...props
}) => {
  return (
    <BaseCard
      {...props}
      className={`relative ${className || ''}`}
      cardContent={<PremiumCardHorizontal data={data} />}
      cardActions={<PremiumMvpCardActions data={data} />}
    />
  );
};

export default PremiumMvpCardDesktop;
