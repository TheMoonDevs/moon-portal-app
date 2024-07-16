import React from "react";

interface MetricCardProps {
  title: string;
  content: React.ReactNode;
  logo: React.ReactNode;
}

const MetricCard = ({ title, content, logo }: MetricCardProps) => (
  <div className="flex flex-col justify-between relative w-full md:w-[45%] p-4 md:p-6 shadow-md hover:shadow-lg cursor-pointer rounded-xl border border-neutral-400 mb-4 md:mb-6 bg-white">
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="font-semibold text-lg md:text-xl flex-1 mr-4">
          {title}
        </h1>
        <div className="flex-shrink-0 md:absolute top-5 right-5">{logo}</div>
      </div>
      <div className="text-sm md:text-base font-normal text-gray-700">
        {content}
      </div>
    </div>
  </div>
);

export default MetricCard;
