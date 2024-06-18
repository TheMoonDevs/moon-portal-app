import React from "react";
import { Card, CardContent, Typography } from "@mui/material";

interface MetricCardProps {
  title: string;
  content: React.ReactNode;
}

const MetricCard = ({ title, content }: MetricCardProps) => (
  <Card className=" flex flex-col justify-between w-[45%] p-2 shadow-md hover:shadow-lg cursor-pointer rounded-xl border border-neutral-200">
    <CardContent>
      <h1 className="font-semibold mb-3">{title}</h1>
      {content}
    </CardContent>
  </Card>
);

export default MetricCard;
