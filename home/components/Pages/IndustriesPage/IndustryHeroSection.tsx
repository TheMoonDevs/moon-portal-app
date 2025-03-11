import { cn } from '@/lib/utils';
import Image from 'next/image';
import React from 'react';

const IndustryHeroSection = () => {
  return (
    <div className="mx-4 mt-10 sm:-mt-10 md:-mt-0 lg:-mt-20">
      <div className="relative z-0 mx-auto mb-5 mt-20 flex h-[1400px] max-h-[1400px] w-full max-w-[550px] items-start sm:h-[120vh] sm:max-h-[1200px] sm:max-w-full sm:items-center md:mt-0 md:w-full lg:mb-6 lg:mt-20 xl:mb-8">
        <IndustriesPageHeading />
        <FloatingElement />
      </div>
    </div>
  );
};

const floatingAvatars = [
  { className: 'right-[3%] top-1/3 sm:right-[35%] sm:top-[5%] xl:top-[0%]' },
  {
    className:
      'left-0 top-[56.5%] sm:bottom-[60%] sm:left-[22%] sm:top-auto lg:bottom-[39%] lg:-left-[2%] xl:left-[16%] xl:bottom-[40.5%] xl:left-[12%]',
  },
  {
    className:
      'bottom-[12%] left-[3%] hidden sm:bottom-[0%] sm:left-auto sm:right-[9%] sm:block',
  },
];

const floatingTexts = [
  {
    text: 'StellaryAI',
    className: 'left-[0%] top-[34%] w-[90px] sm:left-auto sm:right-[5%] sm:top-[3%] sm:w-[105px]',
  },
  {
    text: 'BlockVerify',
    className: 'left-[0%] top-[34%] hidden w-[80px] sm:left-[20%] sm:top-[2%] sm:flex sm:w-[115px] xl:top-[1%]',
  },
  {
    text: 'YieldForge',
    className: 'bottom-[37%] left-[36%] w-[90px] sm:bottom-[50%] sm:left-[5%] sm:w-[105px] lg:bottom-[4%] xl:left-[3%]',
  },
  {
    text: 'AlgoTrade',
    className: 'bottom-[13.5%] left-[65%] w-[95px] sm:bottom-[5%] sm:left-[50%] sm:w-[105px] xl:left-[29%]',
  },
  {
    text: 'DigiCollect',
    className: 'w-[80px] sm:w-[105px] absolute bottom-[43%] right-[2%] xl:right-[12%]',
  },
];

const floatingTestimonialCards = [
  {
    company: 'SMART WALLETS',
    role: 'Founder of Minimatch',
    stats: { value: '7x', description: 'User growth' },
    user: 'NEIL SKALLI',
    className: 'left-[0%] top-[42%] w-[280px] sm:left-[1%] sm:top-[85%] sm:w-[290px] lg:top-[19%] xl:w-[300px]',
  },
  {
    company: 'CRYPTO & GEN AI',
    quote: 'Reduction in technical debt while accelerating our AI trading algorithm deployment.',
    stats: { value: '84%', description: 'Performance Boost' },
    user: 'ASAD BANGASH',
    role: 'Founder of StellaryAI',
    className: 'bottom-[0%] left-[0%] hidden w-[330px] sm:bottom-auto sm:left-[10%] sm:top-[15%] sm:block sm:w-[330px] lg:left-[34%] lg:top-[18%] lg:w-[360px] xl:left-[40%]',
  },
  {
    company: 'DeFi Protocol',
    role: 'Smart Contract Specialist',
    stats: { value: '42%', description: 'Gas Cost Reduction' },
    user: 'Marcus L.',
    className: 'bottom-[3%] left-[0%] w-[340px] sm:bottom-auto sm:left-auto sm:right-[0%] sm:top-[25%] sm:w-[300px] lg:w-[380px] xl:right-[2%] xl:top-[18%]',
  },
  {
    company: 'ML Solutions',
    role: 'Neural Architecture Design',
    stats: { value: '94%', description: 'Accuracy Rate' },
    user: 'Elena V.',
    className: 'absolute bottom-[17%] right-[0%] hidden w-[330px] sm:right-[1%] sm:w-[360px] xl:flex',
  },
  {
    company: 'Edge AI Systems',
    role: 'Edge AI Specialist',
    quote: 'Created ML models optimized for microcontrollers and IoT devices, reducing power consumption by 84% while maintaining 92% accuracy.',
    user: 'Leila H.',
    className: 'bottom-[22%] right-[0%] w-[330px] sm:left-[4%] sm:right-auto sm:w-[350px] lg:bottom-[19%] lg:left-[7%] lg:w-[400px]',
  },
  {
    company: 'LINKTREE',
    role: 'Customer Support Director',
    quote: 'Increase in automated support resolution within just six days of implementation.',
    user: 'DANE BURGESS',
    stats: { value: '42%', description: 'Resolution Rate' },
    className: 'right-[0%] top-[20%] w-[330px] sm:bottom-[20%] sm:top-auto sm:w-[350px] lg:left-[50%] lg:right-auto lg:w-[420px] xl:bottom-[12%] xl:left-[39%]',
  },
  {
    company: 'DAO Governance',
    role: 'Founder of CommunityDAO',
    quote: 'Higher voting participation after implementing our decentralized governance framework.',
    user: 'SOPHIA CHEN',
    stats: { value: '5.3x', description: 'Participation' },
    className: 'left-[10%] top-[28%] z-[1] w-[160px] border blur-[8px] backdrop-blur-[1px] sm:left-[15%] sm:w-[180px]',
  },
  {
    company: 'NFT Marketplace',
    role: 'CTO of DigiCollect',
    quote: 'Decrease in transaction failures with optimized smart contract implementation.',
    user: 'MARCUS LEE',
    stats: { value: '68%', description: 'Success Rate' },
    className: 'bottom-[22%] left-[2%] z-[1] w-[160px] border blur-[8px] backdrop-blur-[1px] sm:left-[65%] sm:w-[300px] xl:bottom-[10%] xl:left-[4%]',
  },
  {
    company: 'DeFi Analytics',
    role: 'CEO of YieldForge',
    quote: 'Average time to deploy advanced liquidity pool strategies, down from 4 hours.',
    user: 'RACHEL PETERSON',
    stats: { value: '10min', description: 'Deploy Time' },
    className: 'right-[10%] top-[12%] z-[1] aspect-video w-[340px] blur-[8px] backdrop-blur-[1px] sm:right-[3%] sm:w-[300px]',
  },
  {
    company: 'ML Trading',
    role: 'Founder of AlgoTrade',
    quote: 'Improvement in prediction accuracy through novel transformer architecture.',
    user: 'JAMES WONG',
    stats: { value: '31%', description: 'Accuracy Boost' },
    className: 'bottom-[8%] right-[10%] z-[1] w-[160px] blur-[8px] backdrop-blur-[1px] sm:right-[15%] sm:w-[180px]',
  },
  {
    company: 'Web3 Identity',
    role: 'CISO of BlockVerify',
    quote: 'Authentication success rate with zero compromised accounts since implementation.',
    user: 'ELIZA JOHNSON',
    stats: { value: '99.9%', description: 'Success Rate' },
    className: 'bottom-[22%] right-[10%] z-[1] w-[160px] blur-[8px] backdrop-blur-[1px] sm:right-[40%] sm:w-[300px]',
  },
];

