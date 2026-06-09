import { useEffect, useRef } from 'react';

export interface RiskNode {
  subject: string;
  value: number; // 0–100
}

function nodeColor(value: number, alpha = 1): string {
  let r = 34, g = 197, b = 94;
  if (value >= 80)      { r = 239; g = 68;  b = 68;  }
  else if (value >= 60) { r = 249; g = 115; b = 22;  }
  else if (value >= 30) { r = 234; g = 179; b = 8;   }
  return `rgba(${r},${g},${b},${alpha})`;
}

function fibonacciSphere(n: number): Array<[number, number, number]> {
  const pts: Array<[number, number, number]> = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const phi = i * golden;
    pts.push([r * Math.cos(phi), y, r * Math.sin(phi)]);
  }
  return pts;
}

const CANVAS_W = 560;
const CANVAS_H = 480;

export default function RiskGraph3D({ nodes }: { nodes: RiskNode[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const rotYRef   = useRef<number>(0);
  const rotXRef   = useRef<number>(0.3);
  const nodesRef  = useRef<RiskNode[]>(nodes);
  const dragRef   = useRef<{ active: boolean; lx: number; ly: number }>({ active: false, lx: 0, ly: 0 });

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const W = CANVAS_W, H = CANVAS_H;
    const cx = W / 2, cy = H / 2;
    const FOV = 340;
    // R=220: worst-case screen edge = cx + R + nr_max*glowMult
    //   = 280 + 220 + 20*2 = 540 < 560  (X axis safe)
    // Y bottom = cy + R*0.72 + nr_max + labelOffset
    //   = 240 + 158 + 20 + 34 = 452 < 480 (Y axis safe)
    const R   = 220;

    // Fixed sphere positions (for 5 nodes)
    const basePts = fibonacciSphere(5).map(
      ([x, y, z]) => [x * R, y * R * 0.72, z * R] as [number, number, number]
    );

    function project(bx: number, by: number, bz: number) {
      const ry = rotYRef.current, rx = rotXRef.current;
      const x1 =  bx * Math.cos(ry) - bz * Math.sin(ry);
      const z1 =  bx * Math.sin(ry) + bz * Math.cos(ry);
      const y2 =  by * Math.cos(rx) - z1 * Math.sin(rx);
      const z2 =  by * Math.sin(rx) + z1 * Math.cos(rx);
      const s  = FOV / (FOV + z2 + R);
      return { sx: cx + x1 * s, sy: cy + y2 * s, depth: z2, s };
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      if (!dragRef.current.active) rotYRef.current += 0.007;

      const ns = nodesRef.current;
      const items = basePts.slice(0, ns.length).map((pos, i) => ({
        ...project(pos[0], pos[1], pos[2]),
        label: ns[i]!.subject,
        value: ns[i]!.value,
      }));
      const center = project(0, 0, 0);

      // Reference rings — scaled to sphere radius, clipped to canvas center
      for (const frac of [0.33, 0.66, 1.0]) {
        ctx.beginPath();
        ctx.arc(center.sx, center.sy, R * frac * 0.78, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(55,65,81,${0.55 - frac * 0.15})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Sort back→front
      const sorted = [...items].sort((a, b) => b.depth - a.depth);

      // Links
      sorted.forEach(p => {
        const alpha = Math.max(0.1, 0.08 + 0.4 * p.s);
        const grad = ctx.createLinearGradient(center.sx, center.sy, p.sx, p.sy);
        grad.addColorStop(0, 'rgba(107,114,128,0.2)');
        grad.addColorStop(1, nodeColor(p.value, alpha * 2.2));
        ctx.beginPath();
        ctx.moveTo(center.sx, center.sy);
        ctx.lineTo(p.sx, p.sy);
        ctx.strokeStyle = grad;
        ctx.lineWidth = Math.max(0.8, 2.5 * p.s);
        ctx.stroke();
      });

      // Center node
      {
        const gr = ctx.createRadialGradient(center.sx, center.sy, 0, center.sx, center.sy, 28);
        gr.addColorStop(0, 'rgba(156,163,175,0.5)');
        gr.addColorStop(1, 'rgba(75,85,99,0)');
        ctx.beginPath();
        ctx.arc(center.sx, center.sy, 28, 0, Math.PI * 2);
        ctx.fillStyle = gr;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(center.sx, center.sy, 11, 0, Math.PI * 2);
        ctx.fillStyle = '#6b7280';
        ctx.fill();
        ctx.strokeStyle = 'rgba(156,163,175,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = 'rgba(156,163,175,0.75)';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PORTFOLIO', center.sx, center.sy + 34);
      }

      // Risk nodes (sorted back→front)
      sorted.forEach(p => {
        const alpha = Math.max(0.25, Math.min(1, 0.35 + 0.65 * p.s));
        // nr_max at value=100, s=1 → (6+14)*1 = 20; glow = 20*2 = 40
        const nr = Math.max(6, (6 + p.value * 0.14) * Math.max(0.55, p.s));
        const glowR = nr * 2.0;

        // Glow
        const grd = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, glowR);
        grd.addColorStop(0, nodeColor(p.value, alpha * 0.55));
        grd.addColorStop(1, nodeColor(p.value, 0));
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, glowR, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Body
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, nr, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor(p.value, alpha);
        ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.35})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label + value
        const fs = Math.round(Math.max(12, Math.min(16, 12 + p.s * 4)));
        ctx.fillStyle = `rgba(209,213,219,${alpha})`;
        ctx.font = `${fs}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(p.label, p.sx, p.sy + nr + 18);
        ctx.fillStyle = nodeColor(p.value, alpha);
        ctx.font = `bold ${fs}px monospace`;
        ctx.fillText(`${Math.round(p.value)}%`, p.sx, p.sy + nr + 34);
      });

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { active: true, lx: e.clientX, ly: e.clientY };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.active) return;
    rotYRef.current += (e.clientX - dragRef.current.lx) * 0.013;
    rotXRef.current += (e.clientY - dragRef.current.ly) * 0.013;
    dragRef.current.lx = e.clientX;
    dragRef.current.ly = e.clientY;
  };
  const onMouseUp = () => { dragRef.current.active = false; };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ width: '100%', aspectRatio: `${CANVAS_W} / ${CANVAS_H}`, cursor: 'grab', display: 'block' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    />
  );
}
