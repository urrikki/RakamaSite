import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

// Canvas 2D plein ecran pour les explosions de particules (etincelles, confettis).

export interface BurstsHandle {
  burst: (x: number, y: number, colors: string[], count?: number, power?: number) => void;
  rain: (colors: string[], count?: number) => void;
}

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: 0 | 1; // 0 etincelle, 1 confetti
  rot: number;
  vr: number;
}

export const Bursts = forwardRef<BurstsHandle>(function Bursts(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parts = useRef<P[]>([]);

  useImperativeHandle(ref, () => ({
    burst(x, y, colors, count = 120, power = 1) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = (2 + Math.random() * 9) * power;
        parts.current.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s - 2,
          life: 0,
          max: 50 + Math.random() * 60,
          size: 1.5 + Math.random() * 3.5,
          color: colors[i % colors.length],
          kind: Math.random() < 0.35 ? 1 : 0,
          rot: Math.random() * 6,
          vr: (Math.random() - 0.5) * 0.4,
        });
      }
    },
    rain(colors, count = 160) {
      const w = window.innerWidth;
      for (let i = 0; i < count; i++) {
        parts.current.push({
          x: Math.random() * w,
          y: -20 - Math.random() * 300,
          vx: (Math.random() - 0.5) * 2,
          vy: 2 + Math.random() * 4,
          life: 0,
          max: 160 + Math.random() * 80,
          size: 3 + Math.random() * 4,
          color: colors[i % colors.length],
          kind: 1,
          rot: Math.random() * 6,
          vr: (Math.random() - 0.5) * 0.3,
        });
      }
    },
  }));

  useEffect(() => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    let raf = 0;
    const resize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const loop = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.globalCompositeOperation = "lighter";
      const arr = parts.current;
      for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i];
        p.life++;
        p.vx *= 0.975;
        p.vy = p.vy * 0.975 + (p.kind ? 0.12 : 0.08);
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        const a = 1 - p.life / p.max;
        if (a <= 0) {
          arr.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        if (p.kind === 0) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.shadowBlur = 0;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size, -p.size / 2.5, p.size * 2, p.size / 1.25);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="bursts-canvas" />;
});
