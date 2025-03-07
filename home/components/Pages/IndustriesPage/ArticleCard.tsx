import { cn } from '@/lib/utils';
import { QuoteIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const ArticleCard = ({
  article,
  theme,
}: {
  article: any;
  theme: 'dark' | 'light';
}) => {
  if (!article.image_url) {
    return (
      <Link href={article.link} className="flex flex-col justify-between gap-2">
        <div
          className={cn(
            'flex h-[250px] w-full items-center justify-center p-4',
            theme === 'dark' ? 'text-white' : 'text-black',
          )}
        >
          <p
            className={cn(
              'p-4',
              theme === 'dark' ? 'text-white' : 'text-black',
            )}
          >
            <QuoteIcon className="rotate-180 transform" />
            <span className="block px-4 text-[2.5rem] leading-tight">
              <span className="">{article.description}</span>
            </span>
            <QuoteIcon className="float-right" />
          </p>
        </div>
        <div
          className={cn('p-4', theme === 'dark' ? 'text-white' : 'text-black')}
        >
          <h2 className="text-xl font-bold">{article.title}</h2>
          <div
            className="my-4 h-[14px] w-full bg-repeat-x opacity-30"
            style={{
              backgroundImage:
                'url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiI+PHBhdGggZmlsbD0idHJhbnNwYXJlbnQiIGQ9Ik0wIDBoMTJ2MTJIMHoiLz48Y2lyY2xlIGN4PSI2IiBjeT0iNiIgcj0iMS41IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==)',
            }}
          ></div>
          <div className="flex justify-between">
            <div className="flex gap-4">
              {article.stats.map((stats: any) => (
                <p className="flex flex-col">
                  <span className="font-bold">{stats?.value || ''}</span>
                  <span className="text-xs text-neutral-400">
                    {stats?.description || ''}
                  </span>
                </p>
              ))}
            </div>
            <p className="relative h-fit font-bold text-white after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-white after:transition-all after:duration-200 after:ease-in after:content-[''] group-hover:after:w-full">
              <span className="block">Read →</span>
            </p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={article.link} className="flex flex-col justify-between gap-2">
      <div className="w-full">
        <Image
          src={article.image_url || '/images/abstract-red.png'}
          alt={article.title}
          width={300}
          height={500}
          className="h-[250px] w-full"
          objectFit="cover"
          objectPosition="center"
        />
      </div>
      <div
        className={cn('p-4', theme === 'dark' ? 'text-white' : 'text-black')}
      >
        <h2 className="text-xl font-bold">{article.title}</h2>
        <div
          className={cn(
            'my-4 h-[14px] w-full bg-repeat-x',
            theme === 'dark' ? 'opacity-30' : 'opacity-80',
          )}
          style={{
            backgroundImage:
              'url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiI+PHBhdGggZmlsbD0idHJhbnNwYXJlbnQiIGQ9Ik0wIDBoMTJ2MTJIMHoiLz48Y2lyY2xlIGN4PSI2IiBjeT0iNiIgcj0iMS41IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==)',
          }}
        ></div>
        <div
          className={cn(
            'flex justify-between',
            theme === 'dark' ? 'text-white' : 'text-black',
          )}
        >
          <p className="w-2/3 text-neutral-400">{article.description}</p>
          <p
            className={cn(
              "relative h-fit font-bold after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-white after:transition-all after:duration-200 after:ease-in after:content-[''] group-hover:after:w-full",
              theme === 'dark' ? 'after:bg-white' : 'after:bg-black',
            )}
          >
            <span className="block">Read →</span>
          </p>
        </div>
      </div>
    </Link>
  );
};

export default ArticleCard;
