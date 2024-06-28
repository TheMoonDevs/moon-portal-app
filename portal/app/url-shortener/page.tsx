"use client";

import { ShortUrlList } from "@/components/screens/ShortUrl/ShortUrlList";
import { ShortUrlCard } from "@/components/screens/ShortUrl/ShortUrlCard";
import { PageAccess } from "@/components/global/PageAccess";
import Link from "next/link";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import { Bottombar } from "@/components/global/Bottombar";

export default function URLShortnerPage() {
  return (
    <PageAccess isAuthRequired={true}>
      <Bottombar visible={true} />
      <div className=" h overflow-hidden ">
        <div className="cursor-pointer rounded-lg pl-4 p-2 pt-3 flex items-center gap-2 text-neutral-900   ">
          <h1 className=" tracking-[0.01em] text-3xl font-bold">
            URL Shortener
          </h1>
        </div>
        <div className="flex items-start justify-center gap-6 pt-16">
          <div className="flex flex-col gap-8 items-center justify-center w-full max-sm:flex-col-reverse max-sm:w-full">
            <ShortUrlCard />
            <ShortUrlList />
          </div>
        </div>
      </div>
    </PageAccess>
  );
}
