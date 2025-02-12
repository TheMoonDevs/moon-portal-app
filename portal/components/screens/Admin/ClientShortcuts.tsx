import { Spinner } from '@/components/elements/Loaders';
import { PortalSdk } from '@/utils/services/PortalSdk';
import Image from 'next/image';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { ClientUtilityLink } from '@prisma/client';

export interface GroupedClientUtilityLink {
  clientName: string;
  avatar: string;
  shortcuts: ClientUtilityLink[];
}

const ClientShortcuts = ({
  shortcut,
  isExpanded,
  handleExpand,
  handleEditShortcut,
}: {
  shortcut: GroupedClientUtilityLink;
  handleExpand: () => void;
  isExpanded: boolean;
  handleEditShortcut: (shortcut: ClientUtilityLink) => void;
}) => {
  const [deletingShortcutId, setDeletingShortcutId] = useState<string | null>(
    null,
  );

  const handleDelete = async (id: string) => {
    setDeletingShortcutId(id);
    try {
      const res = await PortalSdk.deleteData(`/api/client-shortcuts`, {
        id,
      });
      shortcut.shortcuts = shortcut.shortcuts.filter((sc) => sc.id !== id);
      toast.success('Shortcut deleted successfully');
    } catch (e) {
      console.log(e);
      toast.error('Error deleting shortcut');
    } finally {
      setDeletingShortcutId(null);
    }
  };

  return (
    shortcut.shortcuts.length > 0 && (
      <>
        <div
          className="cursor-poiinter flex w-full items-center justify-between rounded-md border border-neutral-600 p-2 text-white hover:bg-neutral-700"
          onClick={handleExpand}
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
            {isExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_up'}
          </span>
        </div>
        {isExpanded && (
          <div className="mt-0 max-h-64 overflow-y-auto overscroll-x-none rounded-md border border-neutral-600 p-3">
            {shortcut.shortcuts.map((sc) => (
              <div
                key={sc.id}
                className="mb-2 flex items-center justify-between rounded-md bg-neutral-800 p-2 hover:bg-neutral-700"
              >
                <div className="flex items-center gap-2">
                  <p className='text-2xl'>{sc.icon}</p>
                  <div className="flex w-[60%] flex-col items-start">
                    <p className="w-full truncate text-neutral-200">
                      {sc.title}
                    </p>
                    <p className="w-full truncate text-xs text-neutral-400">
                      {sc.url}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    className="text-gray-400 hover:text-gray-600"
                    onClick={() => handleEditShortcut(sc)}
                  >
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button
                    className="text-red-400 hover:text-red-600"
                    onClick={() => handleDelete(sc.id)}
                    disabled={deletingShortcutId === sc.id}
                  >
                    {deletingShortcutId === sc.id ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <span className="material-symbols-outlined">delete</span>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    )
  );
};

export default ClientShortcuts;
