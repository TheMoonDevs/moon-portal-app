import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';
import { features } from './WhyChooseUsData';
import { cn } from '@/lib/utils';

const FeatureListItems = () => {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <div className="lg:px-8 lg:py-6">
      <div className="grid gap-6 border-t border-neutral-600 lg:grid-cols-2 lg:py-6 lg:pb-24">
        {/* Left Side - List */}
        <div className="w-full divide-y-[1px] lg:w-9/12">
          {features.map((feature, index) => (
            <Link
              href={`#${feature.id}`}
              className="flex w-full items-center justify-center gap-4"
              onMouseEnter={() => setHovered(index.toString())}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                key={index}
                className={`group flex w-full cursor-pointer items-center justify-center gap-4 border-black px-4 py-3 hover:bg-black hover:text-white md:justify-start`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-black text-lg font-bold group-hover:bg-white group-hover:text-black`}
                >
                  {index + 1}
                </span>
                <span className="text-lg font-semibold">{feature.title}</span>
              </div>
              <div className="hidden md:block">
                <AnimatedText
                  hovered={hovered}
                  setHovered={setHovered}
                  hoveredId={index.toString()}
                  text={feature.traits}
                />
              </div>
            </Link>
          ))}
        </div>

        {/* Right Side - Image */}
        <div>
          <img
            src="/path-to-your-image.jpg" // Change to the actual image path
            alt="Futuristic Scene"
            className="h-auto w-full"
          />
        </div>
      </div>

      <div className="mt-6 border-t border-black"></div>
    </div>
  );
};

export default FeatureListItems;

const AnimatedText = ({
  text,
  hovered,
  setHovered,
  hoveredId,
}: {
  text: string;
  hovered: string | null;
  hoveredId: string;
  setHovered: (hovered: string | null) => void;
}) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [textWidth, setTextWidth] = useState(0);

  useLayoutEffect(() => {
    if (textRef.current) {
      setTextWidth(textRef.current.offsetWidth);
    }
  }, []);

  return (
    <div
      className={cn(
        'group relative flex w-fit cursor-pointer items-center justify-center text-lg font-bold',
        hovered === hoveredId
          ? 'translate-x-12 transform delay-100 duration-300 ease-in-out'
          : '',
      )}
      // onMouseEnter={() => setHovered(true)}
      // onMouseLeave={() => setHovered(false)}
    >
      {/* Left "<" */}
      <span
        className="text-black opacity-50 transition-all duration-300 ease-in"
        style={{
          transform:
            hovered === hoveredId
              ? `translateX(-${textWidth / 2}px)`
              : 'translateX(0)',
          opacity: hovered === hoveredId ? 1 : 0.2,
        }}
      >
        {'<'}
      </span>

      {/* Hidden Spacer (Ensures brackets move based on word width) */}
      <span className="pointer-events-none absolute opacity-0" ref={textRef}>
        {text}
      </span>

      {/* Speed Text (Appears Smoothly) */}
      <span
        className={`absolute transition-all duration-300 ease-in ${
          hovered === hoveredId ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      >
        {text}
      </span>

      {/* Right ">" */}
      <span
        className="text-black opacity-50 transition-all duration-300 ease-in"
        style={{
          transform:
            hovered === hoveredId
              ? `translateX(${textWidth / 1.8}px)`
              : 'translateX(0)',
          opacity: hovered === hoveredId ? 1 : 0.2,
        }}
      >
        {'/>'}
      </span>
    </div>
  );
};
