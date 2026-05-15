import type { ROOTTYPE } from '@db/client';

import { BreadCrumbs } from '../elements/BreadCrumbs';
import { ViewButtonGroup } from '../LinkList/ViewButtonGroup';

export default function QuicklinkHeaderWrapper({
  children,
  custom = false,
  title,
  withBreadcrumb,
  icon,
  type,
}: {
  children?: React.ReactNode;
  custom?: boolean;
  title: string;
  withBreadcrumb?: {
    rootType: ROOTTYPE;
  };
  icon?: string;
  type?: 'folder' | 'link';
}) {
  return (
    <header className="flex items-center justify-between">
      {custom && children}
      {!custom &&
        (!withBreadcrumb ? (
          <div className="flex w-full items-start justify-between max-sm:items-center">
            <h1 className="flex items-start gap-4 text-3xl font-bold max-sm:items-center max-sm:text-xl">
              {icon && icon !== '' ? (
                <span className="material-symbols-outlined rounded-full border border-neutral-200 p-2">
                  {icon}
                </span>
              ) : (
                <span className="material-symbols-outlined rounded-full border border-neutral-200 p-2 uppercase">
                  folder
                </span>
              )}
              <div className="flex items-center gap-6">
                <span>{title.toUpperCase()}</span>
              </div>
            </h1>
            {type === 'link' && <ViewButtonGroup />}
          </div>
        ) : (
          <div className="flex flex-col items-start justify-start">
            <h1 className="flex items-start gap-4 text-3xl font-bold max-sm:text-2xl">
              {icon && icon !== '' ? (
                <span className="material-symbols-outlined rounded-full border border-neutral-200 p-2">
                  {icon}
                </span>
              ) : (
                <span className="material-symbols-outlined rounded-full border border-neutral-200 p-2">
                  folder
                </span>
              )}
              <div className="flex flex-col">
                <div className="flex items-center gap-6">
                  <span>{title.toUpperCase()}</span>
                </div>
                <BreadCrumbs rootType={withBreadcrumb.rootType} />
              </div>
            </h1>
          </div>
        ))}
    </header>
  );
}
