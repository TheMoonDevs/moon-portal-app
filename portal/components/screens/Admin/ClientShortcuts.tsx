import { ClientUtilityLink } from '@prisma/client';
import Image from 'next/image';
import React, { useState } from 'react';

export interface GroupedClientUtilityLink {
  clientName: string;
  avatar: string;
  shortcuts: ClientUtilityLink[];
}

const ClientShortcuts = ({
  shortcut,
}: {
  shortcut: GroupedClientUtilityLink;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  console.log(shortcut);
  return (
    <div
      className="cursor-poiinter flex w-full items-center justify-between rounded-md border border-neutral-600 p-2 text-white hover:bg-neutral-700"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center">
        <Image
          src={shortcut.avatar || '/user-avatar.svg'}
          alt=""
          width={40}
          height={40}
          className="mr-2 h-10 w-10 rounded-full border-none bg-white object-cover"
        />
        <p className="text-sm font-medium text-neutral-300 md:text-base">
          {shortcut.clientName}
        </p>
      </div>
      <span className="material-symbols-outlined">
        {!isExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_up'}
      </span>
    </div>
  );
};

export default ClientShortcuts;
