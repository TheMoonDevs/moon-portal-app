import { useEffect, useState } from "react";

interface Transaction {
  amount: number;
}

const useTotalEarned = (transactions: Transaction[]) => {
  const [totalEarned, setTotalEarned] = useState<number>(0);

  useEffect(() => {
    const calculateTotalEarned = () => {
      const total = transactions.reduce((acc, transaction) => {
        return acc + transaction.amount;
      }, 0);
      setTotalEarned(total);
    };

    calculateTotalEarned();
  }, [transactions]);

  return { totalEarned };
};

export default useTotalEarned;
