import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/data/store";
import { orgScope } from "@/data/selectors";
import { PlanRenderer } from "@/components/plan/PlanRenderer";
import { sampleLayout } from "@/components/plan/geometry";
import type { PlanElement, PlotStatus, SiteLayout } from "@/data/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeft,
  Save,
  Undo2,
  Redo2,
  Trash2,
  Copy,
  Maximize,
  Download,
  Eye,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/sites/$id/designer")({
  head: () => ({ meta: [{ title: "Master-plan designer — PropVault" }] }),
  component: Designer,
});

const tools = [
  { id: "select", label: "Select", key: "V" },
  { id: "plot", label: "Plot", key: "P" },
  { id: "road", label: "Road", key: "R" },
  { id: "draw_road", label: "Draw Road", key: "D" },
  { id: "garden", label: "Garden", key: "G" },
  { id: "tree", label: "Tree", key: "T" },
  { id: "gate", label: "Gate", key: "" },
  { id: "water_tank", label: "Water Tank", key: "" },
  { id: "clubhouse", label: "Clubhouse", key: "" },
  { id: "parking", label: "Parking", key: "" },
  { id: "dp_box", label: "DP Box", key: "" },
  { id: "light_pole", label: "Light Pole", key: "L" },
  { id: "text", label: "Text Label", key: "" },
] as const;

const toolHints: Record<string, string> = {
  select: "Click any element to select. Drag to move. Handles to resize.",
  plot: "Click and drag to draw a plot. Auto-numbered.",
  road: "Click and drag for a road segment. Select it, then drag the round points to bend.",
  draw_road: "Click and drag to sketch/draw a winding road. Select it, then drag points to bend.",
  garden: "Draw a garden zone.",
  tree: "Click to place a tree.",
  gate: "Click to place a gate.",
  water_tank: "Click to place a water tank.",
  clubhouse: "Click to place the clubhouse.",
  parking: "Draw a parking area.",
  dp_box: "Click to place a DP box.",
  light_pole: "Click to place a light pole / streetlight.",
  text: "Click to place a text label. Edit in the inspector.",
};

