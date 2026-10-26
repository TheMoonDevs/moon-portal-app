import type { World } from '@/lib/world/state';

/*
 * Where everything stands. Towns sit on a grid of islands; each town has a
 * plaza in the middle (its people stand there) and its buildings on rings
 * around it, best ranked closest to the plaza.
 */

export type Spot = { x: number; z: number; angle: number };

const RING_GAP = 7;
const FIRST_RING = 11;

/** The rings a town needs for `count` buildings: 6 on the first, then +5. */
function ringFor(index: number) {
  let ring = 0;
  let start = 0;
  let size = 6;
  while (index >= start + size) {
    start += size;
    ring += 1;
    size += 5;
  }
  return { ring, slot: index - start, size };
}

export const townRadius = (buildings: number) =>
  buildings
    ? FIRST_RING + ringFor(buildings - 1).ring * RING_GAP + 7
    : FIRST_RING + 2;

export function layoutWorld(world: World) {
  const radii = world.towns.map((t) =>
    townRadius(world.buildings.filter((b) => b.townId === t.id).length),
  );
  const spacing = Math.max(40, ...radii.map((r) => r * 2 + 14));
  const cols = Math.max(1, Math.ceil(Math.sqrt(world.towns.length)));
  const rows = Math.ceil(world.towns.length / cols);

  const towns = new Map<string, Spot & { radius: number }>();
  world.towns.forEach((t, i) => {
    towns.set(t.id, {
      x: ((i % cols) - (cols - 1) / 2) * spacing,
      z: (Math.floor(i / cols) - (rows - 1) / 2) * spacing,
      angle: 0,
      radius: radii[i],
    });
  });

  const buildings = new Map<string, Spot>();
  for (const t of world.towns) {
    const center = towns.get(t.id)!;
    world.buildings
      .filter((b) => b.townId === t.id)
      .sort((a, b) => a.rank - b.rank)
      .forEach((b, i) => {
        const { ring, slot, size } = ringFor(i);
        const angle = (slot / size) * Math.PI * 2 + ring * 0.4;
        const r = FIRST_RING + ring * RING_GAP;
        buildings.set(b.id, {
          x: center.x + Math.cos(angle) * r,
          z: center.z + Math.sin(angle) * r,
          // Faces the plaza.
          angle: -angle - Math.PI / 2,
        });
      });
  }

  // People stand around the plaza of each town they belong to.
  const people = new Map<string, Spot>();
  for (const t of world.towns) {
    const center = towns.get(t.id)!;
    const here = world.people.filter((p) => p.townIds.includes(t.id));
    here.forEach((p, i) => {
      const angle = (i / Math.max(here.length, 1)) * Math.PI * 2 + 0.3;
      const r = here.length > 8 ? 6.6 : 5.4;
      people.set(`${t.id}:${p.id}`, {
        x: center.x + Math.cos(angle) * r,
        z: center.z + Math.sin(angle) * r,
        angle: -angle - Math.PI / 2,
      });
    });
  }

  return { towns, buildings, people, spacing, cols, rows };
}

/** Small deterministic random numbers, so trees stay where they grew. */
export function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}
