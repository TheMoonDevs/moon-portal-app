import { BaseCard } from '@/components/elements/Card';
import Image from 'next/image';
import { PricingSectionCards } from './PricingSection';
import Button from '@/components/elements/Button';

interface SimpleMvpDataProps extends React.HTMLAttributes<HTMLDivElement> {
  data:
    | typeof PricingSectionCards.simpleMvp
    | typeof PricingSectionCards.premiumMVPs;
}
const SimpleMvpCardMedia = ({ image }: { image: string }) => (
  <Image
    src={image}
    className="h-[revert-layer] w-full object-cover md:h-fit"
    alt=""
    width={300}
    height={300}
  />
);

const SimpleMvpCardHeader = ({ title }: { title: string }) => {
  const [firstWord, secondWord] = title.split(' ');
  return (
    <div className="flex flex-col gap-1 pl-6 pt-12 text-2xl font-bold text-white">
      <span className="lowercase">{firstWord}</span>
      <span className="text-5xl">{secondWord}</span>
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
    <div className="w-full p-8">
      <ul className="flex flex-col gap-3">
        {data.content.map((item) => (
          <li>
            <div className="flex items-center gap-2 text-sm xl:text-sm 2xl:text-lg">
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-neutral-600">{item.title}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-col gap-3">
        <p className="text-right font-bold">{data.priceDuration}</p>
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
          <p className="text-5xl font-bold">{data.price}</p>
        </div>
        <p className="text-right text-xs">{data.note}</p>
      </div>
    </div>
  );
};

const SimpleMvpCardActions = ({ cta }: { cta: string }) => {
  return (
    <div className="w-full p-4">
      <Button
        text={cta}
        className="flex w-full items-center justify-between rounded-full bg-red-500 px-8 text-xl hover:bg-red-600 hover:text-white md:float-right md:w-fit xl:w-full"
      />
    </div>
  );
};

const SimpleMvpCard = ({ className, data }: SimpleMvpDataProps) => {
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
      cardActions={<SimpleMvpCardActions cta={cta} />}
    />
  );
};

export default SimpleMvpCard;
