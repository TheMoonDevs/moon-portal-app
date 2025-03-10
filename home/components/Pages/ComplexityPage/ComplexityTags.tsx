import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { COMPLEXITY_DATA } from './ComplexityFunnel';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
} from '@/components/ui/carousel';
import useEmblaCarousel from 'embla-carousel-react';

export default function ComplexitySelector() {
  const [selectedComplexity, setSelectedComplexity] = useState(
    COMPLEXITY_DATA[0].id,
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
      {/* Horizontal Complexity Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b pb-2">
        {COMPLEXITY_DATA.map(({ id }) => (
          <Button
            key={id}
            onClick={() => setSelectedComplexity(id)}
            variant={selectedComplexity === id ? 'default' : 'outline'}
          >
            {id}
          </Button>
        ))}
      </div>

      {/* Cards Display */}
      <Carousel
        className="my-6 mb-8 w-full px-6"
        opts={{
          slidesToScroll: 2,
        }}
      >
        <CarouselContent className="-ml-1">
          {COMPLEXITY_DATA.find(
            ({ id }) => id === selectedComplexity,
          )?.tags.map(({ icon, title, description }, index) => (
            <CarouselItem className="basis-1/2 pl-1 md:basis-1/2 lg:basis-1/3">
              <ComplexityCard
                key={index}
                icon={icon}
                title={title}
                description={description}
                selectedComplexity={selectedComplexity}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselControls />
      </Carousel>
    </div>
  );
}

function CarouselControls() {
  return (
    <div className="mt-8 flex w-full items-center justify-center gap-3">
      <CarouselPrevious className="static" />
      <CarouselNext className="static" />
    </div>
  );
}

const ComplexityCard = ({
  icon,
  title,
  description,
  selectedComplexity,
}: {
  icon: string;
  title: string;
  description: string;
  selectedComplexity: string;
}) => {
  const { api } = useCarousel();
  useEffect(() => {
    api?.scrollTo(0);
  }, [selectedComplexity]);

  return (
    <Card className="h-[200px] rounded-none p-0 shadow-none">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-4 pb-2">
        <Image src={icon} alt={''} width={24} height={24} />
        <CardTitle className="m-0 p-0">{title}</CardTitle>
      </CardHeader>
      <CardContent className="line-clamp-5 p-4 pt-0 text-xs text-neutral-500">
        {description}
      </CardContent>
    </Card>
  );
};
