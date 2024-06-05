"use client";

import { ShortUrlList } from "@/components/screens/ShortUrl/ShortUrlList";
import { ShortUrlCard } from "@/components/screens/ShortUrl/ShortUrlCard";
import { PageAccess } from "@/components/global/PageAccess";
import Link from "next/link";
import { APP_ROUTES } from "@/utils/constants/appInfo";

export default function URLShortnerPage() {
  return (
    <PageAccess isAuthRequired={true}>
      <Link
        href={APP_ROUTES.home}
        className="cursor-pointer rounded-lg p-2 pt-3 flex items-center gap-2 text-neutral-900 hover:text-neutral-700"
      >
        <span className="icon_size material-icons">arrow_back</span>
        <h1 className="uppercase tracking-[0.2em] font-mono text-xl">Back</h1>
      </Link>
      <div className="flex items-center justify-center min-h-screen bg-gray-50 gap-6">
        <div className="flex gap-10 justify-center w-4/5 max-sm:flex-col max-sm:w-[90%]">
          <ShortUrlList />
          <ShortUrlCard />
        </div>
      </div>
    </PageAccess>
  );
}
