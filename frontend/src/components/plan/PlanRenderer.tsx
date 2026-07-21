import { useMemo, useRef, useState, useEffect } from "react";
import type { PlanElement, Plot, SiteLayout, PlotStatus } from "@/data/types";
import { M, elementBBox, roadPath } from "./geometry";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Trees,
  DoorOpen,
  Droplets,
  Building,
  ParkingSquare,
  Zap,
} from "lucide-react";

function distToSegment(p: { x: number; y: number }, v: { x: number; y: number }, w: { x: number; y: number }) {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

function calculateRoadLength(points: Array<{ x: number; y: number }>): number {
  let length = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    length += Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }
  return Math.round(length * 10) / 10;
}

function getRoadCenter(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return { x: 0, y: 0 };
  let sx = 0, sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / points.length, y: sy / points.length };
}

function RoadLabel({ points, width }: { points: Array<{ x: number; y: number }>; width: number }) {
  const len = calculateRoadLength(points);
  const center = getRoadCenter(points);
  const text = `W: ${width}m · L: ${len}m`;
  const charWidth = 6.2;
  const boxW = text.length * charWidth + 12;
  const boxH = 16;
  
  return (
    <g transform={`translate(${center.x * M} ${center.y * M})`} pointerEvents="none">
      <rect
        x={-boxW / 2}
        y={-boxH / 2}
        width={boxW}
        height={boxH}
        rx={4}
        fill="#1e293b"
        opacity={0.9}
        stroke="#e2e8f0"
        strokeWidth={1}
      />
      <text
        x={0}
        y={1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#ffffff"
        fontSize={8}
        fontWeight="bold"
        fontFamily="Inter, sans-serif"
      >
        {text}
      </text>
    </g>
  );
}

interface Props {
  layout: SiteLayout;
  plots?: Plot[];
  interactive: boolean;
  selectedId?: string | null;
  filterStatuses?: PlotStatus[]; // if set, only these are highlighted
  onSelect?: (id: string | null) => void;
  onOpenPlot?: (plotId: string) => void;
  onOpenRoad?: (roadId: string) => void;
  onChange?: (updater: (l: SiteLayout) => SiteLayout) => void;
  activeTool?: string | null;
  gridSnap?: boolean;
}

interface Viewport {
  scale: number;
  tx: number; // pan translate x
  ty: number;
}

const statusFill: Record<PlotStatus, string> = {
  AVAILABLE: "#ffffff",
  INQUIRY: "#fef3c7",
  BOOKED: "#dbeafe",
  SOLD: "#fde68a",
};
const statusStroke: Record<PlotStatus, string> = {
  AVAILABLE: "#94a3b8",
  INQUIRY: "#d97706",
  BOOKED: "#1d4ed8",
  SOLD: "#92400e",
};

export function PlanRenderer({
  layout,
  plots = [],
  interactive,
  selectedId,
  filterStatuses,
  onSelect,
  onOpenPlot,
  onOpenRoad,
  onChange,
  activeTool,
  gridSnap = true,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [vp, setVp] = useState<Viewport>({ scale: 1, tx: 0, ty: 0 });
  const [drawing, setDrawing] = useState<null | { startX: number; startY: number; el: PlanElement }>(null);
  const [dragging, setDragging] = useState<null | {
    kind: "move" | "resize" | "roadPoint" | "rotate";
    id: string;
    handle?: string;
    startX: number;
    startY: number;
    orig: PlanElement;
  }>(null);
  const [canvasDragging, setCanvasDragging] = useState<null | {
    handle: "e" | "s" | "se";
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  }>(null);

  const bounds = layout.bounds;
  const viewW = bounds.w * M;
  const viewH = bounds.h * M;

  // Fit once
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const s = Math.min(rect.width / viewW, rect.height / viewH) * 0.9;
    setVp({ scale: s, tx: (rect.width - viewW * s) / 2, ty: (rect.height - viewH * s) / 2 });
  }, [viewW, viewH]);

  const toWorld = (clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left - vp.tx) / vp.scale / M;
    const y = (clientY - rect.top - vp.ty) / vp.scale / M;
    return {
      x: gridSnap ? Math.round(x * 2) / 2 : x,
      y: gridSnap ? Math.round(y * 2) / 2 : y,
    };
  };

  // Wheel zoom at cursor (registered natively with { passive: false } to lock scroll zoom)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      
      setVp((prev) => {
        const newScale = Math.max(0.2, Math.min(5, prev.scale * factor));
        const wx = (mx - prev.tx) / prev.scale;
        const wy = (my - prev.ty) / prev.scale;
        return {
          scale: newScale,
          tx: mx - wx * newScale,
          ty: my - wy * newScale,
        };
      });
    };

    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      svg.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // Fit / center helpers exposed via key press
  const fit = () => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const s = Math.min(rect.width / viewW, rect.height / viewH) * 0.9;
    setVp({ scale: s, tx: (rect.width - viewW * s) / 2, ty: (rect.height - viewH * s) / 2 });
  };

  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ mx: number; my: number; tx: number; ty: number } | null>(null);

  const onMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    // Panning when clicking background & no tool
    if (target.dataset.role === "background" && (!interactive || !activeTool)) {
      setIsPanning(true);
      panStart.current = { mx: e.clientX, my: e.clientY, tx: vp.tx, ty: vp.ty };
      onSelect?.(null);
      return;
    }
    if (!interactive) return;
    // Start draw on background with tool
    if (activeTool && target.dataset.role === "background") {
      const { x, y } = toWorld(e.clientX, e.clientY);
      const seq = layout.elements.filter((el) => el.type === "road" || el.type === activeTool).length + 1;
      
      if (activeTool === "draw_road") {
        const el: PlanElement = {
          id: `el-${Math.random().toString(36).slice(2, 8)}`,
          type: "road",
          name: `Road ${seq}`,
          width: 6,
          points: [{ x, y }],
        };
        setDrawing({ startX: x, startY: y, el });
      } else {
        const el = createElement(activeTool as PlanElement["type"], x, y, seq);
        if (el.type === "plot" || el.type === "garden" || el.type === "parking") {
          setDrawing({ startX: x, startY: y, el: { ...el, w: 0.5, h: 0.5 } });
        } else if (el.type === "road") {
          setDrawing({ startX: x, startY: y, el });
        } else {
          // point drop
          onChange?.((l) => ({ ...l, elements: [...l.elements, el] }));
          onSelect?.(el.id);
        }
      }
    }
  };

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (canvasDragging) {
      const dx = (e.clientX - canvasDragging.startX) / (vp.scale * M);
      const dy = (e.clientY - canvasDragging.startY) / (vp.scale * M);

      let nextW = canvasDragging.origW;
      let nextH = canvasDragging.origH;

      if (canvasDragging.handle.includes("e")) {
        nextW = Math.max(50, Math.round(canvasDragging.origW + dx));
      }
      if (canvasDragging.handle.includes("s")) {
        nextH = Math.max(50, Math.round(canvasDragging.origH + dy));
      }

      onChange?.((l) => ({
        ...l,
        bounds: { w: nextW, h: nextH },
      }));
      return;
    }

    if (isPanning && panStart.current) {
      setVp({
        ...vp,
        tx: panStart.current.tx + (e.clientX - panStart.current.mx),
        ty: panStart.current.ty + (e.clientY - panStart.current.my),
      });
      return;
    }
    if (drawing) {
      const { x, y } = toWorld(e.clientX, e.clientY);
      if (drawing.el.type === "plot" || drawing.el.type === "garden" || drawing.el.type === "parking") {
        const w = Math.max(1, x - drawing.startX);
        const h = Math.max(1, y - drawing.startY);
        setDrawing({ ...drawing, el: { ...drawing.el, w, h } });
      } else if (drawing.el.type === "road") {
        if (activeTool === "draw_road") {
          const pts = [...drawing.el.points];
          const lastPt = pts[pts.length - 1];
          const dist = Math.hypot(x - lastPt.x, y - lastPt.y);
          if (dist >= 1.5) {
            setDrawing({
              ...drawing,
              el: {
                ...drawing.el,
                points: [...pts, { x, y }],
              },
            });
          } else {
            if (pts.length > 1) {
              const nextPts = [...pts];
              nextPts[nextPts.length - 1] = { x, y };
              setDrawing({
                ...drawing,
                el: {
                  ...drawing.el,
                  points: nextPts,
                },
              });
            } else {
              setDrawing({
                ...drawing,
                el: {
                  ...drawing.el,
                  points: [{ x: drawing.startX, y: drawing.startY }, { x, y }],
                },
              });
            }
          }
        } else {
          setDrawing({
            ...drawing,
            el: {
              ...drawing.el,
              points: [{ x: drawing.startX, y: drawing.startY }, { x, y }],
            },
          });
        }
      }
      return;
    }
    if (dragging) {
      const { x, y } = toWorld(e.clientX, e.clientY);
      const dx = x - dragging.startX;
      const dy = y - dragging.startY;
      if (dragging.kind === "rotate") {
        const orig = dragging.orig;
        const ecx = orig.x;
        const ecy = orig.y;
        const angleRad = Math.atan2(x - ecx, -(y - ecy));
        let angleDeg = Math.round((angleRad * 180) / Math.PI);
        if (angleDeg < 0) angleDeg += 360;
        onChange?.((l) => ({
          ...l,
          elements: l.elements.map((elItem) =>
            elItem.id === dragging.id ? { ...elItem, rotation: angleDeg } : elItem
          ),
        }));
        return;
      }
      onChange?.((l) => ({
        ...l,
        elements: l.elements.map((el) => {
          if (el.id !== dragging.id) return el;
          if (dragging.kind === "move") {
            if (el.type === "road") {
              const origPts = (dragging.orig as any).points as Array<{ x: number; y: number }>;
              return { ...el, points: origPts.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
            }
            return { ...el, x: (dragging.orig as any).x + dx, y: (dragging.orig as any).y + dy };
          }
          if (dragging.kind === "resize" && (el.type === "plot" || el.type === "garden" || el.type === "parking")) {
            const orig = dragging.orig as typeof el;
            const h = dragging.handle!;
            let nx = orig.x, ny = orig.y, nw = orig.w, nh = orig.h;
            if (h.includes("e")) nw = Math.max(1, orig.w + dx);
            if (h.includes("s")) nh = Math.max(1, orig.h + dy);
            if (h.includes("w")) {
              nx = orig.x + dx;
              nw = Math.max(1, orig.w - dx);
            }
            if (h.includes("n")) {
              ny = orig.y + dy;
              nh = Math.max(1, orig.h - dy);
            }
            return { ...el, x: nx, y: ny, w: nw, h: nh };
          }
          if (dragging.kind === "roadPoint" && el.type === "road") {
            const idx = Number(dragging.handle);
            const orig = dragging.orig as typeof el;
            const nextPts = orig.points.map((p, i) =>
              i === idx ? { x: p.x + dx, y: p.y + dy } : p,
            );
            return { ...el, points: nextPts };
          }
          return el;
        }),
      }));
    }
  };

  const onMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (canvasDragging) {
      setCanvasDragging(null);
      return;
    }
    if (isPanning) {
      setIsPanning(false);
      panStart.current = null;
      return;
    }
    if (drawing) {
      const el = drawing.el;
      // Only commit if some size
      if (el.type === "plot" || el.type === "garden" || el.type === "parking") {
        if (el.w >= 1 && el.h >= 1) {
          onChange?.((l) => ({ ...l, elements: [...l.elements, el] }));
          onSelect?.(el.id);
        }
      } else if (el.type === "road") {
        if (activeTool === "draw_road") {
          let cleanPts = el.points.filter((pt, idx, arr) => {
            if (idx === 0) return true;
            const prev = arr[idx - 1];
            return Math.hypot(pt.x - prev.x, pt.y - prev.y) > 0.5;
          });
          if (cleanPts.length < 2 && el.points.length >= 2) {
            cleanPts = el.points;
          }
          if (cleanPts.length >= 2) {
            const finalEl = { ...el, points: cleanPts };
            onChange?.((l) => ({ ...l, elements: [...l.elements, finalEl] }));
            onSelect?.(finalEl.id);
          }
        } else {
          onChange?.((l) => ({ ...l, elements: [...l.elements, el] }));
          onSelect?.(el.id);
        }
      }
      setDrawing(null);
      return;
    }
    if (dragging) {
      setDragging(null);
    }
  };

  // Selection & drag start on an element
  const beginDrag = (
    ev: React.MouseEvent,
    id: string,
    kind: "move" | "resize" | "roadPoint" | "rotate",
    handle?: string,
  ) => {
    if (!interactive) return;
    ev.stopPropagation();
    const orig = layout.elements.find((e) => e.id === id);
    if (!orig) return;
    const { x, y } = toWorld(ev.clientX, ev.clientY);
    setDragging({ kind, id, handle, startX: x, startY: y, orig: JSON.parse(JSON.stringify(orig)) });
    onSelect?.(id);
  };

  // Plot rendering with status coloring
  const plotById = useMemo(() => {
    const m = new Map<string, Plot>();
    for (const p of plots) m.set(p.id, p);
    return m;
  }, [plots]);

  return (
    <svg
      ref={svgRef}
      className={cn("w-full h-full bg-parchment select-none", interactive && activeTool && "cursor-crosshair", isPanning && "cursor-grabbing")}
      style={{ touchAction: "none" }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (!t) return;
        onMouseDown({
          clientX: t.clientX, clientY: t.clientY, button: 0,
          currentTarget: e.currentTarget, target: e.target, preventDefault: () => e.preventDefault(),
        } as unknown as React.MouseEvent<SVGSVGElement>);
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (!t) return;
        onMouseMove({
          clientX: t.clientX, clientY: t.clientY,
          currentTarget: e.currentTarget, target: e.target,
        } as unknown as React.MouseEvent<SVGSVGElement>);
      }}
      onTouchEnd={(e) => onMouseUp(e as unknown as React.MouseEvent<SVGSVGElement>)}
    >

      <defs>
        <pattern id="grid" width={M * 5} height={M * 5} patternUnits="userSpaceOnUse">
          <path d={`M ${M * 5} 0 L 0 0 0 ${M * 5}`} fill="none" stroke="#3b2f1f" strokeOpacity="0.06" />
        </pattern>
        <radialGradient id="treeCanopy" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="55%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#14532d" />
        </radialGradient>
        <radialGradient id="treeCanopy2" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#bef264" />
          <stop offset="55%" stopColor="#65a30d" />
          <stop offset="100%" stopColor="#365314" />
        </radialGradient>
        <linearGradient id="plotFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f1e9d2" />
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" />
          <feOffset dx="0.5" dy="1" result="off" />
          <feComponentTransfer><feFuncA type="linear" slope="0.35" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="lightGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g transform={`translate(${vp.tx} ${vp.ty}) scale(${vp.scale})`}>
        {/* Background */}
        <rect data-role="background" x={0} y={0} width={viewW} height={viewH} fill="#f5efe0" />
        <rect data-role="background" x={0} y={0} width={viewW} height={viewH} fill="url(#grid)" />

        {/* Compound wall - double amber outline */}
        <rect
          data-role="background"
          x={M}
          y={M}
          width={viewW - M * 2}
          height={viewH - M * 2}
          fill="none"
          stroke="#92400e"
          strokeWidth={3}
        />
        <rect
          data-role="background"
          x={M * 2.5}
          y={M * 2.5}
          width={viewW - M * 5}
          height={viewH - M * 5}
          fill="none"
          stroke="#92400e"
          strokeWidth={1}
          strokeOpacity={0.5}
        />

        {interactive && (
          <>
            {/* East Handle */}
            <rect
              x={viewW - 4}
              y={viewH / 2 - 8}
              width={8}
              height={16}
              fill="#92400e"
              stroke="white"
              strokeWidth={1.5}
              rx={1}
              className="cursor-ew-resize select-none"
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCanvasDragging({
                  handle: "e",
                  startX: e.clientX,
                  startY: e.clientY,
                  origW: bounds.w,
                  origH: bounds.h,
                });
              }}
            />
            {/* South Handle */}
            <rect
              x={viewW / 2 - 8}
              y={viewH - 4}
              width={16}
              height={8}
              fill="#92400e"
              stroke="white"
              strokeWidth={1.5}
              rx={1}
              className="cursor-ns-resize select-none"
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCanvasDragging({
                  handle: "s",
                  startX: e.clientX,
                  startY: e.clientY,
                  origW: bounds.w,
                  origH: bounds.h,
                });
              }}
            />
            {/* South-East Handle */}
            <rect
              x={viewW - 6}
              y={viewH - 6}
              width={12}
              height={12}
              fill="#92400e"
              stroke="white"
              strokeWidth={1.5}
              rx={1.5}
              className="cursor-nwse-resize select-none"
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCanvasDragging({
                  handle: "se",
                  startX: e.clientX,
                  startY: e.clientY,
                  origW: bounds.w,
                  origH: bounds.h,
                });
              }}
            />
          </>
        )}

        {/* Elements */}
        {layout.elements.map((el) =>
          renderElement(el, {
            selected: selectedId === el.id,
            plot: el.type === "plot" && el.plot_id ? plotById.get(el.plot_id) : undefined,
            filterStatuses,
            interactive,
            beginDrag,
            onOpenPlot,
            onOpenRoad,
            toWorld,
            onChange,
          }),
        )}

        {/* Ghost while drawing */}
        {drawing && (
          <g pointerEvents="none">
            {renderElement(drawing.el, { selected: false, plot: undefined, filterStatuses, interactive: false, beginDrag: () => {}, toWorld, onChange, onOpenRoad })}
          </g>
        )}

        {/* Floating Road Details Overlay on Draw */}
        {drawing && drawing.el.type === "road" && (
          <RoadLabel points={drawing.el.points} width={drawing.el.width} />
        )}

        {/* Floating Road Details Overlay on Select */}
        {selectedId && (() => {
          const el = layout.elements.find((e) => e.id === selectedId);
          if (el && el.type === "road") {
            return <RoadLabel points={el.points} width={el.width} />;
          }
          return null;
        })()}

        {/* North compass */}
        <g transform={`translate(${viewW - 40} 40)`}>
          <circle r={16} fill="white" stroke="#3b2f1f" strokeOpacity={0.4} />
          <text textAnchor="middle" y={-5} fontSize={9} fill="#3b2f1f" className="uppercase">
            N
          </text>
          <polygon points="0,-12 3,4 0,0 -3,4" fill="#92400e" />
        </g>
      </g>
    </svg>
  );
}

