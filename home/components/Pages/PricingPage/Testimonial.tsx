import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

const testimonials = [
  {
    company: 'SHARESIES',
    stat: '70%',
    description: 'Resolution rate with Fin',
    author: {
      name: 'RUBY PICTON',
      role: 'Investor Care Lead',
    },
  },
  {
    company: 'ROBIN',
    description:
      "The numbers speak for themselves. We're seeing a 50% resolution rate with Fin, which is pretty amazing!",
    author: {
      name: 'BEN PEAK',
      role: 'Director, Technical Support',
    },
  },
  {
    company: 'DENTAL INTELLIGENCE',
    stat: '97%',
    description: 'Fin CSAT Score',
    author: {
      name: 'SAM MILLER',
      role: 'Customer Support Operations Manager',
    },
  },
  {
    company: 'LINKTREE',
    description:
      'Within six days, Fin started resolving 42% of conversations and surpassed my expectations.',
    author: {
      name: 'DANE BURGESS',
      role: 'Customer Support Director',
    },
  },
];

interface Testimonial {
  company: string;
  stat?: string;
  description: string;
  author: {
    name: string;
    role: string;
  };
}

export function Testimonial() {
  return (
    <div className="mx-full-bleed flex h-screen flex-col items-center justify-center bg-black p-6 px-8">
      <Header />
      <CarouselContainer />
    </div>
  );
}

function Header() {
  return (
    <div className="mb-8 py-6">
      <h1 className="w-full text-3xl md:w-10/12 md:text-5xl">
        Thousands of businesses have already seen transformational results.
      </h1>
    </div>
  );
}

function CarouselContainer() {
  return (
    <Carousel className="w-full">
      <CarouselContent className="-ml-1">
        {testimonials.map((testimonial, index) => (
          <TestimonialCard key={index} testimonial={testimonial} />
        ))}
      </CarouselContent>
      <CarouselControls />
    </Carousel>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const { company, stat, description, author } = testimonial;

  return (
    <CarouselItem className="pl-1 md:basis-1/2 lg:basis-1/3">
      <div className="p-1">
        <Card className="rounded-sm border-neutral-600 bg-black p-0 shadow-none">
          <CardContent className="flex h-60 items-start justify-start p-0 px-4 py-2">
            <div className="grid w-full grid-cols-1 grid-rows-[1.8fr_1fr] justify-between divide-y divide-neutral-600 text-white">
              <div>
                <CompanyHeader company={company} />
                {stat && <div className="my-2 text-5xl font-bold">{stat}</div>}
                {description && (
                  <p className="text-sm text-gray-400">{description}</p>
                )}
              </div>
              <AuthorDetails author={author} />
            </div>
          </CardContent>
        </Card>
      </div>
    </CarouselItem>
  );
}

function CompanyHeader({ company }: { company: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="h-2.5 w-2.5 bg-orange-500"></span>
      <div className="text-sm font-semibold uppercase">{company}</div>
    </div>
  );
}

function AuthorDetails({
  author,
}: {
  author: {
    name: string;
    role: string;
  };
}) {
  return (
    <div className="mt-4 self-end py-4">
      <p className="text-sm font-semibold">{author.name}</p>
      <p className="text-xs text-gray-500">{author.role}</p>
    </div>
  );
}

function CarouselControls() {
  return (
    <div className="mt-8 flex gap-3 bg-black">
      <CarouselPrevious className="static bg-neutral-800" />
      <CarouselNext className="static bg-neutral-800" />
    </div>
  );
}
