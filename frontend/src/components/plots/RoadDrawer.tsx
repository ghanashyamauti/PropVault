import { useApp } from "@/data/store";
import { Button } from "@/components/ui/button";

function calculateRoadLength(points: Array<{ x: number; y: number }>): number {
  let length = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    length += Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }
  return Math.round(length * 10) / 10;
}

export function RoadDrawer({ roadId, siteId, onClose }: { roadId: string; siteId: string; onClose: () => void }) {
  const state = useApp();
  const site = state.sites.find((s) => s.id === siteId);
  const road = site?.layout?.elements?.find((el) => el.id === roadId && el.type === "road");

  if (!road || !site) return <div className="p-6">Road not found.</div>;

  const length = calculateRoadLength(road.points);

  return (
    <div>
      {/* Header */}
      <div className="p-6 border-b border-border bg-slate text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-white/60">
              Road details · {site.name}
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-white">
              {road.name || "Unnamed Road"}
            </h2>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/70">
              <span>Width: {road.width}m</span>
              <span>·</span>
              <span>Length: {length}m</span>
              <span>·</span>
              <span>Points: {road.points.length}</span>
            </div>
          </div>
          <div className="h-8 w-8 rounded-full bg-white/10 grid place-items-center text-sm">
            🛣️
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Specifications
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-white p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Width</p>
              <p className="mt-1 text-2xl font-display font-semibold tabular">{road.width} meters</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Length</p>
              <p className="mt-1 text-2xl font-display font-semibold tabular">{length} meters</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Coordinates (Control Points)
          </h3>
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-semibold">Point</th>
                  <th className="px-4 py-2 font-semibold">X (m)</th>
                  <th className="px-4 py-2 font-semibold">Y (m)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {road.points.map((p, i) => (
                  <tr key={i} className="hover:bg-surface/50">
                    <td className="px-4 py-2 font-medium">#{i + 1}</td>
                    <td className="px-4 py-2 font-mono tabular">{p.x.toFixed(1)}</td>
                    <td className="px-4 py-2 font-mono tabular">{p.y.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-border flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Close Details
        </Button>
      </div>
    </div>
  );
}
