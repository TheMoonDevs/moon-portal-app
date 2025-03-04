import { BaseCard } from '@/components/elements/Card';
import Image from 'next/image';
import { PricingSectionCards } from './PricingSection';
import Button from '@/components/elements/Button';

interface SimpleMvpDataProps extends React.HTMLAttributes<HTMLDivElement> {
  data:
  | typeof PricingSectionCards.simpleMvp
  | typeof PricingSectionCards.premiumMVPs;
  onActionClick?: () => void;
}
const SimpleMvpCardMedia = ({ image }: { image: string }) => (
  <Image
    src={image}
    className="md:aspect-video h-40 w-full object-cover md:h-44"
    alt=""
    width={300}
    height={300}
  />
);

const SimpleMvpCardHeader = ({ title }: { title: string }) => {
  const [firstWord, secondWord] = title.split(' ');
  return (
    <div className="flex flex-col gap-1 pl-6 pt-12 text-2xl font-bold text-white">
      <span className="text-sm md:text-md lowercase">{firstWord}</span>
      <span className="text-4xl md:text-5xl">{secondWord}</span>
    </div>
  );
};

const SimpleMvpCardContent = ({
  data,
}: {
  data: {
    content: {
      icon: string;
      title: string;
    }[];
    note: string;
    price: string;
    priceDuration: string;
  };
}) => {
  return (
    <div className="w-full pt-4 px-4 md:p-8">
      <ul className="flex flex-col gap-3">
        {data.content.map((item) => (
          <li>
            <div className="flex items-center gap-2 text-xs xl:text-sm 2xl:text-lg">
              <span className="material-symbols-outlined inherit">{item.icon}</span>
              <span className="text-neutral-600">{item.title}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-1 md:mt-3 flex flex-col gap-1 md:gap-3">
        <p className="text-right font-bold text-sm md:text-md">{data.priceDuration}</p>
        <div className="flex items-center gap-4">
          {/* <div className="w-full border-t-2 border-dashed border-neutral-500"></div> */}
          <div className="w-full">
            <Image
              src={'/images/dashed-line.svg'}
              alt=""
              className="w-full"
              width={200}
              height={200}
            />
          </div>
          <p className="text-4xl font-bold">{data.price}</p>
        </div>
        <p className="text-right text-xs">{data.note}</p>
      </div>
    </div>
  );
};

const SimpleMvpCardActions = ({ cta, onClick }: {
  cta: string, onClick?: () => void
}) => {
  return (
    <div className="w-full p-2 md:p-4">
      <Button
        text={cta}
        onClick={onClick}
        className="flex w-full text-sm items-center justify-between rounded-full bg-red-500 px-8 md:text-xl hover:bg-red-600 hover:text-white xl:w-full"
      />
    </div>
  );
};

const SimpleMvpCard = ({ className, data, onActionClick }: SimpleMvpDataProps) => {
  const { title, image, cta, highlights } = data;
  return (
    <BaseCard
      cardType="overlayed"
      className={className}
      cardMedia={<SimpleMvpCardMedia image={image} />}
      cardHeader={<SimpleMvpCardHeader title={title} />}
      cardContent={
        <SimpleMvpCardContent
          data={{
            content: highlights,
            note: data.note,
            price: data.price,
            priceDuration: data.priceDuration,
          }}
        />
      }
      cardActions={<SimpleMvpCardActions cta={cta} onClick={onActionClick} />}
    />
  );
};

export default SimpleMvpCard;
