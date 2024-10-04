import Image from "next/image";
import React, { useState, useEffect } from "react";
export type CountryInfo = {
  countryName: string;
  countryCode: string;
};

export const useCountryInfo = (): {
  countryInfo: CountryInfo | null;
  error: Error | null;
} => {
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchCountryInfo = async () => {
      try {
        const response = await fetch("https://ipapi.co/json");
        if (!response.ok) {
          throw new Error("Failed to fetch IP information");
        }
        const data = await response.json();
        const { country, country_calling_code } = data;

        setCountryInfo({
          countryName: country,
          countryCode: country_calling_code,
        });
        setLoading(false);
      } catch (error) {
        if (error instanceof Error) {
          console.error("Error fetching IP information:", error);
          setError(error);
        } else {
          console.error("Error fetching IP information:", String(error));
          setError(new Error(String(error)));
        }
        setLoading(false);
      }
    };

    fetchCountryInfo();
  }, []);

  return { countryInfo: loading ? null : countryInfo, error };
};
