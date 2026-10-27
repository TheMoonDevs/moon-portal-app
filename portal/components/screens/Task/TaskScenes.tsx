'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { CODES, CODES_PATH, DREAMS, MANIFESTO } from '@/lib/company/codes';
import type { TaskPageConfig } from '@/lib/hiring/taskPages';

import {
  clamp,
  drawStroke,
  prefersReducedMotion,
  primeStroke,
  scribble,
  seeded,
  Typed,
  type TypedHandle,
  useScrollFrame,
} from './sketch';
import styles from './task.module.css';

/* --------------------------------- 1. dream -------------------------------- */

export const DreamScene = ({ firstName }: { firstName: string }) => {
  const sec = useRef<HTMLElement>(null);
  const t1 = useRef<TypedHandle>(null);
  const t2 = useRef<TypedHandle>(null);
  const items = useRef<Array<TypedHandle | null>>([]);
  const arrows = useRef<Array<SVGPathElement | null>>([]);
  const glow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    arrows.current.forEach((p) => p && primeStroke(p));
  }, []);

  const start = useRef<number | null>(null);

  useScrollFrame(sec, (p, t) => {
    const done = prefersReducedMotion();
    const at = (a: number, len: number) => (done ? 1 : (p - a) / len);
    // The first line types itself on arrival; scrolling only speeds it up.
    start.current ??= t;
    t1.current?.type(Math.max(at(0, 0.12), (t - start.current - 400) / 1600));
    t1.current?.mark(0, at(0.12, 0.08));
    t2.current?.type(at(0.32, 0.2));
    t2.current?.mark(0, at(0.52, 0.06));
    DREAMS.forEach((_, i) => {
      drawStroke(arrows.current[i], at(0.6 + i * 0.1, 0.03));
      items.current[i]?.type(at(0.62 + i * 0.1, 0.08));
    });
    if (glow.current)
      glow.current.style.transform = `translate(${clamp(at(0.9, 0.1)) * 175}vw,-50%)`;
  });

  return (
    <section ref={sec} className={styles.sec} style={{ height: '360vh' }}>
      <div className={styles.pin}>
        <div ref={glow} className={styles.glow} />
        <div className={styles.noteWrap}>
          <div className={styles.hello}>{firstName}, this is for you.</div>
          <div className={styles.sel}>
            <i />
            <i />
            <i />
            <i />
            <span className={styles.tag}>note_01</span>
            <Typed
              ref={t1}
              className={styles.t1}
              segments={[
                { text: 'We have dreams, ' },
                { text: 'big ones.', mark: 'circle' },
              ]}
            />
          </div>
          <Typed
            ref={t2}
            className={styles.t2}
            seed={11}
            segments={[
              { text: 'Those who dare not say their dreams ' },
              { text: 'out loud,', mark: 'under' },
              { text: " don't take it seriously." },
            ]}
          />
          <ul className={styles.dreams}>
            {DREAMS.map((dream, i) => (
              <li key={dream}>
                <svg viewBox="0 0 22 14" aria-hidden="true">
                  <path
                    ref={(el) => {
                      arrows.current[i] = el;
                    }}
                    className={styles.stroke}
                    d="M1 7 C 7 6, 13 8, 19 7 M14 2 L20 7 L14 12"
                  />
                </svg>
                <Typed
                  as="span"
                  ref={(h) => {
                    items.current[i] = h;
                  }}
                  segments={[{ text: dream }]}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------- 2. manifesto ------------------------------ */

export const ManifestoScene = () => {
  const sec = useRef<HTMLElement>(null);
  const title = useRef<TypedHandle>(null);
  const [before, after] = MANIFESTO.title.split('The How');

  useScrollFrame(sec, (p) => {
    const done = prefersReducedMotion();
    title.current?.type(done ? 1 : p / 0.45);
    title.current?.mark(0, done ? 1 : (p - 0.45) / 0.12);
  });

  return (
    <section ref={sec} className={styles.sec} style={{ height: '220vh' }}>
      <div className={styles.pin}>
        <div className={styles.manifesto}>
          <div className={styles.kicker}>the manifesto</div>
          <Typed
            ref={title}
            as="h2"
            seed={23}
            segments={[
              { text: before },
              { text: 'The How', mark: 'under' },
              { text: after },
            ]}
          />
          <p>{MANIFESTO.body}</p>
          <Link
            href={CODES_PATH}
            target="_blank"
            className={styles.codesLink}
            style={{ pointerEvents: 'auto' }}
          >
            The {CODES.length} codes we work by →
          </Link>
        </div>
      </div>
    </section>
  );
};

/* -------------------------------- 3. studio -------------------------------- */

export const StudioScene = ({
  studio,
}: {
  studio: TaskPageConfig['studio'];
}) => {
  const sec = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const draw = useRef<(p: number, t: number) => void>(() => {});

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({
      canvas: el,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 16);
    const loader = new THREE.TextureLoader();
    const rand = seeded(5);
    const count = studio.icons.length * 2;
    const sprites = Array.from({ length: count }, (_, i) => {
      const tex = loader.load(
        `/images/hiring/task/px-${studio.icons[i % studio.icons.length]}.png`,
      );
      tex.magFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex, transparent: true }),
      );
      sprite.userData = {
        sx: rand() * 2 - 1,
        sy: rand() * 2 - 1,
        spin: rand() * 1.2 - 0.6,
      };
      scene.add(sprite);
      return sprite;
    });

    const size = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    size();
    window.addEventListener('resize', size);

    draw.current = (p, t) => {
      const still = prefersReducedMotion();
      const aspect = el.clientWidth / Math.max(1, el.clientHeight);
      const narrow = aspect < 0.8;
      const morph = still ? 0 : clamp((p - 0.38) / 0.22);
      const scat = still ? 0 : clamp((p - 0.78) / 0.2);
      const R = narrow ? 3.6 : 7.4;
      const sz = narrow ? 1.25 : 1.7;
      const span = narrow ? 1.35 : 2.1;
      sprites.forEach((s, i) => {
        const a = (i / count) * Math.PI * 2 + (still ? 0 : t / 5000) + p * 5;
        const rx = Math.cos(a) * R;
        const rz = Math.sin(a) * R * 0.9;
        const ry = -Math.sin(a) * R * (narrow ? 0.62 : 0.4);
        const loop = count * span;
        const lx =
          ((((i * span - p * 40 - (still ? 0 : t / 600)) % loop) + loop) %
            loop) -
          loop / 2;
        const ly = narrow ? -3.6 : -3.2;
        const u = s.userData;
        let x = rx + (lx - rx) * morph;
        let y = ry + (ly - ry) * morph;
        let z = rz * (1 - morph);
        x += (u.sx * (narrow ? 3.4 : 8) - x) * scat;
        y += (u.sy * 5.5 - y) * scat;
        z += (-2 - z) * scat;
        s.position.set(x, y, z);
        s.material.rotation = u.spin * scat;
        s.scale.setScalar(sz * (1 - scat * 0.35));
      });
      renderer.render(scene, camera);
    };

    return () => {
      window.removeEventListener('resize', size);
      sprites.forEach((s) => {
        s.material.map?.dispose();
        s.material.dispose();
      });
      renderer.dispose();
    };
  }, [studio.icons]);

  useScrollFrame(sec, (p, t) => draw.current(p, t));

  return (
    <>
      <section ref={sec} className={styles.sec} style={{ height: '300vh' }}>
        <div className={styles.pin}>
          <canvas
            ref={canvas}
            className={styles.canvasFill}
            aria-hidden="true"
          />
          <div className={styles.studioTxt}>
            <div className={styles.kicker}>what we&apos;re building</div>
            <h2>{studio.title}</h2>
            <p>{studio.body}</p>
          </div>
        </div>
      </section>
      {studio.work.length > 0 && (
        <div className={styles.work}>
          {studio.work.map((item) => (
            <figure key={item.src}>
              {item.kind === 'clip' ? (
                <video src={item.src} muted loop playsInline controls />
              ) : item.kind === 'track' ? (
                <audio src={item.src} controls />
              ) : (
                // Studio posters are plain files in /public.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.src} alt={item.title} />
              )}
              <figcaption>{item.title}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </>
  );
};

/* ------------------------------- 4. your mark ------------------------------ */

export const MarkScene = ({
  mark,
  firstName,
}: {
  mark: TaskPageConfig['mark'];
  firstName: string;
}) => {
  const sec = useRef<HTMLElement>(null);
  const roll = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLHeadingElement>(null);
  const text = `${mark.creditLine}: ${firstName}?`;
  // Where each letter starts, as a share of the screen, and its tilt.
  const scatter = useMemo(() => {
    const rand = seeded(text.length * 31);
    return Array.from(text).map(() => ({
      x: rand() * 0.84 - 0.42,
      y: rand() * 0.62 - 0.3,
      r: rand() * 120 - 60,
    }));
  }, [text]);
  const circled = useMemo(
    () =>
      [0, mark.creditLine.length + 2, text.length - 2].filter((i) => i >= 0),
    [mark.creditLine, text],
  );
  const rings = useRef<Array<SVGPathElement | null>>([]);

  useEffect(() => {
    const el = line.current;
    if (!el) return;
    const place = () => {
      const letters = el.querySelectorAll<HTMLElement>('[data-letter]');
      circled.forEach((idx, i) => {
        const letter = letters[idx];
        const path = rings.current[i];
        const svg = path?.ownerSVGElement;
        if (!letter || !path || !svg) return;
        svg.setAttribute('width', `${letter.offsetWidth}`);
        svg.setAttribute('height', `${letter.offsetHeight}`);
        path.setAttribute(
          'd',
          scribble(
            'circle',
            letter.offsetWidth,
            letter.offsetHeight,
            seeded(i + 3),
          ),
        );
        primeStroke(path);
      });
    };
    place();
    window.addEventListener('resize', place);
    document.fonts?.ready.then(place);
    return () => window.removeEventListener('resize', place);
  }, [circled]);

  useScrollFrame(sec, (p) => {
    const k = prefersReducedMotion() ? 1 : clamp((p - 0.3) / 0.5);
    const ease = 1 - Math.pow(1 - k, 3);
    if (roll.current)
      roll.current.style.transform = `translateY(${(1 - p) * 30 - p * 120}%)`;
    const el = line.current;
    if (!el) return;
    const letters = el.querySelectorAll<HTMLElement>('[data-letter]');
    letters.forEach((s, i) => {
      const q = 1 - ease;
      const d = scatter[i];
      s.style.transform = `translate(${d.x * window.innerWidth * q}px,${d.y * window.innerHeight * q}px) rotate(${d.r * q}deg)`;
    });
    circled.forEach((idx, i) => {
      const letter = letters[idx];
      const svg = rings.current[i]?.ownerSVGElement;
      if (!letter || !svg) return;
      svg.style.left = `${letter.offsetLeft}px`;
      svg.style.top = `${letter.offsetTop}px`;
      svg.style.transform = letter.style.transform;
      drawStroke(
        rings.current[i],
        clamp(p / 0.15) * (1 - clamp((k - 0.3) / 0.3)),
      );
    });
  });

  return (
    <section ref={sec} className={styles.sec} style={{ height: '240vh' }}>
      <div className={styles.pin}>
        <div className={styles.markHead}>
          <div className={styles.kicker}>{mark.kicker.toLowerCase()}</div>
          <h2>
            {mark.title}
            <span>{mark.accent}</span>
          </h2>
        </div>
        <div className={styles.credits} aria-hidden="true">
          <div ref={roll}>
            {mark.credits.map((c) => (
              <div key={c}>{c}</div>
            ))}
          </div>
        </div>
        <h2 ref={line} className={styles.scatter} aria-label={text}>
          {Array.from(text).map((ch, i) => (
            <span key={i} data-letter="" aria-hidden="true">
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
          {circled.map((_, i) => (
            <svg key={i} aria-hidden="true">
              <path
                ref={(el) => {
                  rings.current[i] = el;
                }}
                className={styles.stroke}
              />
            </svg>
          ))}
        </h2>
      </div>
    </section>
  );
};

/* -------------------------------- 5. founder ------------------------------- */

const XRAY_FRAGMENT = `uniform sampler2D map; uniform float reveal, time; varying vec2 vUv;
vec4 blur(vec2 uv, float r) { vec4 s = vec4(0.); for (int i = 0; i < 12; i++) { float a = float(i) * .5236; s += texture2D(map, uv + vec2(cos(a), sin(a)) * r); } return s / 12.; }
void main() {
  float rv = reveal;
  vec4 c = mix(blur(vUv, .028 * (1. - rv) + .001), texture2D(map, vUv), rv);
  float lum = dot(c.rgb, vec3(.3, .59, .11));
  vec3 pink = mix(vec3(.28, .05, .14), vec3(1., .48, .62), lum);
  vec3 cyan = mix(vec3(.0, .08, .22), vec3(.62, .96, 1.), pow(lum, .75) * 1.25);
  vec3 col = mix(pink, cyan, rv);
  float edge = clamp(c.a - blur(vUv, .01).a, 0., 1.) * 4.;
  float halo = blur(vUv, .035).a;
  col += vec3(.55, .95, 1.) * edge * rv;
  col += vec3(.6, .97, 1.) * .05 * sin(vUv.y * 700. + time * 4.) * rv * c.a;
  gl_FragColor = vec4(mix(vec3(.35, .85, 1.) * .9, col, c.a), max(c.a, halo * .55 * rv));
}`;

export const FounderScene = ({
  founder,
}: {
  founder: TaskPageConfig['founder'];
}) => {
  const sec = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const lines = useRef<Array<TypedHandle | null>>([]);
  const ring = useRef<SVGPathElement>(null);
  const clock = useRef<HTMLDivElement>(null);
  const draw = useRef<(p: number, t: number) => void>(() => {});

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({
      canvas: el,
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      map: { value: new THREE.TextureLoader().load(founder.image) },
      reveal: { value: 0 },
      time: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      vertexShader:
        'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.); }',
      fragmentShader: XRAY_FRAGMENT,
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    const size = () => renderer.setSize(el.clientWidth, el.clientHeight, false);
    size();
    window.addEventListener('resize', size);
    draw.current = (reveal, t) => {
      uniforms.reveal.value = reveal;
      uniforms.time.value = t / 1000;
      renderer.render(scene, camera);
    };
    return () => {
      window.removeEventListener('resize', size);
      uniforms.map.value.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [founder.image]);

  useEffect(() => {
    // A loop around the watch, at about (0.39, 0.73) of the photo.
    const path = ring.current;
    if (!path) return;
    const rand = seeded(9);
    let d = '';
    for (let i = 0; i <= 40; i += 1) {
      const a = -1.8 + (i / 36) * Math.PI * 2.1;
      const k = 1 + (rand() - 0.5) * 0.1;
      d += `${i ? ' L ' : 'M '}${(117 + Math.cos(a) * 34 * k).toFixed(1)} ${(292 + Math.sin(a) * 26 * k).toFixed(1)}`;
    }
    path.setAttribute('d', d);
    primeStroke(path);
  }, []);

  useScrollFrame(sec, (p, t) => {
    const done = prefersReducedMotion();
    const at = (a: number, len: number) => (done ? 1 : (p - a) / len);
    draw.current(clamp(at(0.05, 0.35)), t);
    lines.current[0]?.type(at(0.1, 0.2));
    lines.current[1]?.type(at(0.32, 0.18));
    lines.current[1]?.mark(0, at(0.52, 0.1));
    drawStroke(ring.current, at(0.62, 0.12));
    if (clock.current) clock.current.style.opacity = `${clamp(at(0.7, 0.1))}`;
  });

  const [first, second] = founder.lines;
  const [lead, tail] = second.split(/(?=with me)/);

  return (
    <section
      ref={sec}
      className={`${styles.sec} ${styles.dark}`}
      style={{ height: '260vh' }}
    >
      <div className={styles.pin}>
        <div className={styles.meTxt}>
          <Typed
            ref={(h) => {
              lines.current[0] = h;
            }}
            segments={[{ text: first }]}
          />
          <Typed
            ref={(h) => {
              lines.current[1] = h;
            }}
            seed={17}
            segments={
              tail
                ? [{ text: lead }, { text: tail, mark: 'under' }]
                : [{ text: second }]
            }
          />
          <cite>
            — {founder.name}, {founder.role}
          </cite>
        </div>
        <div className={styles.portrait}>
          <canvas ref={canvas} aria-label={`Portrait of ${founder.name}`} />
          <svg
            viewBox="0 0 300 400"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path ref={ring} className={styles.stroke} />
          </svg>
          <div ref={clock} className={styles.clock} style={{ opacity: 0 }}>
            {founder.clock}
          </div>
        </div>
      </div>
    </section>
  );
};

export const TimelineScene = ({
  timeline,
  promises,
}: {
  timeline: TaskPageConfig['timeline'];
  promises: TaskPageConfig['promises'];
}) => {
  const shown = promises.filter((p) => p.enabled);
  return (
    <section className={`${styles.timeline} ${styles.dark}`}>
      <h3>What awaits.</h3>
      <ol className={styles.steps}>
        {timeline.steps.map((step) => (
          <li key={step.when}>
            <b>{step.when}</b>
            <span>{step.what}</span>
          </li>
        ))}
      </ol>
      <p className={styles.timelineNote}>{timeline.note}</p>
      {shown.length > 0 && (
        <ul className={styles.promises}>
          {shown.map((p) => (
            <li key={p.text}>{p.text}</li>
          ))}
        </ul>
      )}
    </section>
  );
};

/** The team. Hidden while `team.visible` is false in the page's config. */
export const TeamScene = ({
  team,
  firstName,
}: {
  team: TaskPageConfig['team'];
  firstName: string;
}) =>
  team.visible ? (
    <section className={styles.team}>
      <div className={styles.kicker}>the team</div>
      <ul>
        {team.members.map((m) => (
          <li key={m.name}>
            <b>{m.name}</b>
            <small>{m.role}</small>
          </li>
        ))}
        <li>
          <b>{firstName}</b>
          <small>Joining soon · {team.joining}</small>
        </li>
      </ul>
    </section>
  ) : null;
