'use client';

import { useEffect, useRef, useState } from 'react';

/*
 * A pad to draw a signature on, with a mouse, finger or pen. Used on the
 * public signing page and wherever someone saves their signature.
 */

const W = 600;
const H = 180;

/** A pad to draw a signature on, with a mouse, finger or pen. */
export const SignaturePad = ({
  onChange,
}: {
  onChange: (png: string | null) => void;
}) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#18181b';
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H,
    };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.1, p.y + 0.1);
    ctx.stroke();
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setEmpty(false);
    onChange(canvas.current?.toDataURL('image/png') ?? null);
  };
  const clear = () => {
    const c = canvas.current;
    c?.getContext('2d')?.clearRect(0, 0, W, H);
    setEmpty(true);
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative overflow-hidden rounded-xl border border-dashed border-zinc-300 bg-white">
        <canvas
          ref={canvas}
          width={W}
          height={H}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
          className="block aspect-[10/3] w-full cursor-crosshair touch-none"
          aria-label="Draw your signature"
        />
        {empty && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
            Draw your signature here
          </span>
        )}
        <span className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-zinc-200" />
      </div>
      {!empty && (
        <button
          type="button"
          onClick={clear}
          className="self-start text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-800"
        >
          Clear and draw again
        </button>
      )}
    </div>
  );
};
