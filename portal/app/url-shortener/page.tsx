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
        <div className="rounded-lg pt-6 pl-6 flex items-center gap-2 text-neutral-900   ">
          <h1 className=" tracking-[0.01em] text-3xl font-bold flex gap-4 items-center">
            <span className="material-icons-outlined bg-neutral-100 p-2 rounded-full text-blue-500 -rotate-45 border border-neutral-200">
              link
            </span>{" "}
            <span>URL Shortener</span>
          </h1>
        </div>
        <div className="flex items-start justify-center gap-6 pt-16">
          <div className="flex flex-col md:flex-row gap-8 items-center justify-center w-full max-sm:w-full">
            <div className="w-full md:w-auto md:mx-8">
              <ShortUrlCard />
            </div>
            <div className="flex-grow h-[80vh] overflow-hidden">
              <ShortUrlList />
            </div>
          </div>
        </div>
      </div>
    </PageAccess>
  );
}
