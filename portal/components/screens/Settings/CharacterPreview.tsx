'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import * as art from '@/components/screens/World/art';
import type { Look } from '@/lib/avatar/look';
import type { WorldBrand } from '@/lib/world/state';

/**
 * The person's character on a little stage. It slowly turns, bounces and
 * waves; drag to spin it round.
 */
export default function CharacterPreview({
  look,
  brand,
  company,
}: {
  look: Look;
  brand: WorldBrand;
  company: string;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const stage = useRef<{
    scene: THREE.Scene;
    figure: art.Person | null;
  } | null>(null);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.set(0, 2.1, 6.4);
    camera.lookAt(0, 1.3, 0);
    scene.add(new THREE.HemisphereLight('#ffffff', '#c9d1dc', 1.7));
    const sun = new THREE.DirectionalLight('#fffaf0', 2.2);
    sun.position.set(3, 7, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.radius = 4;
    scene.add(sun);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.7, 48),
      art.clay(art.CLAY_SHADE),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    stage.current = { scene, figure: null };

    // Faces you and sways a little; a drag turns it, and it turns back.
    let turn = 0;
    let dragging: number | null = null;
    const down = (e: PointerEvent) => {
      dragging = e.clientX;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (dragging === null) return;
      turn += (e.clientX - dragging) * 0.012;
      dragging = e.clientX;
    };
    const up = () => {
      dragging = null;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    const clock = new THREE.Clock();
    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      if (dragging === null) {
        const rest = Math.sin(t * 0.6) * 0.45;
        turn += (rest - turn) * Math.min(1, dt * 2.5);
      }
      const f = stage.current?.figure;
      if (f) {
        f.group.rotation.y = turn;
        // A happy bounce, a head tilt, and a wave every few seconds.
        const k = t % 5;
        const waving = k > 3.2;
        f.body.position.y = Math.abs(Math.sin(t * 2.4)) * 0.06;
        f.head.rotation.z = Math.sin(t * 1.3) * 0.1;
        f.arms[1].rotation.z = waving ? -2.1 + Math.sin(t * 10) * 0.35 : 0;
        f.arms[0].rotation.z = waving ? 0 : Math.sin(t * 2.4) * 0.08;
        if (f.aura) f.aura.rotation.y = t * 0.8;
        if (f.pet) f.pet.position.y = Math.max(0, Math.sin(t * 4)) * 0.12;
      }
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      renderer.dispose();
      el.removeChild(renderer.domElement);
      stage.current = null;
    };
  }, []);

  const key = JSON.stringify([look, brand]);
  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    if (s.figure) s.scene.remove(s.figure.group);
    const figure = art.person(
      'preview',
      brand,
      art.logoSign(company, brand.logo, brand),
      look,
    );
    figure.group.position.x = look.pet === 'none' ? 0 : -0.3;
    s.scene.add(figure.group);
    s.figure = figure;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div
      ref={mount}
      className="size-full cursor-grab touch-none active:cursor-grabbing"
      aria-label="Your character"
    />
  );
}
