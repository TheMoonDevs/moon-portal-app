import React from "react";

interface MetricCardProps {
  title: string;
  content: React.ReactNode;
  logo: React.ReactNode;
}

const MetricCard = ({ title, content, logo }: MetricCardProps) => (
  <div className="flex flex-col justify-between w-[45%] p-4 shadow-md hover:shadow-lg cursor-pointer rounded-xl border border-neutral-400  ">
    <div>
      <div className="flex justify-between">
        <h1 className="font-semibold mb-3 text-xl">{title}</h1>
        {logo}
      </div>
      <div className="text-base font-normal">{content}</div>
    </div>
  </div>
);

export default MetricCard;
