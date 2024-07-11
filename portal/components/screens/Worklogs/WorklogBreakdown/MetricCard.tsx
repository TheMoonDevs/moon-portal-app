import React from "react";

interface MetricCardProps {
  title: string;
  content: React.ReactNode;
  logo: React.ReactNode;
}


const MetricCard = ({ title, content, logo }: MetricCardProps) => (
  <div className="flex flex-col justify-between w-full md:w-[45%] p-4 shadow-md hover:shadow-lg cursor-pointer rounded-xl border border-neutral-400 mb-4 md:mb-0">
    <div>
      <div className="flex justify-between items-center mb-3">
        <h1 className="font-semibold text-base md:text-xl">{title}</h1>
        {logo}
      </div>
      <div className="text-sm md:text-base font-normal">{content}</div>
    </div>
  </div>
);

export default MetricCard;

