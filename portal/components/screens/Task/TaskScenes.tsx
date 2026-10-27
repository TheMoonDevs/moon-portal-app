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
              {ch === ' ' ? '\u00A0' : ch}
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

/* --------------------------- how we hire (signal) -------------------------- */

export const HiringScene = ({
  hiring,
}: {
  hiring: NonNullable<TaskPageConfig['hiring']>;
}) => {
  const sec = useRef<HTMLElement>(null);
  const title = useRef<TypedHandle>(null);
  const bubbles = useRef<Array<HTMLLIElement | null>>([]);
  const because = useRef<HTMLParagraphElement>(null);
  const [before, after] = hiring.title.split(hiring.strike);

  useScrollFrame(sec, (p) => {
    const done = prefersReducedMotion();
    const at = (a: number, len: number) => (done ? 1 : clamp((p - a) / len));
    title.current?.type(at(0, 0.2));
    title.current?.mark(0, at(0.22, 0.1));
    hiring.chat.forEach((_, i) => {
      const el = bubbles.current[i];
      if (!el) return;
      const k = at(0.32 + i * 0.1, 0.06);
      el.style.opacity = `${k}`;
      el.style.transform = `translateY(${(1 - k) * 14}px)`;
    });
    if (because.current) {
      const k = at(0.78, 0.1);
      because.current.style.opacity = `${k}`;
      because.current.style.transform = `translateY(${(1 - k) * 14}px)`;
    }
  });

  return (
    <section ref={sec} className={styles.sec} style={{ height: '300vh' }}>
      <div className={styles.pin}>
        <div className={styles.hiring}>
          <div>
            <div className={styles.kicker}>{hiring.kicker}</div>
            <Typed
              ref={title}
              as="h2"
              seed={31}
              segments={
                after === undefined
                  ? [{ text: hiring.title }]
                  : [
                      { text: before },
                      { text: hiring.strike, mark: 'strike' },
                      { text: after },
                    ]
              }
            />
          </div>
          <ol className={styles.chat} aria-label="A hiring chat">
            {hiring.chat.map((m, i) => (
              <li
                key={i}
                ref={(el) => {
                  bubbles.current[i] = el;
                }}
                className={m.from === 'ai' ? styles.fromAi : styles.fromThem}
                style={{ opacity: 0 }}
              >
                <small>
                  {m.from === 'ai' ? 'ai · moon devs' : 'candidate'}
                </small>
                {m.text}
              </li>
            ))}
          </ol>
          <p ref={because} className={styles.because} style={{ opacity: 0 }}>
            {hiring.because}
          </p>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------ radar (signal) ----------------------------- */

export const RadarScene = ({
  radar,
}: {
  radar: NonNullable<TaskPageConfig['radar']>;
}) => {
  const sec = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<Array<HTMLDivElement | null>>([]);
  const ring = useRef<SVGPathElement>(null);
  const found = useRef<HTMLElement>(null);
  // Where each blip sits: an angle from 12 o'clock and a share of the radius.
  const blips = useMemo(() => {
    const rand = seeded(radar.blips.length * 13);
    return radar.blips.map((_, i) => ({
      a: (i / radar.blips.length) * Math.PI * 2 + rand() * 0.7,
      r: 0.38 + rand() * 0.42,
    }));
  }, [radar.blips]);
  const last = blips.length - 1;

  useEffect(() => {
    const path = ring.current;
    if (!path) return;
    // A loose marker loop around the blip, at the middle of a 40×40 box.
    const rand = seeded(4);
    let d = '';
    for (let i = 0; i <= 40; i += 1) {
      const a = -2 + (i / 36) * Math.PI * 2.1;
      const k = 1 + (rand() - 0.5) * 0.12;
      d += `${i ? ' L ' : 'M '}${(20 + Math.cos(a) * 15 * k).toFixed(1)} ${(20 + Math.sin(a) * 11 * k).toFixed(1)}`;
    }
    path.setAttribute('d', d);
    primeStroke(path);
  }, []);

  useScrollFrame(sec, (p, t) => {
    const el = canvas.current;
    const g = el?.getContext('2d');
    if (!el || !g) return;
    const still = prefersReducedMotion();
    const dpr = Math.min(window.devicePixelRatio, 2);
    const size = el.clientWidth;
    if (el.width !== Math.round(size * dpr)) {
      el.width = el.height = Math.round(size * dpr);
    }
    const css = getComputedStyle(el);
    const ink = css.getPropertyValue('--red').trim() || '#b6ff3b';
    const c = size / 2;
    const R = size * 0.48;
    // The sweep turns on its own and faster as you scroll; it stops at the end.
    const lock = still ? 1 : clamp((p - 0.72) / 0.12);
    const sweep =
      (still ? 0 : t / 2400 + p * 3) * Math.PI * 2 * (1 - lock) +
      (blips[last].a + 0.25) * lock;

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, size, size);
    g.strokeStyle = ink;
    g.globalAlpha = 0.18;
    g.lineWidth = 1;
    for (let k = 1; k <= 4; k += 1) {
      g.beginPath();
      g.arc(c, c, (R * k) / 4, 0, Math.PI * 2);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(c - R, c);
    g.lineTo(c + R, c);
    g.moveTo(c, c - R);
    g.lineTo(c, c + R);
    g.stroke();

    // A fading wedge behind the sweep line.
    const from = sweep - Math.PI / 2;
    for (let k = 0; k < 24; k += 1) {
      g.globalAlpha = 0.16 * (1 - k / 24);
      g.fillStyle = ink;
      g.beginPath();
      g.moveTo(c, c);
      g.arc(c, c, R, from - (k + 1) * 0.03, from - k * 0.03);
      g.closePath();
      g.fill();
    }
    g.globalAlpha = 0.9;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(c, c);
    g.lineTo(c + Math.cos(from) * R, c + Math.sin(from) * R);
    g.stroke();

    blips.forEach((b, i) => {
      // How long ago the sweep passed this blip, as a share of a turn.
      const since =
        ((((sweep - b.a) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) /
        (Math.PI * 2);
      const glow = still ? 1 : Math.max(1 - since * 1.6, i === last ? lock : 0);
      const x = c + Math.cos(b.a - Math.PI / 2) * b.r * R;
      const y = c + Math.sin(b.a - Math.PI / 2) * b.r * R;
      g.globalAlpha = 0.25 + glow * 0.75;
      g.fillStyle = ink;
      g.beginPath();
      g.arc(x, y, 3 + glow * 3, 0, Math.PI * 2);
      g.fill();
      const label = labels.current[i];
      if (label) {
        label.style.left = `${(x / size) * 100}%`;
        label.style.top = `${(y / size) * 100}%`;
        label.style.opacity = `${
          i === last ? Math.max(0.2 + glow * 0.8, lock) : 0.2 + glow * 0.8
        }`;
      }
    });
    g.globalAlpha = 1;

    const k = still ? 1 : clamp((p - 0.82) / 0.08);
    drawStroke(ring.current, k);
    if (found.current) found.current.style.opacity = `${k}`;
  });

  return (
    <section ref={sec} className={styles.sec} style={{ height: '320vh' }}>
      <div className={styles.pin}>
        <div className={styles.radarTxt}>
          <div className={styles.kicker}>{radar.kicker}</div>
          <h2>{radar.title}</h2>
          <p>{radar.body}</p>
        </div>
        <div className={styles.radar}>
          <canvas ref={canvas} aria-hidden="true" />
          {radar.blips.map((text, i) => (
            <div
              key={text}
              ref={(el) => {
                labels.current[i] = el;
              }}
              className={styles.blip}
              data-last={i === last ? '' : undefined}
            >
              {i === last && (
                <svg viewBox="0 0 40 40" aria-hidden="true">
                  <path ref={ring} className={styles.stroke} />
                </svg>
              )}
              <span>{text}</span>
              {i === last && (
                <b ref={found} style={{ opacity: 0 }}>
                  {radar.found}
                </b>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ----------------------------- crowd (premiere) ---------------------------- */

/** Points inside a crescent moon, in a unit box, the same every time. */
function crescent(n: number) {
  const rand = seeded(42);
  const pts: Array<{ x: number; y: number }> = [];
  while (pts.length < n) {
    const x = rand() * 2 - 1;
    const y = rand() * 2 - 1;
    const inMoon = x * x + y * y < 1;
    const inBite = (x - 0.46) ** 2 + (y + 0.24) ** 2 < 0.8 ** 2;
    if (inMoon && !inBite) pts.push({ x, y });
  }
  return pts;
}

export const CrowdScene = ({
  crowd,
}: {
  crowd: NonNullable<TaskPageConfig['crowd']>;
}) => {
  const sec = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const title = useRef<TypedHandle>(null);
  const body = useRef<HTMLParagraphElement>(null);
  const counter = useRef<HTMLDivElement>(null);
  const note = useRef<HTMLParagraphElement>(null);
  const N = 1400;
  // Where each fan wanders before the crowd finds its shape, and its spot
  // in the moon after. Fan 0 is the first one, who stays in the middle and
  // sends the first messages; everyone after hears it from someone earlier.
  const fans = useMemo(() => {
    const rand = seeded(17);
    const moon = crescent(N);
    const out = moon.map((m, i) => ({
      from: 0,
      sx: i === 0 ? 0 : rand() * 2 - 1,
      sy: i === 0 ? 0 : rand() * 2 - 1,
      mx: m.x,
      my: m.y,
      ph: rand() * Math.PI * 2,
      hue: rand(),
    }));
    // Word of mouth: each fan hears it from the closest of a few earlier ones.
    out.forEach((f, i) => {
      let best = Infinity;
      for (let k = 0; i > 1 && k < 14; k += 1) {
        const j = Math.floor(rand() * i);
        const d = (out[j].sx - f.sx) ** 2 + (out[j].sy - f.sy) ** 2;
        if (d < best) [best, f.from] = [d, j];
      }
    });
    return out;
  }, []);

  useScrollFrame(sec, (p, t) => {
    const el = canvas.current;
    const g = el?.getContext('2d');
    if (!el || !g) return;
    const still = prefersReducedMotion();
    const at = (a: number, len: number) => (still ? 1 : clamp((p - a) / len));
    const dpr = Math.min(window.devicePixelRatio, 2);
    const W = el.clientWidth;
    const H = el.clientHeight;
    if (el.width !== Math.round(W * dpr) || el.height !== Math.round(H * dpr)) {
      el.width = Math.round(W * dpr);
      el.height = Math.round(H * dpr);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    const wide = W >= 900;
    const cx = wide ? W * 0.68 : W / 2;
    const cy = wide ? H / 2 : H * 0.62;
    const R = Math.min(wide ? W * 0.26 : W * 0.42, H * 0.34);
    // The crowd grows exponentially, then gathers into the moon.
    const grow = at(0.08, 0.5);
    const shown = Math.max(1, Math.floor(N ** grow));
    const k = at(0.62, 0.2);
    const gather = k * k * (3 - 2 * k);
    const time = still ? 0 : t / 1000;
    const pos = (i: number) => {
      const f = fans[i];
      const wx = W / 2 + f.sx * W * 0.5 + Math.sin(time * 0.6 + f.ph) * 14;
      const wy = H / 2 + f.sy * H * 0.45 + Math.cos(time * 0.5 + f.ph) * 10;
      return [
        wx + (cx + f.mx * R - wx) * gather,
        wy + (cy + f.my * R - wy) * gather,
      ];
    };

    // The newest messages: a line from whoever passed it on, with a dot
    // still travelling along it. They fade once the crowd takes shape.
    const reach = 1 - gather;
    if (reach > 0) {
      const newest = Math.max(1, shown - 70);
      g.lineWidth = 1;
      for (let i = newest; i < shown; i += 1) {
        const [x0, y0] = pos(fans[i].from);
        const [x1, y1] = pos(i);
        const age = (shown - i) / (shown - newest + 1);
        g.globalAlpha = reach * (1 - age) * 0.5;
        g.strokeStyle = '#ffc23d';
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.stroke();
        const d = still ? 1 : (time * 0.8 + fans[i].ph) % 1;
        g.globalAlpha = reach * (1 - age);
        g.fillStyle = '#f8efe0';
        g.beginPath();
        g.arc(x0 + (x1 - x0) * d, y0 + (y1 - y0) * d, 1.4, 0, Math.PI * 2);
        g.fill();
      }
    }

    for (let i = shown - 1; i >= 0; i -= 1) {
      const f = fans[i];
      const [x, y] = pos(i);
      const first = i === 0;
      g.globalAlpha = first ? 1 : 0.55 + 0.45 * Math.sin(time * 2 + f.ph) ** 2;
      g.fillStyle = first
        ? '#ffffff'
        : f.hue < 0.7
          ? '#ffc23d'
          : f.hue < 0.88
            ? '#ff4f3a'
            : '#f8efe0';
      g.beginPath();
      g.arc(x, y, first ? 5 : 1.6 + (1 - gather) * 0.6, 0, Math.PI * 2);
      g.fill();
      if (first) {
        // The first fan keeps a halo, so you can find them in the crowd.
        g.globalAlpha = 0.5 * (1 - gather);
        g.strokeStyle = '#ffc23d';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(x, y, 14 + Math.sin(time * 3) * 3, 0, Math.PI * 2);
        g.stroke();
      }
    }
    g.globalAlpha = 1;

    title.current?.type(at(0, 0.14));
    if (body.current) body.current.style.opacity = `${at(0.16, 0.06)}`;
    if (counter.current) {
      const stage = Math.min(
        crowd.counts.length - 1,
        Math.floor(grow * crowd.counts.length),
      );
      const label = crowd.counts[stage];
      if (counter.current.textContent !== label)
        counter.current.textContent = label;
    }
    if (note.current) {
      const c = at(0.84, 0.08);
      note.current.style.opacity = `${c}`;
      note.current.style.transform = `rotate(-4deg) translateY(${(1 - c) * 12}px)`;
    }
  });

  return (
    <section ref={sec} className={styles.sec} style={{ height: '360vh' }}>
      <div className={styles.pin}>
        <canvas ref={canvas} className={styles.canvasFill} aria-hidden="true" />
        <div className={styles.crowdTxt}>
          <div className={styles.kicker}>{crowd.kicker}</div>
          <Typed
            ref={title}
            as="h2"
            seed={61}
            segments={[{ text: crowd.title }]}
          />
          <p ref={body} style={{ opacity: 0 }}>
            {crowd.body}
          </p>
          <div ref={counter} className={styles.counter} aria-hidden="true">
            {crowd.counts[0]}
          </div>
          <p ref={note} className={styles.handNote} style={{ opacity: 0 }}>
            {crowd.note}
          </p>
        </div>
      </div>
    </section>
  );
};

/* ---------------------------- marquee (premiere) --------------------------- */

const FLAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export const MarqueeScene = ({
  marquee,
  firstName,
}: {
  marquee: NonNullable<TaskPageConfig['marquee']>;
  firstName: string;
}) => {
  const sec = useRef<HTMLElement>(null);
  const title = useRef<TypedHandle>(null);
  const board = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const cells = useRef<Array<HTMLSpanElement | null>>([]);
  const ring = useRef<SVGPathElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const shown = useRef({ board: -1, at: 0 });
  const cue = useRef<HTMLParagraphElement>(null);
  const boards = useMemo(
    () => [
      ...marquee.boards,
      {
        ...marquee.finale,
        cue: marquee.finale.cue.replace('{firstName}', firstName),
      },
    ],
    [marquee, firstName],
  );
  const width = Math.max(...boards.map((b) => b.text.length));
  const [before, after] = marquee.title.split(marquee.circle);

  useEffect(() => {
    const path = ring.current;
    const svg = path?.ownerSVGElement;
    const el = board.current;
    if (!path || !svg || !el) return;
    const place = () => {
      const w = el.offsetWidth + 40;
      const h = el.offsetHeight + 36;
      svg.setAttribute('width', `${w}`);
      svg.setAttribute('height', `${h}`);
      path.setAttribute('d', scribble('circle', w - 24, h - 24, seeded(8)));
      primeStroke(path);
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, []);

  useScrollFrame(sec, (p, t) => {
    const still = prefersReducedMotion();
    const at = (a: number, len: number) => (still ? 1 : clamp((p - a) / len));
    title.current?.type(at(0, 0.12));
    title.current?.mark(0, at(0.12, 0.06));

    const b = Math.min(
      boards.length - 1,
      Math.floor(at(0.16, 0.66) * boards.length),
    );
    if (b !== shown.current.board) shown.current = { board: b, at: t };
    const since = still ? 1e9 : t - shown.current.at;
    const line = boards[b];
    if (tag.current && tag.current.textContent !== line.tag)
      tag.current.textContent = line.tag;
    // The cue that got it there, scrawled under the board once it settles.
    if (cue.current) {
      if (cue.current.textContent !== line.cue)
        cue.current.textContent = line.cue;
      const c = clamp((since - 500) / 400);
      cue.current.style.opacity = `${c}`;
      cue.current.style.transform = `rotate(-2deg) translateY(${(1 - c) * 8}px)`;
    }
    // Centre the line, then let each flap spin a little longer than the last.
    const pad = Math.floor((width - line.text.length) / 2);
    const text = line.text.padStart(line.text.length + pad).padEnd(width);
    cells.current.forEach((cell, j) => {
      if (!cell) return;
      const target = text[j] ?? ' ';
      const settled = since > 180 + j * 45;
      const ch =
        settled || target === ' '
          ? target
          : FLAP[Math.floor((t / 50 + j * 7) % FLAP.length)];
      if (cell.textContent !== ch) cell.textContent = ch;
    });
    // A press camera goes off every time the board changes.
    if (flash.current)
      flash.current.style.opacity = `${still ? 0 : Math.max(0, 0.55 - since / 400)}`;
    drawStroke(ring.current, b === boards.length - 1 ? at(0.86, 0.08) : 0);
  });

  return (
    <section ref={sec} className={styles.sec} style={{ height: '420vh' }}>
      <div className={styles.pin}>
        <div ref={flash} className={styles.flash} aria-hidden="true" />
        <div className={styles.marquee}>
          <div className={styles.kicker}>{marquee.kicker}</div>
          <Typed
            ref={title}
            as="h2"
            seed={71}
            segments={
              after === undefined
                ? [{ text: marquee.title }]
                : [
                    { text: before },
                    { text: marquee.circle, mark: 'circle' },
                    { text: after },
                  ]
            }
          />
          <div className={styles.boardWrap}>
            <div ref={board} className={styles.board}>
              {Array.from({ length: 4 }, (_, side) => (
                <div key={side} className={styles.bulbs} data-side={side}>
                  {Array.from({ length: side % 2 ? 6 : 24 }, (_, i) => (
                    <i
                      key={i}
                      style={{ animationDelay: `${(i % 3) * -0.3}s` }}
                    />
                  ))}
                </div>
              ))}
              <div ref={tag} className={styles.boardTag}>
                {boards[0].tag}
              </div>
              <div
                className={styles.flaps}
                aria-label={boards
                  .map((x) => `${x.tag}: ${x.text}. ${x.cue}`)
                  .join(' ')}
              >
                {Array.from({ length: width }, (_, j) => (
                  <span
                    key={j}
                    ref={(el) => {
                      cells.current[j] = el;
                    }}
                    aria-hidden="true"
                  >
                    {' '}
                  </span>
                ))}
              </div>
            </div>
            <svg className={styles.boardRing} aria-hidden="true">
              <path ref={ring} className={styles.stroke} />
            </svg>
          </div>
          <p
            ref={cue}
            className={`${styles.handNote} ${styles.cue}`}
            style={{ opacity: 0 }}
          >
            {boards[0].cue}
          </p>
        </div>
        <div className={styles.ticker} aria-label={marquee.ticker.join(', ')}>
          <div aria-hidden="true">
            {[0, 1].map((copy) => (
              <span key={copy}>
                {marquee.ticker.map((item) => (
                  <span key={item}>
                    {item}
                    <b>✦</b>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