const FloatingElement = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {floatingAvatars.map((avatar, index) => (
        <FloatingAvatars key={index} className={avatar.className} />
      ))}
      {floatingTexts.map((text, index) => (
        <FloatingTexts
          key={index}
          text={text.text}
          className={text.className}
        />
      ))}
      {floatingTestimonialCards.map((card, index) => (
        <FloatingTestimonialCard key={index} {...card} />
      ))}
    </div>
  );
});

const FloatingAvatars = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    imageUrl?: string;
  }
>(({ className, ...props }, ref) => {
  return (
    <div
      className={cn(
        'absolute !z-[11] h-[100px] w-[100px] overflow-hidden will-change-transform sm:h-[120px] sm:w-[120px] lg:h-[130px] lg:w-[130px] xl:h-[160px] xl:w-[160px]',
        className,
      )}
    >
      <Image
        src={props.imageUrl || '/images/assets/web3Game-n.png'}
        alt="avatar"
        width={100}
        height={100}
        className="aspect-square w-full object-cover object-center"
      />
    </div>
  );
});

const FloatingTexts = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    text: string;
  }
>(({ className, ...props }, ref) => {
  return (
    <div
      className={cn(
        'absolute z-[10] flex aspect-square items-center justify-center border border-neutral-500/20 bg-white p-3 backdrop-blur-[3px] will-change-transform md:p-4',
        className,
      )}
    >
      <span>{props.text}</span>
    </div>
  );
});

const IndustriesPageHeading = () => {
  return (
    <div className="relative z-[12] mx-auto w-full max-w-[1920px] px-3">
      <div className="mx-auto w-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#F5F2F0] via-transparent to-transparent sm:w-8/12 md:w-1/2 lg:w-3/4 lg:py-[10%] xl:w-[50%]">
        <h2 className="text-center text-4xl font-bold sm:text-3xl lg:text-4xl xl:text-5xl">
          Hundreds of businesses have already seen transformational results
        </h2>
      </div>
    </div>
  );
};
export default IndustryHeroSection;

//--------------------FLOATING TESTIMONIAL CARDS ---------------------------------------------------------
type CardHeaderProps = {
  company?: string;
};
const CardHeader: React.FC<CardHeaderProps> = ({ company }) => {
  if (!company) return null;
  return (
    <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest">
      <span className="inline-block h-2 w-2 bg-orange-500" />
      {company}
    </div>
  );
};

type CardStatsProps = {
  value: string;
  description: string;
};
const CardStats: React.FC<CardStatsProps> = ({ value, description }) => (
  <div className="text-6xl font-bold">
    {value}
    <p className="text-sm text-gray-600">{description}</p>
  </div>
);

type CardQuoteProps = {
  text: string;
};
const CardQuote: React.FC<CardQuoteProps> = ({ text }) => (
  <p className="text-sm text-gray-800">{text}</p>
);

type CardFooterProps = {
  user?: string;
  role?: string;
};
const CardFooter: React.FC<CardFooterProps> = ({ user, role }) => {
  if (!user || !role) return null;
  return (
    <div className="mt-2 border-t border-gray-300 pt-2">
      <p className="text-xs font-bold uppercase">{user}</p>
      <p className="text-xs text-gray-600">{role}</p>
    </div>
  );
};

type TestimonialCardProps = {
  company?: string;
  stats?: { value: string; description: string };
  quote?: string;
  user?: string;
  role?: string;
  className?: string;
};
const FloatingTestimonialCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & TestimonialCardProps
>(({ company, stats, quote, user, role, className }, ref) => {
  return (
    <div
      className={cn(
        'absolute z-[10] border border-neutral-500/20 bg-white p-3 backdrop-blur-[3px] will-change-transform md:p-4',
        className,
      )}
    >
      <blockquote>
        <CardHeader company={company} />
        {stats && (
          <CardStats value={stats.value} description={stats.description} />
        )}
        {quote && <CardQuote text={quote} />}
        <CardFooter user={user} role={role} />
      </blockquote>
    </div>
  );
});
