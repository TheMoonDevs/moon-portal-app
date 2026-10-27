'use client';

import { IBM_Plex_Mono, Schibsted_Grotesk } from 'next/font/google';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { CODES, DREAMS, MANIFESTO } from '@/lib/company/codes';

import styles from './policies.module.css';

const sans = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '800'],
  style: ['normal', 'italic'],
  variable: '--codes-sans',
});
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--codes-mono',
});

const BG = '#0b0b0c';
const FG = '#ece7dd';
const DIM = 'rgba(236,231,221,.55)';
const VIOLET = '#7b3dff';
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* --------------------------- posters on a canvas --------------------------- */

// The dreams, split into the big words and the line under them.
const DREAM_POSTERS: Array<[string[], string]> = [
  [['BECOME', 'MILLION-', 'AIRES,'], 'and we meant it in USDs.'],
  [['INSPIRE', 'CHANGE'], 'in the work-world.'],
  [['GROW!'], 'Till our last breath on this planet.'],
];
const POSTERS = 2 + DREAM_POSTERS.length;

function wrap(g: CanvasRenderingContext2D, text: string, maxW: number) {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > maxW && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

function drawPoster(i: number, W: number, H: number, k: number) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const SANS = sans.style.fontFamily;
  const MONO = mono.style.fontFamily;
  const font = (w: number, s: number, fam = SANS, it = '') =>
    `${it}${w} ${s}px ${fam}`;
  const track = (s: number) => {
    if ('letterSpacing' in g)
      (g as unknown as { letterSpacing: string }).letterSpacing =
        `${-s * 0.045}px`;
  };
  const untrack = () => {
    if ('letterSpacing' in g)
      (g as unknown as { letterSpacing: string }).letterSpacing = '0px';
  };
  g.fillStyle = BG;
  g.fillRect(0, 0, W, H);

  const m = Math.max(16 * k, W * 0.045);
  const inner = W - 2 * m;
  const small = Math.max(12.5 * k, Math.min(W * 0.017, 18 * k));
  const top = m + 44 * k;
  const block = (
    lines: string[],
    x: number,
    y: number,
    align: CanvasTextAlign = 'left',
    color = FG,
    f = font(500, small),
  ) => {
    g.font = f;
    g.fillStyle = color;
    g.textAlign = align;
    lines.forEach((l, j) => g.fillText(l, x, y + j * small * 1.25));
    g.textAlign = 'left';
  };
  const big = (lines: string[], y0: number, maxS: number) => {
    g.font = font(800, maxS);
    let s = Math.min(
      maxS,
      ...lines.map((l) => (maxS * inner) / g.measureText(l).width),
    );
    track(s);
    g.font = font(800, s);
    const widest = Math.max(...lines.map((l) => g.measureText(l).width));
    if (widest > inner) {
      s *= inner / widest;
      track(s);
      g.font = font(800, s);
    }
    g.fillStyle = FG;
    lines.forEach((l, j) =>
      g.fillText(l, m - s * 0.04, y0 + s * 0.78 + j * s * 0.86),
    );
    untrack();
    return y0 + s * 0.78 + (lines.length - 1) * s * 0.86;
  };
  const logo = (x: number, y: number, r: number) => {
    g.save();
    g.strokeStyle = FG;
    g.lineWidth = r * 0.1;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.moveTo(x - r * 0.4, y - r * 0.32);
    g.lineTo(x - r * 0.02, y + r * 0.24);
    g.lineTo(x + r * 0.3, y - r * 0.28);
    g.stroke();
    g.beginPath();
    g.moveTo(x + r * 0.38, y - r * 0.05);
    g.lineTo(x + r * 0.38, y + r);
    g.stroke();
    g.restore();
  };
  const para = (text: string, color: string, weight: number) => {
    g.font = font(weight, small * 1.15);
    const lines = wrap(g, text, Math.min(inner * 0.62, 30 * small));
    block(
      lines,
      m,
      H - m - 30 * k - (lines.length - 1) * small * 1.3,
      'left',
      color,
      font(weight, small * 1.15),
    );
  };

  if (i === 0) {
    block(['The Moon Devs,', 'how we work.'], m, top);
    block(
      ['Dreams, manifesto', `& ${CODES.length} codes`],
      W - m,
      top,
      'right',
      DIM,
    );
    const end = big(['WE HAVE', 'DREAMS,'], H * (W > H ? 0.2 : 0.26), H * 0.3);
    const s = Math.min(inner * 0.16, H * 0.1);
    g.font = font(500, s, SANS, 'italic ');
    g.textAlign = 'right';
    g.fillStyle = VIOLET;
    g.fillText('big ones.', W - m, end + s * 1.05);
    g.textAlign = 'left';
    para(
      "Those who dare not say their dreams out loud, don't take it seriously.",
      FG,
      500,
    );
    logo(W - m - small * 1.8, H - m - 30 * k - small * 1.4, small * 1.6);
  } else if (i <= DREAM_POSTERS.length) {
    const [words, rest] = DREAM_POSTERS[i - 1];
    block(
      [`Dream 0${i} / 0${DREAMS.length}`],
      m,
      top,
      'left',
      VIOLET,
      font(500, small, MONO),
    );
    block(['We have dreams,', 'big ones.'], W - m, top, 'right', DIM);
    const one = words.length === 1;
    const end = big(
      words,
      one ? H * 0.34 : H * (W > H ? 0.2 : 0.28),
      one ? H * 0.5 : H * 0.28,
    );
    const s2 = Math.min(inner * 0.075, 44 * k);
    g.font = font(500, s2, SANS, 'italic ');
    g.fillStyle = FG;
    wrap(g, rest, inner).forEach((l, j) =>
      g.fillText(l, m, end + s2 * 1.6 + j * s2 * 1.15),
    );
  } else {
    block(['The manifesto'], m, top, 'left', VIOLET, font(500, small, MONO));
    let s = Math.min(W * 0.1, H * 0.12);
    let lines: string[] = [];
    for (;;) {
      track(s);
      g.font = font(800, s);
      lines = wrap(g, MANIFESTO.title, inner);
      if (lines.length * s * 0.9 < H * 0.5 || s < 20) break;
      s *= 0.93;
    }
    g.fillStyle = FG;
    lines.forEach((l, j) =>
      g.fillText(l, m - s * 0.03, H * 0.2 + s * 0.8 + j * s * 0.9),
    );
    untrack();
    para(MANIFESTO.body, DIM, 400);
  }
  return c;
}

