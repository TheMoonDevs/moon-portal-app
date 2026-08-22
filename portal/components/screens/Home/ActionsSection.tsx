/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';

import { APP_ROUTES, APP_SOCIAL } from '@/utils/constants/appInfo';

const LINKS = [
  {
    icon: 'task_alt',
    title: 'All My Worklogs',
    route: APP_ROUTES.userWorklogs,
    color: 'green',
  },
  {
    icon: 'description',
    title: 'Worksheets',
    route: APP_ROUTES.worksheets,
    color: 'sky',
  },
  {
    icon: 'open_in_new',
    title: 'URL Shortener',
    route: APP_ROUTES.urlShortener,
    color: 'rose',
  },
  {
    icon: '/images/thirdparty/slack.png',
    title: 'Chat with the Team',
    route: APP_SOCIAL.slack,
    color: 'fuchsia',
    openNew: true,
  },
  {
    icon: '/images/thirdparty/notion.png',
    title: 'Team Notion',
    route: APP_SOCIAL.notion,
    color: 'neutral',
    openNew: true,
  },
];

export const ActionsSection = () => {
  return (
    <div className="mx-3 mt-6 flex flex-col gap-3 overflow-hidden rounded-[1.15em] border border-neutral-400">
      <div className="flex flex-col">
        {LINKS.map((link) => (
          <Link
            key={link.title}
            href={link.route}
            target={link.openNew ? '_blank' : '_self'}
          >
            <div className="flex flex-row items-center gap-4 border-b border-neutral-200 bg-white px-5 py-3 text-xl hover:bg-white/70">
              {link.icon.startsWith('/') ? (
                <img
                  src={link.icon}
                  alt={link.title}
                  className="mx-[-5px] size-8 rounded-full object-contain object-center"
                />
              ) : (
                <span
                  className={`icon_size material-symbols-outlined text-${link.color}-500`}
                >
                  {link.icon}
                </span>
              )}

              <p className="font-regular mb-0 text-[0.75em]">{link.title}</p>
              <span className="icon_size material-symbols-outlined ml-auto text-neutral-800">
                chevron_right
              </span>
            </div>
          </Link>
        ))}
      </div>
      <span className="hidden text-fuchsia-500 text-rose-500 text-sky-500"></span>
    </div>
  );
};
