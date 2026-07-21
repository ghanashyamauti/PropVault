import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui-ext/EmptyState";
import { useApp } from "@/data/store";
import { orgScope, fmtDate } from "@/data/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { MessageSquare, Plus, Search } from "lucide-react";

export const Route = createFileRoute("/app/inquiries/")({
  head: () => ({ meta: [{ title: "Customer Inquiries — PropVault" }] }),
  component: Inquiries,
});

function Inquiries() {
  const orgId = useApp((s) => s.session?.org_id);
  const inquiries = useApp((s) => orgScope(s.inquiries, orgId));
  const sites = useApp((s) => orgScope(s.sites, orgId));
  const plots = useApp((s) => orgScope(s.plots, orgId));
  const createInquiry = useApp((s) => s.createInquiry);

  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  // Dialog States
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [selectedPlotId, setSelectedPlotId] = useState<string>("");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [notes, setNotes] = useState("");

  const enriched = useMemo(() => {
    return inquiries.map((inq) => {
      const plot = plots.find((p) => p.id === inq.plot_id);
      const site = plot ? sites.find((s) => s.id === plot.site_id) : null;
      return {
        ...inq,
        plotNumber: plot?.plot_number ?? "—",
        siteName: site?.name ?? "—",
      };
    });
  }, [inquiries, plots, sites]);

  const filtered = useMemo(() => {
    if (!q.trim()) return enriched;
    const lower = q.toLowerCase();
    return enriched.filter(
      (x) =>
        x.customer_name.toLowerCase().includes(lower) ||
        x.phone.includes(lower) ||
        x.plotNumber.toLowerCase().includes(lower) ||
        x.siteName.toLowerCase().includes(lower) ||
        (x.notes || "").toLowerCase().includes(lower)
    );
  }, [enriched, q]);

  const availablePlots = useMemo(() => {
    if (!selectedSiteId) return [];
    return plots.filter((p) => p.site_id === selectedSiteId);
  }, [plots, selectedSiteId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteId) return toast.error("Please select a site");
    if (!selectedPlotId) return toast.error("Please select a plot");
    if (!custName.trim()) return toast.error("Enter customer name");
    if (!custPhone.trim()) return toast.error("Enter phone number");

    createInquiry({
      plot_id: selectedPlotId,
      customer_name: custName,
      phone: custPhone,
      notes: notes,
    });

    toast.success("Inquiry successfully added");
    setAddOpen(false);
    setSelectedSiteId("");
    setSelectedPlotId("");
    setCustName("");
    setCustPhone("");
    setNotes("");
  };

  return (
    <AppShell
      variant="tenant"
      title="Inquiries"
      subtitle="Leads & Interest"
      actions={
        <Button onClick={() => setAddOpen(true)} className="bg-slate hover:bg-slate/90">
          <Plus className="h-4 w-4" /> Add inquiry
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Search */}
        <div className="flex items-center gap-2 max-w-md bg-white border border-border rounded-lg px-3 py-1.5 shadow-sm">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            placeholder="Search by customer name, phone, plot or notes..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full text-sm bg-transparent border-0 outline-none focus:ring-0 placeholder:text-muted-foreground/60"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={inquiries.length === 0 ? "No inquiries yet" : "No results match search"}
            description={
              inquiries.length === 0
                ? "Add your first lead inquiry to keep track of site and plot buyer interest."
                : "Try adjusting your search keywords."
            }
            icon={<MessageSquare className="h-6 w-6" />}
            cta={
              inquiries.length === 0
                ? { label: "Add inquiry", onClick: () => setAddOpen(true) }
                : undefined
            }
          />
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-surface/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-semibold">Customer</th>
                  <th className="px-6 py-3 font-semibold">Phone</th>
                  <th className="px-6 py-3 font-semibold">Site</th>
                  <th className="px-6 py-3 font-semibold">Plot</th>
                  <th className="px-6 py-3 font-semibold">Notes / Requirements</th>
                  <th className="px-6 py-3 font-semibold text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filtered.map((inq) => (
                  <tr key={inq.id} className="hover:bg-surface/30">
                    <td className="px-6 py-4 font-semibold text-slate">{inq.customer_name}</td>
                    <td className="px-6 py-4 text-muted-foreground font-mono">{inq.phone}</td>
                    <td className="px-6 py-4 font-medium">{inq.siteName}</td>
                    <td className="px-6 py-4 font-semibold text-slate">{inq.plotNumber}</td>
                    <td className="px-6 py-4 text-muted-foreground text-xs max-w-xs truncate" title={inq.notes}>
                      {inq.notes || "—"}
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-muted-foreground tabular">
                      {fmtDate(inq.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add inquiry</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Select site</Label>
              <Select value={selectedSiteId} onValueChange={(v) => {
                setSelectedSiteId(v);
                setSelectedPlotId("");
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose site..." />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Select plot</Label>
              <Select
                value={selectedPlotId}
                onValueChange={setSelectedPlotId}
                disabled={!selectedSiteId}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={selectedSiteId ? "Choose plot..." : "Select a site first"} />
                </SelectTrigger>
                <SelectContent>
                  {availablePlots.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.plot_number} ({p.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="custName">Customer name</Label>
              <Input
                id="custName"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                placeholder="Enter buyer's full name"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="custPhone">Phone number</Label>
              <Input
                id="custPhone"
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                placeholder="Enter contact number"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="inqNotes">Notes / Requirements</Label>
              <Textarea
                id="inqNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Budget, dimensions desired, next follow-up dates..."
                className="mt-1"
                rows={3}
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-slate hover:bg-slate/90">
                Save inquiry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