function Designer() {
  const { id } = useParams({ from: "/app/sites/$id/designer" });
  const navigate = useNavigate();
  const site = useApp((s) => s.sites.find((x) => x.id === id));
  const plots = useApp((s) => orgScope(s.plots, s.session?.org_id).filter((p) => p.site_id === id));
  const saveLayout = useApp((s) => s.saveSiteLayout);
  const syncPlots = useApp((s) => s.syncPlanPlotsToCRM);

  const draftKey = `propvault.siteplan.${id}`;
  const [layout, setLayout] = useState<SiteLayout>(() => {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(draftKey);
      if (raw) {
        try {
          return JSON.parse(raw) as SiteLayout;
        } catch {}
      }
    }
    return site?.layout ?? { version: 1, bounds: { w: 220, h: 220 }, elements: [] };
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "view">("edit");
  const [statusFilters, setStatusFilters] = useState<PlotStatus[] | undefined>(undefined);

  // Undo/redo history
  const historyRef = useRef<SiteLayout[]>([layout]);
  const historyIdx = useRef(0);

  const commit = (updater: (l: SiteLayout) => SiteLayout) => {
    setLayout((prev) => {
      const next = updater(prev);
      historyRef.current = historyRef.current.slice(0, historyIdx.current + 1);
      historyRef.current.push(next);
      if (historyRef.current.length > 30) historyRef.current.shift();
      historyIdx.current = historyRef.current.length - 1;
      window.localStorage.setItem(draftKey, JSON.stringify(next));
      // Auto-sync any new plot shapes to CRM so they're immediately editable/clickable
      const hasUnsynced = next.elements.some(
        (el) => el.type === "plot" && !el.plot_id,
      );
      if (hasUnsynced) {
        // Persist layout first so syncPlanPlotsToCRM sees the latest elements
        queueMicrotask(() => {
          saveLayout(id, next);
          const added = syncPlots(id);
          if (added > 0) {
            const fresh = useApp.getState().sites.find((x) => x.id === id);
            if (fresh) setLayout(fresh.layout);
          }
        });
      }
      return next;
    });
  };


  const undo = () => {
    if (historyIdx.current > 0) {
      historyIdx.current -= 1;
      setLayout(historyRef.current[historyIdx.current]);
    }
  };
  const redo = () => {
    if (historyIdx.current < historyRef.current.length - 1) {
      historyIdx.current += 1;
      setLayout(historyRef.current[historyIdx.current]);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId && document.activeElement?.tagName !== "INPUT") {
          commit((l) => ({ ...l, elements: l.elements.filter((el) => el.id !== selectedId) }));
          setSelectedId(null);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (selectedId) {
          const el = layout.elements.find((x) => x.id === selectedId);
          if (el) {
            const clone = JSON.parse(JSON.stringify(el)) as PlanElement;
            clone.id = `el-${Math.random().toString(36).slice(2, 8)}`;
            if ("x" in clone) clone.x += 3;
            if ("y" in clone) clone.y += 3;
            if (clone.type === "road") {
              clone.points = clone.points.map((p) => ({ x: p.x + 3, y: p.y + 3 }));
            }
            commit((l) => ({ ...l, elements: [...l.elements, clone] }));
          }
        }
      }
      // Tool hotkeys
      const t = tools.find((tl) => tl.key && tl.key.toLowerCase() === e.key.toLowerCase());
      if (t && document.activeElement?.tagName !== "INPUT") {
        setActiveTool(t.id === "select" ? null : t.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, layout]);

  if (!site) {
    return (
      <div className="min-h-screen grid place-items-center bg-surface">
        <p>Site not found.</p>
      </div>
    );
  }

  const selected = layout.elements.find((el) => el.id === selectedId);

  const save = () => {
    saveLayout(id, layout);
    window.localStorage.removeItem(draftKey);
    toast.success("Master plan saved");
    navigate({ to: "/app/sites/$id", params: { id } });
  };

  const addSample = () => {
    if (layout.elements.length > 0 && !confirm("Replace current layout with sample?")) return;
    const s = sampleLayout(layout.bounds);
    commit(() => s);
  };

  const totalPlots = layout.elements.filter((e) => e.type === "plot").length;
  const totalValue = plots
    .filter((p) => layout.elements.some((e) => e.type === "plot" && e.plot_id === p.id))
    .reduce((sum, p) => sum + Number(p.price), 0);
  const totalCollected = useApp((s) =>
    s.transactions
      .filter(
        (t) =>
          t.direction === "IN" &&
          t.plot_id &&
          plots.some((p) => p.id === t.plot_id),
      )
      .reduce((sum, t) => sum + Number(t.amount), 0),
  );

  return (
    <div className="h-screen flex flex-col bg-surface">
      {/* Top bar */}
      <header className="h-14 shrink-0 border-b border-border bg-white flex items-center px-4 gap-3">
        <button
          onClick={() => navigate({ to: "/app/sites/$id", params: { id } })}
          className="p-2 rounded hover:bg-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Master-plan designer
          </p>
          <p className="text-sm font-semibold truncate">{site.name}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={undo}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={redo}>
            <Redo2 className="h-4 w-4" />
          </Button>
          <div className="h-6 w-px bg-border mx-1" />
          <Button
            size="sm"
            variant={mode === "edit" ? "default" : "ghost"}
            className={mode === "edit" ? "bg-slate hover:bg-slate/90" : ""}
            onClick={() => setMode("edit")}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button
            size="sm"
            variant={mode === "view" ? "default" : "ghost"}
            className={mode === "view" ? "bg-slate hover:bg-slate/90" : ""}
            onClick={() => {
              setMode("view");
              setActiveTool(null);
            }}
          >
            <Eye className="h-3.5 w-3.5" /> View
          </Button>
          <div className="h-6 w-px bg-border mx-1" />
          <Button size="sm" variant="outline" asChild>
            <Link to="/app/sites/$id/print" params={{ id }} target="_blank">
              <Download className="h-3.5 w-3.5" /> Export
            </Link>
          </Button>
          <Button size="sm" onClick={save} className="bg-gold hover:bg-gold/90 text-white">
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Palette */}
        {mode === "edit" && (
          <aside className="w-56 shrink-0 border-r border-border bg-white overflow-y-auto p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 mb-2">
              Tools
            </p>
            <div className="space-y-1">
              {tools.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTool(t.id === "select" ? null : t.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors",
                    (activeTool === t.id || (t.id === "select" && !activeTool))
                      ? "bg-slate text-white"
                      : "hover:bg-secondary text-slate",
                  )}
                >
                  <span>{t.label}</span>
                  {t.key && (
                    <span className="text-[10px] opacity-60 font-mono">{t.key}</span>
                  )}
                </button>
              ))}
            </div>

            <p className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 mb-2 mt-6">
              Layout ops
            </p>
            <div className="space-y-1">
              <button
                onClick={addSample}
                className="w-full text-left px-3 py-2 rounded-md text-xs font-medium hover:bg-secondary"
              >
                Start from sample layout
              </button>
            </div>


            <p className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 mb-2 mt-6">
              Status filter
            </p>
            <div className="space-y-1">
              {(["AVAILABLE", "INQUIRY", "BOOKED", "SOLD"] as PlotStatus[]).map((s) => {
                const on = !statusFilters || statusFilters.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => {
                      setStatusFilters((prev) => {
                        const cur = prev ?? ["AVAILABLE", "INQUIRY", "BOOKED", "SOLD"];
                        return cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s];
                      });
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs",
                      on ? "" : "opacity-40",
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        background:
                          s === "SOLD"
                            ? "#92400e"
                            : s === "BOOKED"
                              ? "#1d4ed8"
                              : s === "INQUIRY"
                                ? "#d97706"
                                : "#94a3b8",
                      }}
                    />
                    {s}
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* Canvas */}
        <div className="flex-1 relative">
          <PlanRenderer
            layout={layout}
            plots={plots}
            interactive={mode === "edit"}
            selectedId={selectedId}
            filterStatuses={statusFilters}
            activeTool={activeTool}
            onSelect={setSelectedId}
            onChange={commit}
            onOpenPlot={(pid) => navigate({ to: "/app/sites/$id", search: { plot: pid } as any, params: { id } })}
          />

          {/* Hint */}
          <div className="absolute top-3 left-3 rounded-md bg-white/90 backdrop-blur border border-border px-3 py-1.5 text-xs text-slate shadow-sm">
            {toolHints[activeTool ?? "select"]}
          </div>

          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <button
              onClick={() => {
                setLayout(historyRef.current[0]);
              }}
              className="rounded-md bg-white border border-border px-2 py-1 text-[10px] uppercase tracking-widest hover:bg-secondary"
            >
              <Maximize className="h-3 w-3 inline mr-1" />
              Fit
            </button>
          </div>
        </div>

        {/* Inspector + summary */}
        <aside className="w-72 shrink-0 border-l border-border bg-white overflow-y-auto">
          <div className="p-4 border-b border-border">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
              Plan summary
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-display font-semibold">{totalPlots}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Plots drawn
                </p>
              </div>
              <div>
                <p className="text-2xl font-display font-semibold">
                  {layout.elements.filter((e) => e.type === "road").length}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Roads
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Portfolio value
              </p>
              <p className="text-lg font-display font-semibold tabular">
                ₹{(totalValue / 100000).toFixed(1)}L
              </p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">
                Collected (linked)
              </p>
              <p className="text-lg font-display font-semibold tabular text-emerald">
                ₹{(totalCollected / 100000).toFixed(1)}L
              </p>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {!selected ? (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                  Canvas Boundaries
                </p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Width (meters)</Label>
                      <Input
                        type="number"
                        value={layout.bounds.w}
                        onChange={(e) => {
                          const w = Math.max(50, Number(e.target.value) || 0);
                          commit((l) => ({ ...l, bounds: { ...l.bounds, w } }));
                        }}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Height (meters)</Label>
                      <Input
                        type="number"
                        value={layout.bounds.h}
                        onChange={(e) => {
                          const h = Math.max(50, Number(e.target.value) || 0);
                          commit((l) => ({ ...l, bounds: { ...l.bounds, h } }));
                        }}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Increase boundary dimensions to stretch the outline canvas border.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                  Inspector
                </p>
                <ElementInspector
                  el={selected}
                  onChange={(next) =>
                    commit((l) => ({
                      ...l,
                      elements: l.elements.map((e) => (e.id === selected.id ? next : e)),
                    }))
                  }
                  onDelete={() => {
                    commit((l) => ({ ...l, elements: l.elements.filter((e) => e.id !== selected.id) }));
                    setSelectedId(null);
                  }}
                  unit={site.area_unit}
                />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function ElementInspector({
  el,
  onChange,
  onDelete,
  unit,
}: {
  el: PlanElement;
  onChange: (el: PlanElement) => void;
  onDelete: () => void;
  unit: "SQFT" | "SQM";
}) {
  const areaLabel = unit === "SQFT" ? "sq ft" : "sq m";
  const toUnit = (mSquared: number) =>
    unit === "SQFT" ? Math.round(mSquared * 10.7639) : Math.round(mSquared);

  return (
    <div className="space-y-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {el.type.replace("_", " ")}
      </div>

      {el.type === "plot" && (
        <>
          <div>
            <Label className="text-xs">Plot number</Label>
            <Input
              value={el.plot_number}
              onChange={(e) => onChange({ ...el, plot_number: e.target.value })}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Shape</Label>
            <div className="mt-1 grid grid-cols-4 gap-1">
              {(["rect", "circle", "triangle", "hex"] as const).map((s) => {
                const active = (el.shape ?? "rect") === s;
                return (
                  <button
                    key={s}
                    onClick={() => onChange({ ...el, shape: s })}
                    className={cn(
                      "h-8 rounded-md text-[10px] uppercase tracking-widest border transition-colors",
                      active
                        ? "bg-slate text-white border-slate"
                        : "bg-white text-slate border-border hover:bg-secondary",
                    )}
                  >
                    {s === "rect" ? "Rect" : s === "circle" ? "Circle" : s === "triangle" ? "Tri" : "Hex"}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Length (m)</Label>
              <Input
                type="number"
                value={el.w}
                onChange={(e) => onChange({ ...el, w: Math.max(1, Number(e.target.value) || 0) })}
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Width (m)</Label>
              <Input
                type="number"
                value={el.h}
                onChange={(e) => onChange({ ...el, h: Math.max(1, Number(e.target.value) || 0) })}
                className="mt-1 h-8 text-sm"
              />
            </div>
          </div>
          {(el.shape ?? "rect") === "rect" && (
            <div>
              <Label className="text-xs">
                Curve corners — {(el.cornerRadius ?? 0).toFixed(1)}m
              </Label>
              <Slider
                min={0}
                max={Math.max(1, Math.min(el.w, el.h) / 2)}
                step={0.5}
                value={[el.cornerRadius ?? 0]}
                onValueChange={(v) => onChange({ ...el, cornerRadius: v[0] })}
                className="mt-2"
              />
            </div>
          )}
          <div>
            <Label className="text-xs">Rotation — {el.rotation ?? 0}°</Label>
            <Slider
              min={0}
              max={359}
              step={1}
              value={[el.rotation ?? 0]}
              onValueChange={(v) => onChange({ ...el, rotation: v[0] })}
              className="mt-2"
            />
          </div>
          <div className="rounded-md bg-parchment px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-parchment-ink/60">
              Area
            </p>
            <p className="text-sm font-display font-semibold text-parchment-ink">
              {toUnit(
                (el.shape === "circle"
                  ? Math.PI * (el.w / 2) * (el.h / 2)
                  : el.shape === "triangle"
                    ? (el.w * el.h) / 2
                    : el.shape === "hex"
                      ? (el.w * el.h * 3) / 4
                      : el.w * el.h),
              )}{" "}
              {areaLabel}
            </p>
          </div>
        </>
      )}

      {el.type === "road" && (
        <>
          <div>
            <Label className="text-xs">Road name</Label>
            <Input
              value={el.name ?? ""}
              onChange={(e) => onChange({ ...el, name: e.target.value })}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Width — {el.width}m</Label>
            <Slider
              min={3}
              max={24}
              step={1}
              value={[el.width]}
              onValueChange={(v) => onChange({ ...el, width: v[0] })}
              className="mt-2"
            />
          </div>
          <div className="text-[11px] text-muted-foreground bg-slate/5 p-2 rounded border border-border/40 space-y-1 mt-1">
            <p className="font-semibold text-slate/85">Road Editing Tips:</p>
            <p>• Drag round points on the canvas to bend.</p>
            <p>• Double-click the road line to add a point.</p>
            <p>• Double-click a control point to delete it.</p>
          </div>
        </>
      )}

      {(el.type === "garden" || el.type === "parking") && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Width (m)</Label>
            <Input
              type="number"
              value={el.w}
              onChange={(e) => onChange({ ...el, w: Number(e.target.value) })}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Height (m)</Label>
            <Input
              type="number"
              value={el.h}
              onChange={(e) => onChange({ ...el, h: Number(e.target.value) })}
              className="mt-1 h-8 text-sm"
            />
          </div>
        </div>
      )}

      {el.type === "text" && (
        <>
          <div>
            <Label className="text-xs">Text</Label>
            <Input
              value={el.text}
              onChange={(e) => onChange({ ...el, text: e.target.value })}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Size — {el.size ?? 3}</Label>
            <Slider
              min={1}
              max={8}
              step={1}
              value={[el.size ?? 3]}
              onValueChange={(v) => onChange({ ...el, size: v[0] })}
              className="mt-2"
            />
          </div>
        </>
      )}

      {"label" in el && (
        <div>
          <Label className="text-xs">Label</Label>
          <Input
            value={el.label ?? ""}
            onChange={(e) => onChange({ ...el, label: e.target.value } as PlanElement)}
            className="mt-1 h-8 text-sm"
          />
        </div>
      )}

      {el.type === "light_pole" && (
        <>
          <div>
            <Label className="text-xs">Rotation — {el.rotation ?? 0}°</Label>
            <Slider
              min={0}
              max={359}
              step={1}
              value={[el.rotation ?? 0]}
              onValueChange={(v) => onChange({ ...el, rotation: v[0] })}
              className="mt-2"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <Label className="text-xs">Light Status</Label>
            <Button
              size="sm"
              variant={!("light_on" in el ? el.light_on : true) ? "outline" : "default"}
              className={cn(
                "h-7 text-xs px-3",
                !("light_on" in el ? el.light_on : true) ? "" : "bg-emerald hover:bg-emerald/90 text-white"
              )}
              onClick={() =>
                onChange({
                  ...el,
                  light_on: !("light_on" in el ? el.light_on : true),
                })
              }
            >
              {!("light_on" in el ? el.light_on : true) ? "OFF" : "ON"}
            </Button>
          </div>
        </>
      )}

      <div className="pt-3 border-t border-border">
        <Button size="sm" variant="outline" className="w-full text-destructive" onClick={onDelete}>
          <Trash2 className="h-3 w-3" /> Delete element
        </Button>
      </div>
    </div>
  );
}
