'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  CSS2DObject,
  CSS2DRenderer,
} from 'three/examples/jsm/renderers/CSS2DRenderer.js';

import type { BotState, WorldPerson } from '@/lib/world/state';
import { BOT_STATE_COLOR, botEffort, personEffort } from '@/lib/world/state';

/*
 * The world in plain three.js: a desk per person with the person and their
 * bot. Plain three.js (no React renderer) keeps three's JSX types out of the
 * app, where they clash with MUI's.
 */

const SPACING = 4;
const PERSON_COLORS = ['#a78bfa', '#f472b6', '#60a5fa', '#fb923c', '#4ade80'];

const colorFor = (id: string) =>
  PERSON_COLORS[
    Array.from(id).reduce((n, c) => n + c.charCodeAt(0), 0) %
      PERSON_COLORS.length
  ];

/** Desks on a grid, centred. */
function layout(count: number) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / cols);
  return Array.from({ length: count }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return new THREE.Vector3(
      (col - (cols - 1) / 2) * SPACING,
      0,
      (row - (rows - 1) / 2) * SPACING,
    );
  });
}

type Desk = {
  id: string;
  group: THREE.Group;
  bot: THREE.Group;
  eye: THREE.MeshStandardMaterial;
  halo: THREE.Mesh;
  haloColor: string;
  beam: THREE.MeshBasicMaterial | null;
  state: BotState;
};

/** A text label; the renderer owns the outer element's transform. */
const label = (html: string, className: string) => {
  const el = document.createElement('div');
  const inner = document.createElement('div');
  inner.className = className;
  inner.innerHTML = html;
  el.appendChild(inner);
  return new CSS2DObject(el);
};

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function buildDesk(person: WorldPerson): Desk {
  const group = new THREE.Group();
  group.userData.personId = person.id;
  const color = colorFor(person.id);

  // Floor tile.
  const tile = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 2.4),
    new THREE.MeshStandardMaterial({
      color: person.isMe ? '#262626' : '#1c1c1c',
      roughness: 0.9,
    }),
  );
  tile.rotation.x = -Math.PI / 2;
  tile.position.set(0.6, 0.01, 0);
  tile.receiveShadow = true;
  group.add(tile);

  // The person grows with their own work and guidance.
  const effort = personEffort(person);
  const s = 1 + Math.min(effort, 30) / 30;
  const skin = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35 * s, 0.9 * s, 8, 16),
    skin,
  );
  body.position.y = 0.9 * s;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32 * s, 24, 24), skin);
  head.position.y = 2.05 * s;
  head.castShadow = true;
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.6 * s, 0.6 * s + 0.05 + effort * 0.01, 48),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: effort ? 0.8 : 0.25,
    }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.02;
  group.add(body, head, halo);

  // The bot beside its owner, coloured by what it is doing.
  const state = person.bot.state;
  const stateColor = BOT_STATE_COLOR[state];
  const size = 0.55 + Math.min(botEffort(person), 20) * 0.015;
  const botSpot = new THREE.Group();
  botSpot.position.x = 1.4;
  const bot = new THREE.Group();
  const shell = new THREE.Mesh(
    new RoundedBoxGeometry(size, size, size, 4, 0.12),
    new THREE.MeshStandardMaterial({
      color: '#e5e5e5',
      roughness: 0.3,
      metalness: 0.4,
    }),
  );
  shell.castShadow = true;
  const eye = new THREE.MeshStandardMaterial({
    color: stateColor,
    emissive: stateColor,
    emissiveIntensity: 0.8,
  });
  const visor = new THREE.Mesh(
    new THREE.PlaneGeometry(size * 0.7, size * 0.25),
    eye,
  );
  visor.position.set(0, 0.05, size / 2 + 0.001);
  const antenna = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 12, 12),
    new THREE.MeshStandardMaterial({
      color: stateColor,
      emissive: stateColor,
      emissiveIntensity: 1,
    }),
  );
  antenna.position.y = size / 2 + 0.15;
  bot.add(shell, visor, antenna);
  botSpot.add(bot);

  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(0.45, 32),
    new THREE.MeshBasicMaterial({
      color: stateColor,
      transparent: true,
      opacity: 0.35,
    }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.03;
  botSpot.add(pad);

  // A waiting bot calls its owner: a pulsing link and a question mark.
  let beam: THREE.MeshBasicMaterial | null = null;
  if (state === 'waiting') {
    beam = new THREE.MeshBasicMaterial({
      color: BOT_STATE_COLOR.waiting,
      transparent: true,
      opacity: 0.5,
    });
    const link = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 1.2, 12),
      beam,
    );
    link.rotation.z = Math.PI / 2;
    link.position.set(-0.7, 1.2, 0);
    botSpot.add(link);
    const ask = label('❓', 'pointer-events-none animate-bounce text-2xl');
    ask.position.set(0, 2.1, 0);
    botSpot.add(ask);
  }
  group.add(botSpot);

  const name = label(
    `${escape(person.isMe ? 'You' : person.name)}${
      state === 'waiting' ? ' <span style="color:#7dd3fc">❓</span>' : ''
    }`,
    'pointer-events-none whitespace-nowrap rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white',
  );
  name.position.set(0.6, 0, 1.3);
  group.add(name);

  return {
    id: person.id,
    group,
    bot,
    eye,
    halo,
    haloColor: color,
    beam,
    state,
  };
}

