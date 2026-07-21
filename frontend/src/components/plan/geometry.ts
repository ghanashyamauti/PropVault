import type { PlanElement, SiteLayout } from "@/data/types";

/** Convert meters → viewport user units. We render 1m = 4px in the SVG. */
export const M = 4;

export function elementBBox(el: PlanElement): { x: number; y: number; w: number; h: number } {
  if (el.type === "plot" || el.type === "garden" || el.type === "parking") {
    return { x: el.x, y: el.y, w: el.w, h: el.h };
  }
  if (el.type === "road") {
    const xs = el.points.map((p) => p.x);
    const ys = el.points.map((p) => p.y);
    const half = el.width / 2 + 1;
    return {
      x: Math.min(...xs) - half,
      y: Math.min(...ys) - half,
      w: Math.max(...xs) - Math.min(...xs) + half * 2,
      h: Math.max(...ys) - Math.min(...ys) + half * 2,
    };
  }
  if (el.type === "text") {
    const s = el.size ?? 3;
    return { x: el.x - s * 4, y: el.y - s / 2, w: s * 8, h: s };
  }
  // point elements: tree/gate/dp_box/water_tank/clubhouse
  return { x: el.x - 2, y: el.y - 2, w: 4, h: 4 };
}

export function roadPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) {
    if (points.length === 1) return `M${points[0].x * M},${points[0].y * M}`;
    return "";
  }
  // Catmull-Rom to Bezier for smooth curve
  const pts = points.map((p) => ({ x: p.x * M, y: p.y * M }));
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export function newElement(type: PlanElement["type"], x: number, y: number, seq: number): PlanElement {
  const id = `el-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-3)}`;
  switch (type) {
    case "plot":
      return {
        id,
        type: "plot",
        plot_number: `P-${seq.toString().padStart(2, "0")}`,
        x,
        y,
        w: 12,
        h: 15,
      };
    case "road":
      return {
        id,
        type: "road",
        name: `Road ${seq}`,
        width: 6,
        points: [
          { x, y },
          { x: x + 40, y: y + 2 },
        ],
      };
    case "garden":
      return { id, type: "garden", x, y, w: 20, h: 15 };
    case "parking":
      return { id, type: "parking", x, y, w: 20, h: 12 };
    case "tree":
      return { id, type: "tree", x, y };
    case "gate":
      return { id, type: "gate", x, y, label: "Gate" };
    case "water_tank":
      return { id, type: "water_tank", x, y, label: "Water Tank" };
    case "clubhouse":
      return { id, type: "clubhouse", x, y, label: "Clubhouse" };
    case "dp_box":
      return { id, type: "dp_box", x, y };
    case "text":
      return { id, type: "text", x, y, text: "Label", size: 3 };
  }
}

export function sampleLayout(bounds: { w: number; h: number }): SiteLayout {
  const els: PlanElement[] = [];
  const uid = () => `el-${Math.random().toString(36).slice(2, 8)}`;
  els.push({
    id: uid(),
    type: "road",
    name: "Main Road",
    width: 8,
    points: [
      { x: 10, y: bounds.h / 2 - 5 },
      { x: bounds.w / 2, y: bounds.h / 2 },
      { x: bounds.w - 10, y: bounds.h / 2 - 3 },
    ],
  });
  for (let i = 0; i < 6; i++) {
    els.push({
      id: uid(),
      type: "plot",
      plot_number: `P-${(i + 1).toString().padStart(2, "0")}`,
      x: 20 + i * 15,
      y: bounds.h / 2 - 25,
      w: 12,
      h: 15,
    });
  }
  els.push({ id: uid(), type: "gate", x: 10, y: bounds.h / 2 - 5, label: "Gate" });
  els.push({ id: uid(), type: "garden", x: 25, y: bounds.h / 2 + 15, w: 25, h: 20 });
  return { version: 1, bounds, elements: els };
}
