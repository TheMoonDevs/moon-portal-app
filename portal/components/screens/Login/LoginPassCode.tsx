'use client';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

export const LoginPassCode = ({
  onPassCodeFilled,
}: {
  onPassCodeFilled: (passCode: string) => void;
}) => {
  const passParentRef = useRef<HTMLDivElement>(null);

  const [passCodes, setPassCodes] = useState<string[]>([
    '',
    '',
    '',
    '',
    '',
    '',
  ]);
  const searchParams = useSearchParams();
  const passkey = searchParams?.get('passkey'); // Extract passkey from URL

  // Autofill passcode if passkey is found in the URL
  useEffect(() => {
    if (passkey && passkey.length === 6) {
      const passArray = passkey.split('');
      setPassCodes(passArray);
      onPassCodeFilled(passkey); // Automatically proceed to the next step
    }
  }, [passkey, onPassCodeFilled]);

  useEffect(() => {
    if (passCodes.every((code) => code !== '')) {
      onPassCodeFilled(passCodes.join(''));
    }
  }, [passCodes, onPassCodeFilled]);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        setPassCodes((p) => {
          // replace last not empty string with empty string in p array
          const newPassCodes = [...p];
          for (let i = newPassCodes.length - 1; i >= 0; i--) {
            if (newPassCodes[i] !== '') {
              newPassCodes[i] = '';
              if (i > 0)
                (
                  passParentRef.current?.children[i - 1] as HTMLInputElement
                ).focus();
              break;
            }
          }
          return newPassCodes;
        });
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  return (
    <div className="mb-8 mt-auto flex flex-col items-center">
      <div ref={passParentRef} className="mt-8 flex flex-row gap-2 text-4xl">
        {passCodes.map((code, index) => (
          <input
            // Passcodes are alphanumeric, so every box must be a text input.
            // A type="number" input only accepts digits and "e".
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            key={code + index}
            className="w-[1em] border-b border-neutral-600 bg-transparent text-center uppercase text-neutral-100 focus:border-blue-600 focus:outline-none"
            placeholder=""
            autoFocus={index === 0 && code === ''}
            value={code}
            onChange={(e) => {
              // Keep only letters and digits; ignore anything else.
              const char = e.target.value
                .replace(/[^a-zA-Z0-9]/g, '')
                .charAt(0);
              if (!char) return;
              setPassCodes((p) => {
                const newPassCodes = [...p];
                newPassCodes[index] = char;
                return newPassCodes;
              });
              (e.target.nextSibling as HTMLInputElement)?.focus();
            }}
          />
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-neutral-400">
        Please enter your pass code.
      </p>
    </div>
  );
};
