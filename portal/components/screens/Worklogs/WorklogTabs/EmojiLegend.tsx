import React, { useEffect, useState } from 'react';

import { EMOJI_LEGEND } from '@/lib/worklogs/emoji';

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 font-mono text-[11px] text-neutral-600 shadow-sm">
    {children}
  </kbd>
);

const EmojiLegend = () => {
  // Alt is called Option (⌥) on a Mac.
  const [alt, setAlt] = useState('Alt');
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent))
      setAlt('⌥');
  }, []);

  return (
    <>
      <p className="my-4 text-lg font-bold">Emoji Legend</p>
      <ul className="flex flex-col gap-1.5 text-sm">
        {EMOJI_LEGEND.map((item) => (
          <li key={item.code} className="flex items-center gap-2">
            <span className="w-6 text-center">{item.emoji}</span>
            <span className="flex-1 text-neutral-700">{item.label}</span>
            <span className="font-mono text-xs text-neutral-400">
              {item.code}
            </span>
            <span className="flex gap-0.5">
              <Kbd>{alt}</Kbd>
              <Kbd>{item.key}</Kbd>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-neutral-500">
        <Kbd>Ctrl</Kbd> <Kbd>Space</Kbd> also adds ✅, <Kbd>Ctrl</Kbd>{' '}
        <Kbd>Q</Kbd> adds ❌ and <Kbd>Ctrl</Kbd> <Kbd>P</Kbd> adds 🟡.
      </p>
    </>
  );
};

export default EmojiLegend;
