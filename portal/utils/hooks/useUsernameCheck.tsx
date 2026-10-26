'use client';

import { useEffect, useState } from 'react';

import { normalizeUsername, usernameProblem } from '@/lib/users/username';

export type UsernameCheck =
  | { state: 'idle' | 'checking' | 'available'; message: null }
  | { state: 'invalid' | 'taken'; message: string };

/**
 * Live feedback for a username field: the format is checked straight away,
 * whether it is free after a short pause. `current` is the username already
 * saved, which needs no check.
 */
export const useUsernameCheck = (
  value: string,
  current?: string | null,
  userId?: string | null,
): UsernameCheck => {
  const username = normalizeUsername(value);
  const unchanged = !!current && username === current;
  const problem = usernameProblem(username);
  const [remote, setRemote] = useState<{
    username: string;
    problem: string | null;
  } | null>(null);

  useEffect(() => {
    if (unchanged || problem) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ username });
        if (userId) params.set('userId', userId);
        const res = await fetch(`/api/user/username?${params}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        setRemote({ username, problem: json?.data?.problem ?? null });
      } catch {
        // Aborted or offline: the server checks again on save.
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [username, unchanged, problem, userId]);

  if (!username || unchanged) return { state: 'idle', message: null };
  if (problem) return { state: 'invalid', message: problem };
  if (remote?.username !== username)
    return { state: 'checking', message: null };
  if (remote.problem) return { state: 'taken', message: remote.problem };
  return { state: 'available', message: null };
};
