import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PlanRenderer } from "@/components/plan/PlanRenderer";
import { StatusPill, plotStatusKind } from "@/components/ui-ext/StatusPill";
import { useApp } from "@/data/store";
import { areaLabel, money, orgScope, siteProgress } from "@/data/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import type { Plot, PlotStatus } from "@/data/types";
import { Map as MapIcon, List, Plus, Pencil, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlotDrawer } from "@/components/plots/PlotDrawer";
import { RoadDrawer } from "@/components/plots/RoadDrawer";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/app/sites/$id/")({
  head: () => ({ meta: [{ title: "Site — PropVault" }] }),
  component: SiteDetail,
});

function SiteDetail() {
  const { id } = useParams({ from: "/app/sites/$id/" });
  const navigate = useNavigate();
  const site = useApp((s) => s.sites.find((x) => x.id === id));
  const plots = useApp((s) =>
    orgScope(s.plots, s.session?.org_id).filter((p) => p.site_id === id),
  );
  const [view, setView] = useState<"map" | "list">("map");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<PlotStatus | "ALL">("ALL");
  const [openPlot, setOpenPlot] = useState<string | null>(null);
  const [openRoad, setOpenRoad] = useState<string | null>(null);
  const [editSiteOpen, setEditSiteOpen] = useState(false);
  const isMobile = useIsMobile();

  if (!site) return <AppShell variant="tenant" title="Site not found">–</AppShell>;

  const filtered = plots.filter(
    (p) =>
      (filter === "ALL" || p.status === filter) &&
      (q === "" || p.plot_number.toLowerCase().includes(q.toLowerCase())),
  );
  const prog = siteProgress(site, plots);

  return (
    <AppShell
      variant="tenant"
      title={site.name}
      subtitle={site.address}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditSiteOpen(true)}>
            <Pencil className="h-4 w-4" /> Edit details
          </Button>
          <Button asChild className="bg-slate hover:bg-slate/90">
            <Link to="/app/sites/$id/designer" params={{ id }}>
              <Pencil className="h-4 w-4" /> Open designer
            </Link>
          </Button>
        </div>
      }
    >
      {/* Progress banner */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total plots", val: prog.total },
          { label: "Available", val: prog.available },
          { label: "Booked", val: prog.booked },
          { label: "Sold", val: prog.sold },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-white p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {k.label}
            </p>
            <p className="mt-1 text-2xl font-display font-semibold tabular">{k.val}</p>
          </div>
        ))}
      </section>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border border-border bg-white overflow-hidden">
          <button
            onClick={() => setView("map")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-medium",
              view === "map" ? "bg-slate text-white" : "hover:bg-secondary",
            )}
          >
            <MapIcon className="h-3.5 w-3.5" /> Map
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-medium",
              view === "list" ? "bg-slate text-white" : "hover:bg-secondary",
            )}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
        </div>

        <div className="flex flex-wrap gap-1">
          {(["ALL", "AVAILABLE", "INQUIRY", "BOOKED", "SOLD"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors",
                filter === f
                  ? "bg-slate text-white border-slate"
                  : "bg-white border-border text-muted-foreground hover:text-slate",
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <Input
            placeholder="Search plot number…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      {/* Body */}
      {view === "map" ? (
        <div className="rounded-xl border border-border bg-white overflow-hidden h-[600px]">
          <PlanRenderer
            layout={site.layout}
            plots={plots}
            interactive={false}
            filterStatuses={filter === "ALL" ? undefined : [filter as PlotStatus]}
            onOpenPlot={(pid) => setOpenPlot(pid)}
            onOpenRoad={(rid) => setOpenRoad(rid)}
            onChange={(updater) => {
              const nextLayout = updater(site.layout);
              useApp.getState().saveSiteLayout(site.id, nextLayout);
            }}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface/50 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-semibold">Plot</th>
                <th className="px-6 py-3 font-semibold">Dimensions</th>
                <th className="px-6 py-3 font-semibold">Area</th>
                <th className="px-6 py-3 font-semibold">Facing</th>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 font-semibold text-right">Price</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-surface/40">
                  <td className="px-6 py-3 font-semibold text-sm">{p.plot_number}</td>
                  <td className="px-6 py-3 text-sm tabular">
                    {p.length} × {p.width}
                  </td>
                  <td className="px-6 py-3 text-sm tabular">
                    {p.area} {areaLabel(site.area_unit)}
                  </td>
                  <td className="px-6 py-3 text-sm">{p.facing}</td>
                  <td className="px-6 py-3 text-xs uppercase text-muted-foreground">
                    {p.plot_type.replace("_", " ")}
                  </td>
                  <td className="px-6 py-3 text-right font-display font-semibold tabular">
                    {money(p.price)}
                  </td>
                  <td className="px-6 py-3">
                    <StatusPill kind={plotStatusKind(p.status)}>{p.status}</StatusPill>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => setOpenPlot(p.id)}
                      className="text-xs font-medium text-slate hover:text-gold inline-flex items-center gap-1"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    No plots match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Plot drawer (Dialog / Pop Model on Mobile, Sheet on Desktop) */}
      {isMobile ? (
        <Dialog open={!!openPlot} onOpenChange={(o) => !o && setOpenPlot(null)}>
          <DialogContent className="max-w-lg overflow-y-auto p-0 rounded-lg max-h-[85vh]">
            {openPlot && <PlotDrawer plotId={openPlot} onClose={() => setOpenPlot(null)} />}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={!!openPlot} onOpenChange={(o) => !o && setOpenPlot(null)}>
          <SheetContent className="sm:max-w-lg overflow-y-auto p-0">
            {openPlot && <PlotDrawer plotId={openPlot} onClose={() => setOpenPlot(null)} />}
          </SheetContent>
        </Sheet>
      )}

      {/* Road drawer (Dialog / Pop Model on Mobile, Sheet on Desktop) */}
      {isMobile ? (
        <Dialog open={!!openRoad} onOpenChange={(o) => !o && setOpenRoad(null)}>
          <DialogContent className="max-w-md overflow-y-auto p-0 rounded-lg max-h-[85vh]">
            {openRoad && <RoadDrawer roadId={openRoad} siteId={id} onClose={() => setOpenRoad(null)} />}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={!!openRoad} onOpenChange={(o) => !o && setOpenRoad(null)}>
          <SheetContent className="sm:max-w-md overflow-y-auto p-0">
            {openRoad && <RoadDrawer roadId={openRoad} siteId={id} onClose={() => setOpenRoad(null)} />}
          </SheetContent>
        </Sheet>
      )}

      {editSiteOpen && (
        <EditSiteDialog
          open={editSiteOpen}
          onOpenChange={setEditSiteOpen}
          site={site}
        />
      )}

    </AppShell>
  );
}

function AddPlotDialog({
  open,
  onOpenChange,
  siteId,
  unit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  siteId: string;
  unit: "SQFT" | "SQM";
}) {
  const createPlot = useApp((s) => s.createPlot);
  const [number, setNumber] = useState("");
  const [length, setLength] = useState(30);
  const [width, setWidth] = useState(40);
  const [areaOverride, setAreaOverride] = useState<number | null>(null);
  const [price, setPrice] = useState("500000");
  const [facing, setFacing] = useState<Plot["facing"]>("E");
  const [type, setType] = useState<Plot["plot_type"]>("RESIDENTIAL");

  const area = areaOverride ?? length * width;

  const submit = () => {
    if (!number.trim()) return toast.error("Plot number required");
    createPlot({
      site_id: siteId,
      plot_number: number,
      length,
      width,
      area,
      price,
      facing,
      plot_type: type,
    });
    toast.success(`Plot ${number} added`);
    onOpenChange(false);
    setNumber("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add plot</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Plot number</Label>
            <Input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="A-15"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Length ({areaLabel(unit) === "sq ft" ? "ft" : "m"})</Label>
              <Input
                type="number"
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Width ({areaLabel(unit) === "sq ft" ? "ft" : "m"})</Label>
              <Input
                type="number"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
          <div className="rounded-md bg-surface px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Area (auto)
              </p>
              <p className="text-lg font-display font-semibold tabular">
                {area} {areaLabel(unit)}
              </p>
            </div>
            <button
              className="text-[10px] text-gold hover:underline uppercase tracking-widest"
              onClick={() => setAreaOverride(area)}
            >
              Override
            </button>
          </div>
          {areaOverride !== null && (
            <Input
              type="number"
              value={areaOverride}
              onChange={(e) => setAreaOverride(Number(e.target.value))}
            />
          )}
          <div>
            <Label>Price</Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Facing</Label>
              <Select value={facing} onValueChange={(v) => setFacing(v as Plot["facing"])}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["N", "S", "E", "W", "NE", "NW", "SE", "SW"] as const).map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Plot["plot_type"])}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                  <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                  <SelectItem value="CORNER">Corner</SelectItem>
                  <SelectItem value="PARK_FACING">Park facing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} className="bg-slate hover:bg-slate/90">
            Add plot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditSiteDialog({
  open,
  onOpenChange,
  site,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  site: any;
}) {
  const updateSite = useApp((s) => s.updateSite);
  const [name, setName] = useState(site.name);
  const [address, setAddress] = useState(site.address || "");
  const [unit, setUnit] = useState<"SQFT" | "SQM">(site.area_unit);
  const [photo, setPhoto] = useState<string | null>(site.photo_url || null);

  const onPhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Site name is required");
    updateSite(site.id, { name, address, area_unit: unit, photo_url: photo });
    toast.success("Site details updated");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit site details</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="editName">Site name</Label>
            <Input
              id="editName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="editAddress">Address</Label>
            <Textarea
              id="editAddress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>
          <div>
            <Label>Area unit</Label>
            <RadioGroup
              value={unit}
              onValueChange={(v) => setUnit(v as "SQFT" | "SQM")}
              className="mt-2 grid grid-cols-2 gap-3"
            >
              <label className="flex items-center gap-3 rounded-md border border-border px-4 py-2 cursor-pointer has-[[data-state=checked]]:border-slate has-[[data-state=checked]]:bg-slate/5">
                <RadioGroupItem value="SQFT" id="editSqft" />
                <div>
                  <p className="text-xs font-semibold">Square feet</p>
                  <p className="text-[10px] text-muted-foreground">India standard</p>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-md border border-border px-4 py-2 cursor-pointer has-[[data-state=checked]]:border-slate has-[[data-state=checked]]:bg-slate/5">
                <RadioGroupItem value="SQM" id="editSqm" />
                <div>
                  <p className="text-xs font-semibold">Square meters</p>
                  <p className="text-[10px] text-muted-foreground">Metric standard</p>
                </div>
              </label>
            </RadioGroup>
          </div>
          <div>
            <Label htmlFor="editPhoto">Site photo</Label>
            <div className="mt-1 flex items-center gap-4">
              {photo ? (
                <img src={photo} alt="Site" className="h-16 w-24 object-cover rounded-md border border-border" />
              ) : (
                <div className="h-16 w-24 rounded-md bg-parchment border border-border grid place-items-center text-[10px] text-muted-foreground uppercase tracking-widest">
                  No photo
                </div>
              )}
              <Input
                id="editPhoto"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPhoto(f);
                }}
              />
            </div>
          </div>
          <DialogFooter className="pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-slate hover:bg-slate/90">
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
