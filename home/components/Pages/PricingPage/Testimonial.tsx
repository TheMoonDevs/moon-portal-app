import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { StickyBoundary } from './PricingPage';

const testimonials = [
  {
    company: 'SMART WALLETS (0 GAS FEES)',
    stat: '7x',
    description: 'User growth seen in record time due to quick implementation of Smart Wallets.',
    author: {
      name: 'NEIL SKALLI',
      role: 'Founder of Minimatch',
    },
  },
  {
    company: 'CRYPTO <-> GEN AI',
    stat: '84%',
    description: 'Reduction in technical debt while accelerating our AI trading algorithm deployment.',
    author: {
      name: 'ASAD BANGASH',
      role: 'Founder of StellaryAI',
    },
  },
  {
    company: 'GenAI Quiz App',
    stat: '97%',
    description: 'Customer satisfaction score after integrating personalized learning paths.',
    author: {
      name: 'SAM MILLER',
      role: 'CPO of EdTech Innovators',
    },
  },
  {
    company: 'LINKTREE',
    stat: '42%',
    description: 'Increase in automated support resolution within just six days of implementation.',
    author: {
      name: 'DANE BURGESS',
      role: 'Customer Support Director',
    },
  },
  {
    company: 'DAO <-> GOVERNANCE',
    stat: '5.3x',
    description: 'Higher voting participation after implementing our decentralized governance framework.',
    author: {
      name: 'SOPHIA CHEN',
      role: 'Founder of CommunityDAO',
    },
  },
  {
    company: 'NFT MARKETPLACE REBORN',
    stat: '68%',
    description: 'Decrease in transaction failures with optimized smart contract implementation.',
    author: {
      name: 'MARCUS LEE',
      role: 'CTO of DigiCollect',
    },
  },
  {
    company: 'DeFi <-> ANALYTICS',
    stat: '10min',
    description: 'Average time to deploy advanced liquidity pool strategies, down from 4 hours.',
    author: {
      name: 'RACHEL PETERSON',
      role: 'CEO of YieldForge',
    },
  },
  {
    company: 'ML TRADING BOT',
    stat: '31%',
    description: 'Improvement in prediction accuracy through novel transformer architecture.',
    author: {
      name: 'JAMES WONG',
      role: 'Founder of AlgoTrade',
    },
  },
  {
    company: 'WEB3 <-> IDENTITY',
    stat: '99.9%',
    description: 'Authentication success rate with zero compromised accounts since implementation.',
    author: {
      name: 'ELIZA JOHNSON',
      role: 'CISO of BlockVerify',
    },
  },
  {
    company: 'METAVERSE STUDIO',
    stat: '74%',
    description: 'Reduction in 3D asset loading times while maintaining rendering quality.',
    author: {
      name: 'ALEX RIVERA',
      role: 'CTO of ImmerseTech',
    },
  },
  {
    company: 'AI <-> CONTENT MODERATION',
    stat: '67%',
    description: 'Decrease in false positive flags while improving actual violation detection.',
    author: {
      name: 'SAMIR PATEL',
      role: 'CEO of TrustGuard',
    },
  },
  {
    company: 'TOKEN GATING PRO',
    stat: '5x',
    description: 'Increase in premium content engagement after implementing seamless verification.',
    author: {
      name: 'OLIVIA MARTINEZ',
      role: 'Founder of AccessChain',
    },
  },
  {
    company: 'DAPP DASHBOARD',
    stat: '91%',
    description: 'Engineering time saved through automated analytics and monitoring solutions.',
    author: {
      name: 'WILLIAM TAYLOR',
      role: 'CTO of BlockMonitor',
    },
  },
  {
    company: 'GPT <-> SMART CONTRACTS',
    stat: '94%',
    description: 'Accuracy in automated contract auditing, catching vulnerabilities pre-deployment.',
    author: {
      name: 'LINDA CHANG',
      role: 'Founder of SecureChain',
    },
  },
  {
    company: 'IndustrialPulse',
    stat: '78%',
    description: 'Reduction in equipment downtime since implementing their AI solution.',
    author: {
      name: 'ELEANOR CHEN',
      role: 'CTO of IndustrialEdge',
    },
  },
  {
    company: 'CROSS-CHAIN <-> NFT',
    stat: '3.2x',
    description: 'Trading volume increase within first month due to seamless cross-chain functionality.',
    author: {
      name: 'MARCUS JOHNSON',
      role: 'Founder of OmniCollect',
    },
  },
  {
    company: 'DesignSync Pro',
    stat: '67%',
    description: 'Reduced our design iteration cycles while improving team coordination.',
    author: {
      name: 'SOPHIA MARTINEZ',
      role: 'CPO of DesignSphere',
    },
  },
  {
    company: 'MediSync Offline',
    stat: '91%',
    description: 'Fewer documentation errors in rural healthcare initiatives.',
    author: {
      name: 'DR. JAMES WILSON',
      role: 'Founder of MedConnect',
    },
  },
  {
    company: 'LLM <-> LEGAL DOCS',
    stat: '30x',
    description: 'Faster contract analysis with higher accuracy than our previous manual process.',
    author: {
      name: 'VICTORIA ROBERTS',
      role: 'COO of LegalStream',
    },
  },
  {
    company: 'StreamRT',
    stat: '200ms',
    description: 'Sub-200ms latency achieved across global participants, revolutionizing our virtual events.',
    author: {
      name: 'ALEXANDER HUGHES',
      role: 'CEO of LiveConnect',
    },
  },
  {
    company: 'ZERO-GAS <-> COMPLIANCE',
    stat: '86%',
    description: 'Reduction in transaction costs while maintaining full regulatory compliance.',
    author: {
      name: 'SARAH NAKAMOTO',
      role: 'Founder of PrivacyFinance',
    },
  },
  {
    company: 'AccessTix',
    stat: '26%',
    description: 'Increase in conversion rates among users with accessibility needs.',
    author: {
      name: 'MICHAEL THOMPSON',
      role: 'CEO of InclusiveEvents',
    },
  },
  {
    company: 'KANJI <-> AI LEARNING',
    stat: '47%',
    description: 'Higher vocabulary retention compared to traditional learning methods.',
    author: {
      name: 'YUKI TANAKA',
      role: 'Founder of LinguaVerse',
    },
  },
  {
    company: 'VisualEdge IoT',
    stat: '60fps',
    description: 'Smooth visualization performance even on legacy industrial hardware.',
    author: {
      name: 'OMAR PATEL',
      role: 'CTO of SensorSync',
    },
  }
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
    <div className="relative z-40 mx-full-bleed flex h-screen flex-col items-center justify-center bg-black p-6 px-8 xl:px-[12rem]">
      <Header />
      <CarouselContainer />
    </div>
  );
}

function Header() {
  return (
    <div className="mb-8 py-6">
      <h1 className="w-full text-3xl md:w-10/12 md:text-5xl">
        Hundreds of businesses have already seen transformational results.
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
