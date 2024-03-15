"use client";

import { ShortUrlList } from "@/components/screens/ShortUrl/ShortUrlList";
import { ShortUrlCard } from "@/components/screens/ShortUrl/ShortUrlCard";

export default function URLShortnerPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 gap-6">
      <div className="flex gap-10 justify-center w-4/5">
        <ShortUrlList />
        <ShortUrlCard />
      </div>
    </div>
  );
}