// Element rendering ---------------------------------------------------------
function renderElement(
  el: PlanElement,
  ctx: {
    selected: boolean;
    plot: Plot | undefined;
    filterStatuses?: PlotStatus[];
    interactive: boolean;
    beginDrag: (
      ev: React.MouseEvent,
      id: string,
      kind: "move" | "resize" | "roadPoint",
      handle?: string,
    ) => void;
    onOpenPlot?: (plotId: string) => void;
    onOpenRoad?: (roadId: string) => void;
    toWorld: (clientX: number, clientY: number) => { x: number; y: number };
    onChange?: (updater: (l: SiteLayout) => SiteLayout) => void;
  },
) {
  const { selected, plot, filterStatuses, interactive, beginDrag, onOpenPlot, onOpenRoad, toWorld, onChange } = ctx;
  const dim =
    filterStatuses && plot && !filterStatuses.includes(plot.status) ? 0.2 : 1;

  if (el.type === "plot") {
    const status: PlotStatus = plot?.status ?? "AVAILABLE";
    const useGradient = status === "AVAILABLE";
    const fill = useGradient ? "url(#plotFill)" : statusFill[status];
    const stroke = selected ? "#92400e" : statusStroke[status];
    const strokeW = selected ? 2 : 1;
    const shape = el.shape ?? "rect";
    const rot = el.rotation ?? 0;
    const cx = (el.x + el.w / 2) * M;
    const cy = (el.y + el.h / 2) * M;
    const x = el.x * M;
    const y = el.y * M;
    const w = el.w * M;
    const h = el.h * M;
    const r = Math.min(w, h) / 2;
    const commonProps = {
      fill,
      stroke,
      strokeWidth: strokeW,
      filter: "url(#softShadow)",
      onMouseDown: (e: React.MouseEvent) => beginDrag(e, el.id, "move"),
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!interactive && plot?.id && onOpenPlot) onOpenPlot(plot.id);
      },
      onDoubleClick: () => {
        if (plot?.id && onOpenPlot) onOpenPlot(plot.id);
      },
      className: cn(interactive ? "cursor-move" : "cursor-pointer"),
    };
    let shapeNode: React.ReactNode;
    if (shape === "circle") {
      shapeNode = <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} {...commonProps} />;
    } else if (shape === "triangle") {
      const pts = `${cx},${y} ${x + w},${y + h} ${x},${y + h}`;
      shapeNode = <polygon points={pts} {...commonProps} />;
    } else if (shape === "hex") {
      const pts = [
        [x + w * 0.25, y],
        [x + w * 0.75, y],
        [x + w, y + h / 2],
        [x + w * 0.75, y + h],
        [x + w * 0.25, y + h],
        [x, y + h / 2],
      ]
        .map((p) => p.join(","))
        .join(" ");
      shapeNode = <polygon points={pts} {...commonProps} />;
    } else {
      const cr = Math.max(0, Math.min((el.cornerRadius ?? 0) * M, Math.min(w, h) / 2));
      shapeNode = <rect x={x} y={y} width={w} height={h} rx={cr} ry={cr} {...commonProps} />;
    }
    return (
      <g key={el.id} opacity={dim} transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined}>
        {shapeNode}
        {/* Corner tick marks — surveyor style (only for rect/hex) */}
        {(shape === "rect" || shape === "hex") &&
          [
            [el.x, el.y],
            [el.x + el.w, el.y],
            [el.x, el.y + el.h],
            [el.x + el.w, el.y + el.h],
          ].map(([tx, ty], i) => (
            <circle key={i} cx={tx * M} cy={ty * M} r={1.5} fill={statusStroke[status]} pointerEvents="none" />
          ))}
        <text
          x={cx}
          y={cy - Math.min(el.w, el.h) * M * 0.05}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={Math.min(el.w, el.h) * M * 0.18}
          fill="#3b2f1f"
          pointerEvents="none"
          className="font-semibold"
        >
          {el.plot_number}
        </text>
        {plot && (
          <text
            x={cx}
            y={cy + Math.min(el.w, el.h) * M * 0.18}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={Math.min(el.w, el.h) * M * 0.11}
            fill="#6b5b47"
            pointerEvents="none"
          >
            {plot.area}
          </text>
        )}
        {selected && interactive && (
          <>
            {(["nw", "ne", "se", "sw"] as const).map((hh) => {
              const hx = (hh.includes("w") ? el.x : el.x + el.w) * M;
              const hy = (hh.includes("n") ? el.y : el.y + el.h) * M;
              return (
                <rect
                  key={hh}
                  x={hx - 4}
                  y={hy - 4}
                  width={8}
                  height={8}
                  fill="#92400e"
                  stroke="white"
                  strokeWidth={1.5}
                  onMouseDown={(e) => beginDrag(e, el.id, "resize", hh)}
                  className="cursor-nwse-resize"
                />
              );
            })}
          </>
        )}
      </g>
    );
  }

  if (el.type === "road") {
    const path = roadPath(el.points);
    return (
      <g key={el.id}>
        <path
          d={path}
          fill="none"
          stroke="#a8a29e"
          strokeWidth={el.width * M}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.9}
          onMouseDown={(e) => beginDrag(e, el.id, "move")}
          onDoubleClick={(e) => {
            if (!interactive) {
              if (onOpenRoad) onOpenRoad(el.id);
              return;
            }
            e.stopPropagation();
            const { x, y } = toWorld(e.clientX, e.clientY);
            onChange?.((l) => ({
              ...l,
              elements: l.elements.map((elItem) => {
                if (elItem.id !== el.id || elItem.type !== "road") return elItem;
                const pts = elItem.points;
                let minD = Infinity;
                let insertIdx = pts.length;
                for (let i = 0; i < pts.length - 1; i++) {
                  const p1 = pts[i];
                  const p2 = pts[i + 1];
                  const dist = distToSegment({ x, y }, p1, p2);
                  if (dist < minD) {
                    minD = dist;
                    insertIdx = i + 1;
                  }
                }
                const nextPts = [...pts];
                nextPts.splice(insertIdx, 0, { x, y });
                return { ...elItem, points: nextPts };
              }),
            }));
            toast.success("Added road control point");
          }}
          onClick={(e) => {
            if (!interactive && onOpenRoad) {
              e.stopPropagation();
              onOpenRoad(el.id);
            }
          }}
          className={cn(interactive ? "cursor-move" : "cursor-pointer")}
        />
        <path
          d={path}
          fill="none"
          stroke="white"
          strokeWidth={1}
          strokeDasharray="6 5"
          strokeLinecap="round"
          pointerEvents="none"
        />
        {selected && interactive && el.points.map((p, i) => (
          <circle
            key={i}
            cx={p.x * M}
            cy={p.y * M}
            r={6}
            fill="#92400e"
            stroke="white"
            strokeWidth={2}
            onMouseDown={(e) => beginDrag(e, el.id, "roadPoint", String(i))}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (el.points.length <= 2) {
                toast.error("A road must have at least 2 points");
                return;
              }
              onChange?.((l) => ({
                ...l,
                elements: l.elements.map((elItem) => {
                  if (elItem.id !== el.id || elItem.type !== "road") return elItem;
                  return { ...elItem, points: elItem.points.filter((_, idx) => idx !== i) };
                }),
              }));
              toast.success("Deleted road control point");
            }}
            className="cursor-move"
          />
        ))}
      </g>
    );
  }

  if (el.type === "garden" || el.type === "parking") {
    const fill = el.type === "garden" ? "#bbf7d0" : "#e5e7eb";
    const stroke = el.type === "garden" ? "#15803d" : "#6b7280";
    return (
      <g key={el.id}>
        <rect
          x={el.x * M}
          y={el.y * M}
          width={el.w * M}
          height={el.h * M}
          fill={fill}
          fillOpacity={0.6}
          stroke={stroke}
          strokeWidth={selected ? 2 : 1}
          strokeDasharray={el.type === "parking" ? "4 3" : undefined}
          onMouseDown={(e) => beginDrag(e, el.id, "move")}
          className={cn(interactive && "cursor-move")}
        />
        <text
          x={(el.x + el.w / 2) * M}
          y={(el.y + el.h / 2) * M}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10}
          fill={stroke}
          pointerEvents="none"
          className="uppercase font-semibold"
        >
          {el.type}
        </text>
        {selected && interactive && (
          <>
            {(["nw", "ne", "se", "sw"] as const).map((h) => {
              const cx = (h.includes("w") ? el.x : el.x + el.w) * M;
              const cy = (h.includes("n") ? el.y : el.y + el.h) * M;
              return (
                <rect
                  key={h}
                  x={cx - 4}
                  y={cy - 4}
                  width={8}
                  height={8}
                  fill="#92400e"
                  stroke="white"
                  strokeWidth={1.5}
                  onMouseDown={(e) => beginDrag(e, el.id, "resize", h)}
                  className="cursor-nwse-resize"
                />
              );
            })}
          </>
        )}
      </g>
    );
  }

  if (el.type === "text") {
    return (
      <text
        key={el.id}
        x={el.x * M}
        y={el.y * M}
        textAnchor="middle"
        fontSize={(el.size ?? 3) * M}
        fill="#3b2f1f"
        fontFamily="Playfair Display, serif"
        fontStyle="italic"
        onMouseDown={(e) => beginDrag(e, el.id, "move")}
        className={cn(interactive && "cursor-move")}
      >
        {el.text}
      </text>
    );
  }

  // Realistic tree: layered canopy blobs + trunk + soft ground shadow
  if (el.type === "tree") {
    const cx = el.x * M;
    const cy = el.y * M;
    // Deterministic variety from id
    const seed = el.id.charCodeAt(el.id.length - 1) % 4;
    const grad = seed % 2 === 0 ? "url(#treeCanopy)" : "url(#treeCanopy2)";
    const r = 4 * M;
    return (
      <g
        key={el.id}
        onMouseDown={(e) => beginDrag(e, el.id, "move")}
        className={cn(interactive && "cursor-move")}
      >
        {/* ground shadow */}
        <ellipse cx={cx + r * 0.25} cy={cy + r * 0.85} rx={r * 0.9} ry={r * 0.28} fill="#000" opacity={0.18} />
        {/* trunk */}
        <rect x={cx - r * 0.09} y={cy - r * 0.05} width={r * 0.18} height={r * 0.55} fill="#7c4a1e" />
        {/* canopy — three overlapping blobs for depth */}
        <circle cx={cx - r * 0.35} cy={cy - r * 0.15} r={r * 0.55} fill={grad} />
        <circle cx={cx + r * 0.32} cy={cy - r * 0.05} r={r * 0.5} fill={grad} opacity={0.95} />
        <circle cx={cx} cy={cy - r * 0.55} r={r * 0.6} fill={grad} />
        <circle cx={cx - r * 0.15} cy={cy - r * 0.25} r={r * 0.42} fill={grad} opacity={0.9} />
        {/* highlight */}
        <circle cx={cx - r * 0.25} cy={cy - r * 0.55} r={r * 0.14} fill="#ecfccb" opacity={0.55} />
        {selected && (
          <circle cx={cx} cy={cy} r={r * 0.95} fill="none" stroke="#92400e" strokeDasharray="3 3" />
        )}
      </g>
    );
  }

  // Realistic light pole: pole, lamp head, yellow glow cone
  if (el.type === "light_pole") {
    const cx = el.x * M;
    const cy = el.y * M;
    const r = 5 * M;
    const isLightOn = "light_on" in el ? el.light_on : true;
    return (
      <g key={el.id}>
        {/* Rotated graphic elements */}
        <g
          transform={el.rotation ? `rotate(${el.rotation} ${cx} ${cy})` : undefined}
          onMouseDown={(e) => beginDrag(e, el.id, "move")}
          className={cn(interactive && "cursor-move", "outline-none select-none")}
          onClick={(e) => {
            e.stopPropagation();
            onChange?.((l) => ({
              ...l,
              elements: l.elements.map((elItem) =>
                elItem.id === el.id ? { ...elItem, light_on: !isLightOn } : elItem
              ),
            }));
            toast.success(isLightOn ? "Streetlight turned OFF" : "Streetlight turned ON");
          }}
        >
          {/* Larger invisible hit target at the base to make selection/dragging easy */}
          <circle
            cx={cx}
            cy={cy}
            r={3 * M}
            fill="transparent"
            className="cursor-move"
          />

          {/* soft shadow */}
          <ellipse cx={cx} cy={cy + 1.8 * M} rx={1.8 * M} ry={0.6 * M} fill="#000" opacity={0.15} pointerEvents="none" />
          
          {/* yellow glow cone */}
          {isLightOn && (
            <polygon
              points={`${cx},${cy - 2.2 * M} ${cx - 3.5 * M},${cy + 1.8 * M} ${cx + 3.5 * M},${cy + 1.8 * M}`}
              fill="url(#lightGlow)"
              pointerEvents="none"
            />
          )}

          {/* main vertical metallic pole */}
          <line
            x1={cx}
            y1={cy + 1.8 * M}
            x2={cx}
            y2={cy - 2.2 * M}
            stroke="#475569"
            strokeWidth={2.4}
            strokeLinecap="round"
          />

          {/* arm extension */}
          <path
            d={`M ${cx} ${cy - 2.2 * M} Q ${cx + 0.6 * M} ${cy - 2.8 * M} ${cx + 1.6 * M} ${cy - 2.6 * M}`}
            fill="none"
            stroke="#475569"
            strokeWidth={2.0}
            strokeLinecap="round"
          />

          {/* lamp head */}
          <ellipse
            cx={cx + 1.6 * M}
            cy={cy - 2.6 * M}
            rx={0.8 * M}
            ry={0.4 * M}
            fill="#334155"
          />

          {/* small bulb highlight */}
          <circle
            cx={cx + 1.6 * M}
            cy={cy - 2.4 * M}
            r={0.2 * M}
            fill={isLightOn ? "#fef08a" : "#64748b"}
          />

          {selected && (
            <circle cx={cx} cy={cy} r={r * 1.1} fill="none" stroke="#92400e" strokeDasharray="3 3" />
          )}
        </g>

        {/* Rotation Handle when Selected & Interactive */}
        {selected && interactive && (() => {
          const angleRad = ((el.rotation ?? 0) * Math.PI) / 180;
          const hx = cx + Math.sin(angleRad) * (4 * M);
          const hy = cy - Math.cos(angleRad) * (4 * M);
          return (
            <g>
              <line x1={cx} y1={cy} x2={hx} y2={hy} stroke="#92400e" strokeWidth={1} strokeDasharray="2 2" pointerEvents="none" />
              <circle
                cx={hx}
                cy={hy}
                r={5}
                fill="#92400e"
                stroke="white"
                strokeWidth={1.5}
                className="cursor-alias select-none"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  beginDrag(e, el.id, "rotate");
                }}
              />
            </g>
          );
        })()}

        {/* Label (outside rotated group to keep horizontal) */}
        {"label" in el && el.label && (
          <text
            x={cx}
            y={cy + 3.2 * M}
            textAnchor="middle"
            fontSize={8}
            fill="#3b2f1f"
            pointerEvents="none"
            className="uppercase font-semibold select-none"
          >
            {el.label}
          </text>
        )}
      </g>
    );
  }

  // Other icon elements
  const iconFor: Record<string, string> = {
    gate: "⛩",
    water_tank: "💧",
    clubhouse: "🏛",
    dp_box: "⚡",
    light_pole: "💡",
  };
  const size = 6 * M;
  return (
    <g
      key={el.id}
      onMouseDown={(e) => beginDrag(e, el.id, "move")}
      className={cn(interactive && "cursor-move")}
    >
      <circle
        cx={el.x * M}
        cy={el.y * M}
        r={size / 2}
        fill="white"
        stroke={selected ? "#92400e" : "#3b2f1f"}
        strokeWidth={selected ? 2 : 1}
        strokeOpacity={0.6}
      />
      <text
        x={el.x * M}
        y={el.y * M + 5}
        textAnchor="middle"
        fontSize={size * 0.6}
        pointerEvents="none"
      >
        {iconFor[el.type] ?? "•"}
      </text>
      {"label" in el && el.label && (
        <text
          x={el.x * M}
          y={(el.y + 5) * M}
          textAnchor="middle"
          fontSize={9}
          fill="#3b2f1f"
          pointerEvents="none"
          className="uppercase font-semibold"
        >
          {el.label}
        </text>
      )}
    </g>
  );
}

// re-export for the designer file
export function createElement(type: PlanElement["type"], x: number, y: number, seq: number) {
  // Local reimplement to avoid circular import for tree-shaking:
  const id = `el-${Math.random().toString(36).slice(2, 8)}`;
  if (type === "plot")
    return { id, type: "plot", plot_number: `P-${seq.toString().padStart(2, "0")}`, x, y, w: 12, h: 15 } as PlanElement;
  if (type === "road")
    return {
      id,
      type: "road",
      name: `Road ${seq}`,
      width: 6,
      points: [
        { x, y },
        { x: x + 20, y: y + 1 },
      ],
    } as PlanElement;
  if (type === "garden") return { id, type: "garden", x, y, w: 20, h: 15 } as PlanElement;
  if (type === "parking") return { id, type: "parking", x, y, w: 20, h: 12 } as PlanElement;
  if (type === "text") return { id, type: "text", x, y, text: "Label", size: 3 } as PlanElement;
  return { id, type, x, y, label: type.replace("_", " ") } as PlanElement;
}

// Suppress "declared but never used" for lucide imports (kept for extension)
void Trees;
void DoorOpen;
void Droplets;
void Building;
void ParkingSquare;
void Zap;
