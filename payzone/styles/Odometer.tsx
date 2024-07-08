import "./Odometer.style.css";
import { useEffect, useRef } from "react";

interface OdometerProps {
  value: number;
}

const Odometer: React.FC<OdometerProps> = ({ value }) => {
  const odometerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (odometerRef.current) {
      odometerRef.current.setAttribute("data-value", `${value} INR`);
    }
  }, [value]);

  return <span ref={odometerRef} className="odometer"></span>;
};

export default Odometer;
