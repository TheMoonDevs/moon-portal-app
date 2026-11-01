'use client';

import dayjs from 'dayjs';
import { Toaster } from 'sonner';

import { GoalsSection } from '@/components/screens/Project/sections/GoalsSection';

const d = (n: number) => dayjs().add(n, 'day').format('YYYY-MM-DD');
const tasks: any[] = [];
let id = 0;
for (let i = -110; i <= 10; i++) {
  const day = dayjs().add(i, 'day');
  if ([1, 4].includes(day.day())) {
    const status = i < 0 ? (i % 3 ? 'DONE' : 'IGNORED') : 'TODO';
    tasks.push({ id: `t${id++}`, title: 'Post a short', status, goalId: 'g1', forDate: day.format('YYYY-MM-DD'),
      completedAt: status === 'DONE' ? day.toISOString() : null,
      goalMissed: status === 'IGNORED' ? { day: day.format('YYYY-MM-DD') } : null });
  }
  if (i < 0 && i % 4 === 0) tasks.push({ id: `t${id++}`, title: 'Video', status: 'DONE', goalId: 'g2', completedAt: day.toISOString() });
}
tasks.push({ id: 'x1', title: 'Edit the One Piece short', status: 'TODO', forDate: d(1) });
tasks.push({ id: 'x2', title: 'Thumbnail pack', status: 'IN_PROGRESS', forDate: d(0) });
const project: any = { id: 'p1', name: 'Shorts', color: '#8b5cf6', companyId: 'c1',
  goals: [
    { id: 'k3v9qz1a', title: 'Shorts posted', kind: 'scheduled', target: 2, period: 'week', days: [1, 4] },
    { id: 'b82paalg', title: 'videos', kind: 'target', target: 100, period: 'month' },
  ].map((g, i) => ({ ...g, id: i ? g.id : 'g1' })).map((g) => g.id === 'b82paalg' ? { ...g, id: 'g2' } : g),
  goalProgress: [
    { goalId: 'g1', kind: 'scheduled', done: 1, manual: 0, target: 2, percent: 50, from: d(-3), to: d(3), contributors: [] },
    { goalId: 'g2', kind: 'target', done: 62, manual: 0, target: 100, percent: 62, from: d(-100), to: d(0), contributors: [] },
  ], goalHistory: {} };

export default function Preview() {
  return (<div className="min-h-screen bg-neutral-950 text-neutral-100">
    <GoalsSection project={project} tasks={tasks} people={[]} companyUsers={[]} canEdit canTick onSaved={() => {}} />
    <Toaster theme="dark" /></div>);
}