function dispose(object: THREE.Object3D) {
  object.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
        m.dispose(),
      );
    }
    if (o instanceof CSS2DObject) o.element.remove();
  });
}

export const WorldScene = ({
  people,
  selectedId,
  onSelect,
}: {
  people: WorldPerson[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) => {
  const mount = useRef<HTMLDivElement>(null);
  const world = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    floor: THREE.Mesh;
    root: THREE.Group;
    desks: Desk[];
    /** The camera is placed once, on the first layout. */
    placed: boolean;
  } | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Renderer, camera, lights and the animation loop: once.
  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    el.appendChild(renderer.domElement);
    const labels = new CSS2DRenderer();
    labels.domElement.style.position = 'absolute';
    labels.domElement.style.inset = '0';
    labels.domElement.style.pointerEvents = 'none';
    el.appendChild(labels.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0a0a');
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    scene.add(new THREE.AmbientLight('#ffffff', 0.5));
    const sun = new THREE.DirectionalLight('#ffffff', 1.4);
    sun.position.set(6, 10, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1, 64),
      new THREE.MeshStandardMaterial({ color: '#141414', roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    scene.add(floor);
    const root = new THREE.Group();
    scene.add(root);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.3;
    controls.minDistance = 4;

    world.current = {
      scene,
      camera,
      controls,
      floor,
      root,
      desks: [],
      placed: false,
    };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      renderer.setSize(w, h);
      labels.setSize(w, h);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    // Click a desk to open its person; a drag is not a click.
    const ray = new THREE.Raycaster();
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5)
        return;
      const rect = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      let hit: THREE.Object3D | null =
        ray.intersectObjects(root.children, true)[0]?.object ?? null;
      while (hit && !hit.userData.personId) hit = hit.parent;
      onSelectRef.current(hit?.userData.personId ?? null);
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime();
      for (const d of world.current?.desks ?? []) {
        d.halo.rotation.z = t * 0.4;
        const b = d.bot;
        if (d.state === 'working') {
          b.position.y = 0.9 + Math.sin(t * 6) * 0.05;
          b.rotation.y = Math.sin(t * 2) * 0.3;
        } else if (d.state === 'waiting') {
          // Turns to its owner and bobs, asking.
          b.position.y = 1 + Math.sin(t * 2.5) * 0.15;
          b.rotation.y = -Math.PI / 2;
        } else if (d.state === 'blocked') {
          b.position.y = 0.8;
          b.rotation.z = Math.sin(t * 8) * 0.05;
        } else {
          b.position.y = 0.75 + Math.sin(t) * 0.02;
        }
        d.eye.emissiveIntensity =
          d.state === 'asleep' ? 0.2 : 0.7 + Math.sin(t * 4) * 0.3;
        if (d.beam) d.beam.opacity = 0.35 + Math.sin(t * 3) * 0.25;
      }
      controls.update();
      renderer.render(scene, camera);
      labels.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      dispose(scene);
      renderer.dispose();
      el.innerHTML = '';
      world.current = null;
    };
  }, []);

  // Desks: rebuilt when the people change.
  useEffect(() => {
    const w = world.current;
    if (!w) return;
    w.desks.forEach((d) => {
      w.root.remove(d.group);
      dispose(d.group);
    });
    const ordered = [...people].sort((a, b) => Number(b.isMe) - Number(a.isMe));
    const spots = layout(ordered.length);
    w.desks = ordered.map((person, i) => {
      const desk = buildDesk(person);
      desk.group.position.copy(spots[i]);
      w.root.add(desk.group);
      return desk;
    });
    const extent = Math.max(8, Math.sqrt(ordered.length) * SPACING + 4);
    w.floor.scale.setScalar(extent);
    w.scene.fog = new THREE.Fog('#0a0a0a', extent * 1.5, extent * 3);
    w.controls.maxDistance = extent * 2.5;
    if (!w.placed) {
      w.placed = true;
      w.camera.position.set(extent * 0.7, extent * 0.8, extent * 0.9);
      w.controls.target.set(0, 0, 0);
    }
  }, [people]);

  // The selected person's halo turns white.
  useEffect(() => {
    for (const d of world.current?.desks ?? [])
      (d.halo.material as THREE.MeshBasicMaterial).color.set(
        d.id === selectedId ? '#ffffff' : d.haloColor,
      );
  }, [selectedId, people]);

  return <div ref={mount} className="relative size-full overflow-hidden" />;
};