const VERTEX = `uniform float warp, time; uniform vec2 mouse; varying vec2 vUv; varying float vShade;
void main() {
  vUv = uv; vec3 p = position; float strips = 18.; float col = floor(uv.x * strips) / strips;
  float wave = sin(uv.y * 5.5 + col * 11. + time * 1.1) * .32 + sin(uv.x * 3.1416) * .55;
  p.z += warp * wave;
  float a = warp * (uv.y - .5) * 1.7 + mouse.x * .18 * warp; float c = cos(a), s = sin(a);
  p.xz = mat2(c, -s, s, c) * p.xz; p.y += warp * sin(col * 7. + time * .6) * .12; vShade = wave;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
}`;
const FRAGMENT = `uniform sampler2D tex; uniform float warp, time; uniform vec3 violet; varying vec2 vUv; varying float vShade;
float h(float n) { return fract(sin(n * 91.7) * 43758.5); }
float r(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5); }
void main() {
  vec2 uv = vUv; float strips = 18.; float s = floor(uv.x * strips);
  uv.y += warp * ((h(s) - .5) * .55 + sin(s * .9 + time * .8) * .12);
  float sx = (s + .5) / strips; uv.x = sx + (uv.x - sx) * (1. - warp * .55);
  vec3 bg = vec3(.043, .043, .047);
  vec3 col = (uv.y < 0. || uv.y > 1.) ? bg : texture2D(tex, uv).rgb;
  float e = abs(fract(vUv.x * strips) - .5); col += violet * warp * smoothstep(.43, .5, e) * .75;
  col *= 1. - warp * clamp(-vShade, 0., 1.) * .35; col += (r(gl_FragCoord.xy + time) - .5) * .045;
  gl_FragColor = vec4(col, 1.);
}`;

