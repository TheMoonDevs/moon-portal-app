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

/* ------------------------------ feed (monsoon) ----------------------------- */

type Rect = { x: number; y: number; w: number; h: number };

const lerpRect = (a: Rect, b: Rect, k: number): Rect => ({
  x: a.x + (b.x - a.x) * k,
  y: a.y + (b.y - a.y) * k,
  w: a.w + (b.w - a.w) * k,
  h: a.h + (b.h - a.h) * k,
});

const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}K` : `${n}`;

/**
 * Mumbai at 2 AM, drawn once per size: a skyline of towers with a few lit
 * windows, on a transparent ground so the water can mirror it.
 */
function drawSkyline(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) return c;
  const rand = seeded(66);
  const base = h * 0.64;
  // Two rows of towers: hazy ones far back, darker ones in front.
  [
    { tone: '#1d1440', top: 0.18, lit: 0.05 },
    { tone: '#0b0820', top: 0.3, lit: 0.12 },
  ].forEach((row) => {
    let x = -20;
    while (x < w + 20) {
      const bw = 18 + rand() * 64;
      const bh = base * (row.top + rand() * 0.5);
      g.fillStyle = row.tone;
      g.fillRect(x, base - bh, bw, bh);
      if (rand() < 0.18) g.fillRect(x + bw / 2 - 1, base - bh - 18, 2, 18);
      for (let wy = base - bh + 6; wy < base - 6; wy += 9) {
        for (let wx = x + 4; wx < x + bw - 6; wx += 8) {
          if (rand() > row.lit) continue;
          g.fillStyle = rand() < 0.75 ? '#ffd9a1' : '#9fefff';
          g.globalAlpha = 0.5 + rand() * 0.5;
          g.fillRect(wx, wy, 3, 4);
          g.globalAlpha = 1;
        }
      }
      x += bw + rand() * 6;
    }
  });
  return c;
}

export const FeedScene = ({
  feed,
}: {
  feed: NonNullable<TaskPageConfig['feed']>;
}) => {
  const sec = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const shot = useRef<HTMLDivElement>(null);
  const phone = useRef<HTMLElement>(null);
  const title = useRef<TypedHandle>(null);
  const note = useRef<HTMLParagraphElement>(null);
  const body = useRef<HTMLParagraphElement>(null);
  const counts = useRef<Array<HTMLElement | null>>([]);
  const ring = useRef<SVGPathElement>(null);
  const comments = useRef<Array<HTMLLIElement | null>>([]);
  const payoff = useRef<HTMLParagraphElement>(null);
  const city = useRef<HTMLCanvasElement | null>(null);
  const hearts = useRef<Array<{ x: number; y: number; v: number; s: number }>>(
    [],
  );
  const last = useRef(0);
  const [strike, ...rest] = feed.title.split(' ').reverse();
  const lead = `${rest.reverse().join(' ')} `;

  useEffect(() => {
    const path = ring.current;
    const svg = path?.ownerSVGElement;
    if (!path || !svg) return;
    const place = () => {
      const box = svg.parentElement;
      if (!box) return;
      const w = box.offsetWidth + 24;
      const h = box.offsetHeight + 16;
      svg.setAttribute('width', `${w}`);
      svg.setAttribute('height', `${h}`);
      path.setAttribute('d', scribble('circle', w - 16, h - 12, seeded(9)));
      primeStroke(path);
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, []);

  useScrollFrame(sec, (p, t) => {
    const el = canvas.current;
    const g = el?.getContext('2d');
    const box = pin.current?.getBoundingClientRect();
    const target = shot.current?.getBoundingClientRect();
    if (!el || !g || !box || !target) return;
    const still = prefersReducedMotion();
    const at = (a: number, len: number) => (still ? 1 : clamp((p - a) / len));

    const dpr = Math.min(window.devicePixelRatio, 2);
    const W = box.width;
    const H = box.height;
    if (el.width !== Math.round(W * dpr) || el.height !== Math.round(H * dpr)) {
      el.width = Math.round(W * dpr);
      el.height = Math.round(H * dpr);
      city.current = drawSkyline(Math.round(W), Math.round(H));
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    // The city fills the screen, then shrinks into the post on the phone.
    const m = at(0.16, 0.18);
    const ease = m * m * (3 - 2 * m);
    const r = lerpRect(
      { x: 0, y: 0, w: W, h: H },
      {
        x: target.left - box.left,
        y: target.top - box.top,
        w: target.width,
        h: target.height,
      },
      ease,
    );
    const s = Math.max(r.w / W, r.h / H);
    g.save();
    g.beginPath();
    g.roundRect(r.x, r.y, r.w, r.h, 16 * ease);
    g.clip();
    g.translate(r.x + r.w / 2, r.y + r.h / 2);
    g.scale(s, s);
    g.translate(-W / 2, -H * 0.56);
    const base = H * 0.64;
    const sky = g.createLinearGradient(0, 0, 0, base);
    sky.addColorStop(0, '#07051a');
    sky.addColorStop(0.7, '#2a0f45');
    sky.addColorStop(1, '#5c1557');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, base);
    // A pink haze over the city, like signs bouncing off low cloud.
    const haze = g.createRadialGradient(W / 2, base, 0, W / 2, base, W * 0.6);
    haze.addColorStop(0, 'rgba(255, 61, 154, 0.45)');
    haze.addColorStop(1, 'rgba(255, 61, 154, 0)');
    g.fillStyle = haze;
    g.fillRect(0, 0, W, base);
    if (city.current) g.drawImage(city.current, 0, 0, W, H);

    // The train on its bridge, lit windows sliding across the water.
    const tx = ((still ? 0.3 : p * 1.6 + t / 9000) % 1.4) * W * 1.3 - W * 0.5;
    g.fillStyle = '#05030f';
    g.fillRect(0, base - 6, W, 6);
    for (let k = 0; k < 9; k += 1) {
      const cx = tx + k * 64;
      g.fillStyle = '#120a2a';
      g.fillRect(cx, base - 22, 60, 16);
      g.fillStyle = '#fff1c4';
      for (let j = 0; j < 6; j += 1)
        g.fillRect(cx + 5 + j * 9, base - 18, 6, 6);
    }

    // The flood: the city mirrored, rippling in thin strips.
    const water = g.createLinearGradient(0, base, 0, H);
    water.addColorStop(0, '#12082b');
    water.addColorStop(1, '#04020c');
    g.fillStyle = water;
    g.fillRect(0, base, W, H * 1.2 - base);
    for (let y = 0; y < H - base; y += 3) {
      const wob = Math.sin(y * 0.18 + (still ? 0 : t / 380)) * (1 + y * 0.04);
      g.globalAlpha = 0.5 * (1 - y / (H - base));
      if (city.current)
        g.drawImage(city.current, 0, base - y - 3, W, 3, wob, base + y, W, 3);
    }
    g.globalAlpha = 1;

    // Rain, slanted, over everything.
    const rand = seeded(3);
    g.strokeStyle = 'rgba(159, 239, 255, 0.35)';
    g.lineWidth = 1;
    g.beginPath();
    for (let k = 0; k < 140; k += 1) {
      const x0 = rand() * W * 1.2;
      const y0 = (rand() * H + (still ? 0 : t * (0.6 + rand() * 0.6))) % H;
      g.moveTo(x0 - y0 * 0.2, y0);
      g.lineTo(x0 - y0 * 0.2 - 4, y0 + 18);
    }
    g.stroke();
    g.restore();

    // Hearts rise off the post while its numbers climb.
    const k = at(0.4, 0.34) ** 2.2;
    const born = Math.max(0, Math.round((k - last.current) * 160));
    last.current = k;
    for (let i = 0; i < born && !still; i += 1) {
      hearts.current.push({
        x: r.x + r.w * (0.6 + Math.random() * 0.4),
        y: r.y + r.h,
        v: 0.6 + Math.random() * 1.2,
        s: 10 + Math.random() * 12,
      });
    }
    g.font = '700 16px sans-serif';
    hearts.current = hearts.current.filter((h) => h.y > r.y - 80);
    hearts.current.forEach((h, i) => {
      h.y -= h.v * 2;
      g.globalAlpha = clamp((h.y - (r.y - 80)) / 120);
      g.fillStyle = i % 3 ? '#ff3d9a' : '#39e6ff';
      g.font = `700 ${h.s}px sans-serif`;
      g.fillText('♥', h.x + Math.sin(h.y / 20) * 6, h.y);
    });
    g.globalAlpha = 1;

    title.current?.type(at(0, 0.12));
    title.current?.mark(0, at(0.14, 0.05));
    if (note.current) note.current.style.opacity = `${at(0.2, 0.04)}`;
    if (body.current) body.current.style.opacity = `${at(0.3, 0.06)}`;
    // The phone's frame arrives only once the city has shrunk into it.
    if (phone.current) phone.current.style.opacity = `${at(0.3, 0.04)}`;
    feed.counts.forEach((c, i) => {
      const cell = counts.current[i];
      if (cell) cell.textContent = compact(Math.round(c.to * k));
    });
    drawStroke(ring.current, at(0.72, 0.06));
    feed.comments.forEach((_, i) => {
      const li = comments.current[i];
      if (!li) return;
      const c = at(0.48 + i * 0.07, 0.04);
      li.style.opacity = `${c}`;
      li.style.transform = `translateY(${(1 - c) * 12}px)`;
    });
    if (payoff.current) {
      const c = at(0.84, 0.08);
      payoff.current.style.opacity = `${c}`;
      payoff.current.style.transform = `rotate(-3deg) translateY(${(1 - c) * 14}px)`;
    }
  });

  return (
    <section ref={sec} className={styles.sec} style={{ height: '420vh' }}>
      <div ref={pin} className={styles.pin}>
        <canvas ref={canvas} className={styles.canvasFill} aria-hidden="true" />
        <div className={styles.feed}>
          <div className={styles.feedTxt}>
            <div className={styles.kicker}>{feed.kicker}</div>
            <Typed
              ref={title}
              as="h2"
              seed={41}
              segments={[{ text: lead }, { text: strike, mark: 'strike' }]}
            />
            <p ref={note} className={styles.handNote} style={{ opacity: 0 }}>
              {feed.note}
            </p>
            <p ref={body} className={styles.feedBody} style={{ opacity: 0 }}>
              {feed.body}
            </p>
            <p ref={payoff} className={styles.payoff} style={{ opacity: 0 }}>
              {feed.payoff}
            </p>
          </div>
          <figure
            ref={phone}
            className={styles.phone}
            aria-label="A post going live"
            style={{ opacity: 0 }}
          >
            <header>
              <b>{feed.post.handle}</b>
              <span>{feed.post.time}</span>
              <span className={styles.live}>live</span>
            </header>
            <div ref={shot} className={styles.shot} aria-hidden="true" />
            <figcaption>{feed.post.caption}</figcaption>
            <dl>
              {feed.counts.map((c, i) => (
                <div key={c.label}>
                  <dt>{c.label}</dt>
                  <dd
                    ref={(el) => {
                      counts.current[i] = el;
                    }}
                  >
                    0
                  </dd>
                  {i === 0 && (
                    <svg aria-hidden="true">
                      <path ref={ring} className={styles.stroke} />
                    </svg>
                  )}
                </div>
              ))}
            </dl>
            <ol>
              {feed.comments.map((text, i) => (
                <li
                  key={text}
                  ref={(el) => {
                    comments.current[i] = el;
                  }}
                  style={{ opacity: 0 }}
                >
                  {text}
                </li>
              ))}
            </ol>
          </figure>
        </div>
      </div>
    </section>
  );
};

/* ---------------------------- playlist (monsoon) --------------------------- */

export const PlaylistScene = ({
  playlist,
  firstName,
}: {
  playlist: NonNullable<TaskPageConfig['playlist']>;
  firstName: string;
}) => {
  const sec = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const title = useRef<TypedHandle>(null);
  const rows = useRef<Array<HTMLLIElement | null>>([]);
  const ticks = useRef<Array<SVGPathElement | null>>([]);
  const mine = useRef<HTMLLIElement>(null);
  const ring = useRef<SVGPathElement>(null);
  const arrow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ticks.current.forEach((t) => t && primeStroke(t));
    const path = ring.current;
    const svg = path?.ownerSVGElement;
    const row = mine.current;
    if (!path || !svg || !row) return;
    const place = () => {
      const w = row.offsetWidth + 28;
      const h = row.offsetHeight + 22;
      svg.setAttribute('width', `${w}`);
      svg.setAttribute('height', `${h}`);
      path.setAttribute('d', scribble('circle', w - 16, h - 14, seeded(12)));
      primeStroke(path);
    };
    place();
    window.addEventListener('resize', place);
    document.fonts?.ready.then(place);
    return () => window.removeEventListener('resize', place);
  }, []);

  useScrollFrame(sec, (p, t) => {
    const still = prefersReducedMotion();
    const at = (a: number, len: number) => (still ? 1 : clamp((p - a) / len));
    title.current?.type(at(0, 0.14));
    playlist.rows.forEach((_, i) => {
      const el = rows.current[i];
      const k = at(0.2 + i * 0.1, 0.05);
      if (el) {
        el.style.opacity = `${0.25 + k * 0.75}`;
        el.style.transform = `translateX(${(1 - k) * 14}px)`;
      }
      drawStroke(ticks.current[i], at(0.23 + i * 0.1, 0.04));
    });
    const k = at(0.66, 0.08);
    if (mine.current) mine.current.style.opacity = `${0.25 + k * 0.75}`;
    drawStroke(ring.current, at(0.72, 0.1));
    if (arrow.current) arrow.current.style.opacity = `${at(0.8, 0.06)}`;

    // A record spinning, its sound drawn as rays around it.
    const el = canvas.current;
    const g = el?.getContext('2d');
    if (!el || !g) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const size = el.clientWidth;
    if (el.width !== Math.round(size * dpr)) {
      el.width = el.height = Math.round(size * dpr);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, size, size);
    const c = size / 2;
    const R = size * 0.27;
    const time = still ? 0 : t / 1000;
    // Louder as more playlists pick it up.
    const loud = 0.25 + at(0.18, 0.6) * 0.75;
    const bars = 96;
    for (let i = 0; i < bars; i += 1) {
      const a = (i / bars) * Math.PI * 2 - Math.PI / 2;
      const amp =
        (0.35 +
          0.35 *
            Math.sin(i * 0.7 + time * 3.1) *
            Math.sin(i * 0.23 - time * 1.7) +
          0.3 * Math.sin(i * 1.9 + time * 5.3) ** 2) *
        loud;
      const len = size * 0.04 + Math.abs(amp) * size * 0.17;
      const mix = (Math.cos(a) + 1) / 2;
      g.strokeStyle = `rgb(${Math.round(255 * mix + 57 * (1 - mix))},${Math.round(61 * mix + 230 * (1 - mix))},${Math.round(154 * mix + 255 * (1 - mix))})`;
      g.lineWidth = Math.max(2, size / 180);
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(c + Math.cos(a) * (R + 10), c + Math.sin(a) * (R + 10));
      g.lineTo(
        c + Math.cos(a) * (R + 10 + len),
        c + Math.sin(a) * (R + 10 + len),
      );
      g.stroke();
    }
    g.save();
    g.translate(c, c);
    g.rotate(still ? 0 : time * 1.4);
    g.fillStyle = '#05030f';
    g.beginPath();
    g.arc(0, 0, R, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(244, 238, 254, 0.07)';
    g.lineWidth = 1;
    for (let rr = R * 0.42; rr < R - 3; rr += 4) {
      g.beginPath();
      g.arc(0, 0, rr, 0, Math.PI * 2);
      g.stroke();
    }
    // A sheen that turns with the record.
    g.fillStyle = 'rgba(57, 230, 255, 0.12)';
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, R - 2, -0.5, 0.1);
    g.fill();
    g.fillStyle = '#ff3d9a';
    g.beginPath();
    g.arc(0, 0, R * 0.36, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#0d0a1f';
    g.font = `700 ${Math.round(R * 0.11)}px sans-serif`;
    g.textAlign = 'center';
    g.fillText(playlist.track.title.toUpperCase(), 0, -R * 0.08);
    g.font = `500 ${Math.round(R * 0.07)}px monospace`;
    g.fillText(playlist.track.artist.toLowerCase(), 0, R * 0.1);
    g.beginPath();
    g.arc(0, 0, R * 0.035, 0, Math.PI * 2);
    g.fill();
    g.restore();
  });

  return (
    <section ref={sec} className={styles.sec} style={{ height: '300vh' }}>
      <div className={styles.pin}>
        <div className={styles.playlist}>
          <canvas ref={canvas} className={styles.record} aria-hidden="true" />
          <div>
            <div className={styles.kicker}>{playlist.kicker}</div>
            <Typed
              ref={title}
              as="h2"
              seed={53}
              segments={[{ text: playlist.title }]}
            />
            <ol className={styles.lists}>
              {playlist.rows.map((name, i) => (
                <li
                  key={name}
                  ref={(el) => {
                    rows.current[i] = el;
                  }}
                >
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  {name}
                  <svg viewBox="0 0 24 18" aria-hidden="true">
                    <path
                      ref={(el) => {
                        ticks.current[i] = el;
                      }}
                      className={styles.stroke}
                      d="M2 10 C 5 12, 7 14, 9 16 C 12 10, 16 5, 22 2"
                    />
                  </svg>
                </li>
              ))}
              <li ref={mine} data-mine="">
                <span>{String(playlist.rows.length + 1).padStart(2, '0')}</span>
                {playlist.slot} {firstName}?
                <svg className={styles.mineRing} aria-hidden="true">
                  <path ref={ring} className={styles.stroke} />
                </svg>
              </li>
            </ol>
            <div
              ref={arrow}
              className={styles.arrowNote}
              style={{ opacity: 0 }}
            >
              <svg viewBox="0 0 60 40" aria-hidden="true">
                <path
                  className={styles.stroke}
                  d="M56 36 C 44 30, 30 22, 10 8 M10 8 L 22 9 M10 8 L 13 20"
                />
              </svg>
              your pitch lands here
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
