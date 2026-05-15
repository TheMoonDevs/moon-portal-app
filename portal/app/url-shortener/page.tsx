'use client';

import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { ShortUrlCard } from '@/components/screens/ShortUrl/ShortUrlCard';
import { ShortUrlList } from '@/components/screens/ShortUrl/ShortUrlList';

export default function URLShortnerPage() {
  return (
    <PageAccess isAuthRequired={true}>
      <Bottombar visible={true} />
      <div className="h overflow-hidden">
        <div className="flex items-center gap-2 rounded-lg pl-6 pt-6 text-neutral-900">
          <h1 className="flex items-center gap-4 text-3xl font-bold tracking-[0.01em]">
            <span className="material-icons-outlined -rotate-45 rounded-full border border-neutral-200 bg-neutral-100 p-2 text-blue-500">
              link
            </span>{' '}
            <span>URL Shortener</span>
          </h1>
        </div>
        <div className="flex items-start justify-center gap-6 pt-16">
          <div className="flex w-full flex-col items-center justify-center gap-8 max-sm:w-full md:flex-row">
            <div className="w-full md:mx-8 md:w-auto">
              <ShortUrlCard />
            </div>
            <div className="h-[80vh] grow overflow-hidden">
              <ShortUrlList />
            </div>
          </div>
        </div>
      </div>
    </PageAccess>
  );
}