export const PoliciesPage = () => {
  const warpSec = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const idx = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLElement>(null);
  const codesSec = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const sec = warpSec.current;
    const codes = codesSec.current;
    const strip = track.current;
    if (!el || !sec || !codes || !strip) return;
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 50);
    const uniforms = {
      tex: { value: null as THREE.Texture | null },
      warp: { value: 0 },
      time: { value: 0 },
      mouse: { value: new THREE.Vector2() },
      violet: { value: new THREE.Color(VIOLET) },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      side: THREE.DoubleSide,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
    });
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2, 180, 120),
      material,
    );
    scene.add(mesh);

    let textures: THREE.Texture[] = [];
    const build = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const k = Math.min(window.devicePixelRatio, 2);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = 1 / Math.tan(THREE.MathUtils.degToRad(22.5));
      camera.updateProjectionMatrix();
      mesh.scale.set(w / h, 1, 1);
      const W = Math.min(2048, Math.round(w * k));
      const H = Math.round((W * h) / w);
      textures.forEach((t) => t.dispose());
      textures = Array.from({ length: POSTERS }, (_, i) => {
        const t = new THREE.CanvasTexture(drawPoster(i, W, H, W / w));
        t.colorSpace = THREE.SRGBColorSpace;
        t.minFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        return t;
      });
    };
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        build();
        sizeStrip();
      }, 150);
    };
    const onMove = (e: PointerEvent) =>
      uniforms.mouse.value.set(
        e.clientX / window.innerWidth - 0.5,
        e.clientY / window.innerHeight - 0.5,
      );

    // The strip is as tall as it is wide, so scrolling down moves it sideways.
    let dist = 0;
    const sizeStrip = () => {
      dist = Math.max(0, strip.scrollWidth - window.innerWidth + 40);
      codes.style.height = `${dist + window.innerHeight}px`;
    };
    sec.style.height = `${POSTERS * 100 + 30}vh`;
    const fontsReady = document.fonts
      ? Promise.all([
          document.fonts.load(`800 40px ${sans.style.fontFamily}`),
          document.fonts.load(`italic 500 40px ${sans.style.fontFamily}`),
          document.fonts.load(`500 20px ${mono.style.fontFamily}`),
        ])
      : Promise.resolve();
    fontsReady.then(build, build).then(sizeStrip);
    sizeStrip();
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove);

    const cards = Array.from(strip.children) as HTMLElement[];
    const poison = Array.from(
      strip.querySelectorAll<HTMLElement>('[data-poison]'),
    );
    const alch = Array.from(
      strip.querySelectorAll<SVGGeometryElement>('[data-alch] *'),
    );
    alch.forEach((n) => {
      const len = n.getTotalLength();
      n.style.strokeDasharray = `${len}`;
      n.style.strokeDashoffset = `${len}`;
      n.dataset.len = `${len}`;
    });

    let smooth = 0;
    let last = 0;
    let vel = 0;
    let raf = 0;
    const tick = (t: number) => {
      const r = sec.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
      smooth += (p - smooth) * (reduce ? 1 : 0.1);
      vel += ((smooth - last) * 60 - vel) * 0.1;
      last = smooth;
      const T = smooth * (POSTERS - 1);
      const seg = Math.min(POSTERS - 1, Math.floor(T));
      const f = T - seg;
      let w = 0;
      let show = seg;
      if (seg < POSTERS - 1 && f > 0.35) {
        const q = (f - 0.35) / 0.65;
        w = Math.sin(Math.PI * q);
        if (q > 0.5) show = seg + 1;
      }
      if (reduce) w = 0;
      uniforms.warp.value = clamp(
        w + (reduce ? 0 : Math.min(Math.abs(vel) * 0.6, 0.18)) * (1 - w),
        0,
        1.15,
      );
      uniforms.time.value = t / 1000;
      if (textures[show]) uniforms.tex.value = textures[show];
      if (idx.current) idx.current.textContent = `0${show + 1} / 0${POSTERS}`;
      if (bar.current) bar.current.style.width = `${smooth * 100}%`;
      if (r.bottom > 0) renderer.render(scene, camera);

      const cr = codes.getBoundingClientRect();
      const q = clamp(-cr.top / Math.max(1, cr.height - window.innerHeight));
      strip.style.transform = `translate3d(${-q * dist}px,0,0)`;
      const centre = window.innerWidth * 0.5;
      cards.forEach((c) => {
        const b = c.getBoundingClientRect();
        c.classList.toggle(
          styles.on,
          b.left < centre && b.right > window.innerWidth * 0.2,
        );
      });
      const strikeCard = poison[0]?.closest(
        `.${styles.card}`,
      ) as HTMLElement | null;
      if (strikeCard) {
        const b = strikeCard.getBoundingClientRect();
        const k = reduce
          ? 1
          : clamp((window.innerWidth * 0.75 - b.left) / (b.width * 1.1));
        poison.forEach((s, i) => {
          const on = k * poison.length > i + 0.3;
          s.style.setProperty('--k', on ? '1' : '0');
          if (on) s.setAttribute('data-struck', '');
          else s.removeAttribute('data-struck');
        });
      }
      const lawCard = alch[0]?.closest(`.${styles.card}`) as HTMLElement | null;
      if (lawCard) {
        const b = lawCard.getBoundingClientRect();
        const k = reduce
          ? 1
          : clamp((window.innerWidth * 0.9 - b.left) / (b.width * 0.9));
        alch.forEach((n, i) => {
          n.style.strokeDashoffset = `${Number(n.dataset.len) * (1 - clamp(k * 1.6 - i * 0.06))}`;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      textures.forEach((t) => t.dispose());
      material.dispose();
      mesh.geometry.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className={`${styles.root} ${sans.variable} ${mono.variable}`}>
      <header className={styles.top}>
        <Link href="/">← The Moon Devs</Link>
        <span>How we work</span>
      </header>

      <section
        ref={warpSec}
        className={styles.warp}
        aria-label="Our dreams and manifesto"
      >
        <div className={styles.pin}>
          <canvas ref={canvas} className={styles.gl} aria-hidden="true" />
          <div className={styles.hud}>
            <span ref={idx}>01 / 0{POSTERS}</span>
            <span className={styles.bar}>
              <i ref={bar} />
            </span>
            <span>scroll</span>
          </div>
        </div>
        <div className={styles.sr}>
          <p>
            We have dreams, big ones. Those who dare not say their dreams out
            loud, don&apos;t take it seriously.
          </p>
          {DREAMS.map((d) => (
            <p key={d}>{d}</p>
          ))}
          <p>{MANIFESTO.title}</p>
          <p>{MANIFESTO.body}</p>
        </div>
      </section>

      <section ref={codesSec} className={styles.codes} aria-label="How we work">
        <div className={styles.pin}>
          <div className={styles.head}>
            <h2>How we work.</h2>
            <span>
              {CODES.length} codes
              <br />
              keep scrolling →
            </span>
          </div>
          <div ref={track} className={styles.track}>
            {CODES.map((code, i) => (
              <article
                key={code.title}
                className={`${styles.card} ${code.quote ? styles.law : ''}`}
              >
                {code.quote && (
                  <svg
                    className={styles.alch}
                    viewBox="0 0 200 200"
                    aria-hidden="true"
                    data-alch=""
                  >
                    <circle cx="100" cy="100" r="94" />
                    <circle cx="100" cy="100" r="82" />
                    <path d="M100 18 171 141H29Z" />
                    <path d="M100 182 29 59h142Z" />
                    <circle cx="100" cy="100" r="36" />
                    {[
                      [100, 18],
                      [171, 141],
                      [29, 141],
                      [100, 182],
                      [29, 59],
                      [171, 59],
                    ].map(([cx, cy]) => (
                      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="7" />
                    ))}
                  </svg>
                )}
                <div className={styles.num}>{i + 1}</div>
                <h3
                  className={code.title.length > 60 ? styles.long : undefined}
                >
                  {code.title}
                </h3>
                {code.body && <p>{code.body}</p>}
                {code.strike && (
                  <div className={styles.poison}>
                    {code.strike.map((word) => (
                      <span key={word} data-poison="">
                        {word}
                      </span>
                    ))}
                  </div>
                )}
                {code.quote && (
                  <>
                    <q>{code.quote}</q>
                    <small>(Yes, that one. Alchemists will know.)</small>
                  </>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <p className={styles.foot}>
        The Moon Devs · <Link href="/">back to the portal</Link>
      </p>
    </div>
  );
};
