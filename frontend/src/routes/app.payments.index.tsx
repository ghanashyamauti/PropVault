import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/data/store";
import { fmtDate, money, moneyCompact, orgScope, currentUser, can } from "@/data/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui-ext/StatusPill";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownLeft, Plus, RotateCcw, FileDown, Undo2, Mail, ShieldAlert } from "lucide-react";
import Decimal from "decimal.js";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { downloadReceiptPDF } from "@/lib/pdf-export";

export const Route = createFileRoute("/app/payments/")({
  head: () => ({ meta: [{ title: "Payments — PropVault" }] }),
  component: Payments,
});

function Payments() {
  const me = useApp(currentUser);
  const orgId = useApp((s) => s.session?.org_id);
  const txs = useApp((s) => orgScope(s.transactions, orgId));
  const plots = useApp((s) => orgScope(s.plots, orgId));
  const customers = useApp((s) => orgScope(s.customers, orgId));
  const orgName = useApp((s) => s.organizations.find(o => o.id === orgId)?.name);
  const historyLen = useApp((s) => s.history.length);
  const undoLast = useApp((s) => s.undoLast);
  const [tab, setTab] = useState<"IN" | "OUT">("IN");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [plotFilter, setPlotFilter] = useState<string>("ALL");
  const [modeFilter, setModeFilter] = useState<string>("ALL");
  const reverse = useApp((s) => s.reverseTransaction);
  const [reverseId, setReverseId] = useState<string | null>(null);

  const isAdmin = me?.permissions?.is_org_admin;
  const canView = isAdmin || can(me?.permissions, "payments", "view");
  const canAdd = isAdmin || can(me?.permissions, "payments", "add");
  const canEdit = isAdmin || can(me?.permissions, "payments", "edit");

  if (!canView) {
    return (
      <AppShell variant="tenant" title="Payments" subtitle="Access restricted">
        <div className="max-w-md bg-white rounded-xl border border-border p-8 text-center">
          <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-display text-lg font-semibold mb-1">Access Restricted</h3>
          <p className="text-sm text-muted-foreground">
            You do not have permission to view payment transactions.
          </p>
        </div>
      </AppShell>
    );
  }
  const [reverseNote, setReverseNote] = useState("");
  const [emailDialog, setEmailDialog] = useState<{
    open: boolean;
    recipientEmail: string;
    recipientName: string;
    subject: string;
    bodyText: string;
  } | null>(null);

  const findCustomerEmail = (t: typeof txs[number]) => {
    if (t.customer_id) {
      const c = customers.find((x) => x.id === t.customer_id);
      if (c) return c.email;
    }
    const c = customers.find((x) => x.full_name.toLowerCase() === t.party_name.toLowerCase());
    return c ? c.email : "customer@example.com";
  };

  const filtered = txs.filter((t) => {
    if (t.direction !== tab) return false;
    if (
      q !== "" &&
      !t.party_name.toLowerCase().includes(q.toLowerCase()) &&
      !t.type.toLowerCase().includes(q.toLowerCase()) &&
      !(t.notes ?? "").toLowerCase().includes(q.toLowerCase())
    )
      return false;
    if (plotFilter !== "ALL" && t.plot_id !== plotFilter) return false;
    if (modeFilter !== "ALL" && t.payment_mode !== modeFilter) return false;
    if (from && new Date(t.transaction_date) < new Date(from)) return false;
    if (to && new Date(t.transaction_date) > new Date(to + "T23:59:59")) return false;
    return true;
  });

  const kpis = useMemo(() => {
    const inTxs = txs.filter((t) => t.direction === "IN");
    const outTxs = txs.filter((t) => t.direction === "OUT");
    const sum = (list: typeof txs) =>
      list.reduce((d, t) => d.plus(t.amount), new Decimal(0)).toFixed(0);
    const thisMonth = (list: typeof txs) => {
      const now = new Date();
      return list
        .filter((t) => {
          const d = new Date(t.transaction_date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((d, t) => d.plus(t.amount), new Decimal(0))
        .toFixed(0);
    };
    return {
      IN: {
        total: sum(inTxs),
        thisMonth: thisMonth(inTxs),
        count: inTxs.length,
        avg: inTxs.length ? new Decimal(sum(inTxs)).div(inTxs.length).toFixed(0) : "0",
      },
      OUT: {
        total: sum(outTxs),
        thisMonth: thisMonth(outTxs),
        count: outTxs.length,
        avg: outTxs.length ? new Decimal(sum(outTxs)).div(outTxs.length).toFixed(0) : "0",
      },
    };
  }, [txs]);

  const activeKpis = kpis[tab];

  const doUndo = () => {
    const r = undoLast();
    if (r.ok) toast.success(`Undone: ${r.label}`);
    else toast.info("Nothing to undo");
  };

  return (
    <AppShell
      variant="tenant"
      title="Payments"
      subtitle="Append-only ledger"
      actions={
        <>
          <Button
            variant="outline"
            onClick={doUndo}
            disabled={historyLen === 0}
            title="Undo last mutation"
          >
            <Undo2 className="h-4 w-4" /> Undo
          </Button>
          {canAdd && (
            <Button asChild className="bg-slate hover:bg-slate/90">
              <Link to="/app/payments/new">
                <Plus className="h-4 w-4" /> Record transaction
              </Link>
            </Button>
          )}
        </>
      }
    >
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("IN")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border",
            tab === "IN"
              ? "bg-emerald text-white border-emerald"
              : "bg-white border-border text-muted-foreground",
          )}
        >
          <ArrowDownLeft className="h-4 w-4" /> Money in
        </button>
        <button
          onClick={() => setTab("OUT")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border",
            tab === "OUT"
              ? "bg-gold text-white border-gold"
              : "bg-white border-border text-muted-foreground",
          )}
        >
          <ArrowUpRight className="h-4 w-4" /> Money out
        </button>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { l: "Total", v: moneyCompact(activeKpis.total) },
          { l: "This month", v: moneyCompact(activeKpis.thisMonth) },
          { l: "Transactions", v: activeKpis.count },
          { l: "Average", v: moneyCompact(activeKpis.avg) },
        ].map((c) => (
          <div key={c.l} className="rounded-xl border border-border bg-white p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.l}</p>
            <p className="mt-1 text-2xl font-display font-semibold tabular">{c.v}</p>
          </div>
        ))}
      </section>

      <div className="mb-4 grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
        <div className="col-span-2 md:col-span-2">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Search
          </Label>
          <Input
            placeholder="Party, type, notes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Plot</Label>
          <select
            value={plotFilter}
            onChange={(e) => setPlotFilter(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="ALL">All plots</option>
            {plots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.plot_number}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Mode</Label>
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="ALL">All</option>
            <option value="BANK">Bank</option>
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
            <option value="CHEQUE">Cheque</option>
            <option value="CARD">Card</option>
          </select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        {filtered.length} of {txs.filter((t) => t.direction === tab).length} · Append-only. Corrections create reversals.
      </p>

      <div className="rounded-xl border border-border bg-white overflow-x-auto">
        <table className="w-full text-left min-w-[720px]">
          <thead className="bg-surface/50 text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 md:px-6 py-3 font-semibold">Date</th>
              <th className="px-4 md:px-6 py-3 font-semibold">Party</th>
              <th className="px-4 md:px-6 py-3 font-semibold">Type</th>
              <th className="px-4 md:px-6 py-3 font-semibold">Mode</th>
              <th className="px-4 md:px-6 py-3 font-semibold">Notes</th>
              <th className="px-4 md:px-6 py-3 font-semibold text-right">Amount</th>
              <th className="px-4 md:px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((t) => (
              <tr key={t.id} className={cn("hover:bg-surface/40", t.reversal_of && "opacity-70")}>
                <td className="px-4 md:px-6 py-3 text-sm whitespace-nowrap">{fmtDate(t.transaction_date)}</td>
                <td className="px-4 md:px-6 py-3 text-sm font-semibold">{t.party_name}</td>
                <td className="px-4 md:px-6 py-3 text-[10px] font-mono uppercase text-muted-foreground">
                  {t.type}
                  {t.reversal_of && (
                    <StatusPill kind="warning" className="ml-2">
                      REVERSAL
                    </StatusPill>
                  )}
                </td>
                <td className="px-4 md:px-6 py-3 text-xs">{t.payment_mode}</td>
                <td className="px-4 md:px-6 py-3 text-xs text-muted-foreground truncate max-w-xs">
                  {t.notes ?? "—"}
                </td>
                <td className="px-4 md:px-6 py-3 text-right font-display font-semibold tabular whitespace-nowrap">
                  {money(t.amount)}
                </td>
                <td className="px-4 md:px-6 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => {
                      const custEmail = findCustomerEmail(t);
                      const relatedPlot = plots.find(p => p.id === t.plot_id);
                      const subject = `Payment Confirmation & Receipt - ${t.party_name}`;
                      const bodyText = `Dear ${t.party_name},\n\nWe are pleased to confirm receipt of your payment.\n\nPayment Mode: ${t.payment_mode}\nAmount received: ${money(t.amount)}\nDate of payment: ${fmtDate(t.transaction_date)}\nReference: ${t.type}${relatedPlot ? `\nPlot Number: ${relatedPlot.plot_number}` : ""}\nNotes: ${t.notes || "—"}\n\nThank you for choosing PropertyWala.\n\nBest regards,\n${orgName || "PropertyWala Team"}`;

                      setEmailDialog({
                        open: true,
                        recipientEmail: custEmail,
                        recipientName: t.party_name,
                        subject,
                        bodyText,
                      });
                    }}
                    className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground hover:text-slate inline-flex items-center gap-1 mr-3"
                    title="Send email receipt"
                  >
                    <Mail className="h-3 w-3" /> Email
                  </button>
                  <button
                    onClick={() => downloadReceiptPDF(t)}
                    className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground hover:text-slate inline-flex items-center gap-1 mr-3"
                    title="Download PDF receipt"
                  >
                    <FileDown className="h-3 w-3" /> PDF
                  </button>
                  {!t.reversal_of && (
                    <button
                      onClick={() => setReverseId(t.id)}
                      className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" /> Reverse
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  No transactions match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!reverseId} onOpenChange={(o) => !o && setReverseId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reverse transaction</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Reason</Label>
            <Input
              value={reverseNote}
              onChange={(e) => setReverseNote(e.target.value)}
              className="mt-1"
              placeholder="e.g. duplicate entry"
            />
            <p className="mt-3 text-xs text-muted-foreground">
              A reversal row will be added. Original entry is preserved.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReverseId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!reverseNote.trim()) return toast.error("Reason required");
                reverse(reverseId!, reverseNote);
                toast.success("Reversal recorded");
                setReverseId(null);
                setReverseNote("");
              }}
            >
              Post reversal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {emailDialog && (
        <Dialog open={emailDialog.open} onOpenChange={(o) => !o && setEmailDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Send Email Notification</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs text-muted-foreground">Recipient</Label>
                <div className="text-sm font-medium mt-0.5">
                  {emailDialog.recipientName} &lt;{emailDialog.recipientEmail}&gt;
                </div>
              </div>
              <div>
                <Label htmlFor="emailSubject" className="text-xs text-muted-foreground">Subject</Label>
                <Input
                  id="emailSubject"
                  value={emailDialog.subject}
                  onChange={(e) =>
                    setEmailDialog({ ...emailDialog, subject: e.target.value })
                  }
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="emailBody" className="text-xs text-muted-foreground">Message Body</Label>
                <Textarea
                  id="emailBody"
                  value={emailDialog.bodyText}
                  onChange={(e) =>
                    setEmailDialog({ ...emailDialog, bodyText: e.target.value })
                  }
                  className="mt-1 text-xs font-mono"
                  rows={8}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEmailDialog(null)}>
                Cancel
              </Button>
              <Button
                className="bg-emerald hover:bg-emerald/90 text-white"
                onClick={() => {
                  toast.success(`Email sent successfully to ${emailDialog.recipientEmail}!`);
                  setEmailDialog(null);
                }}
              >
                Send Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppShell>
  );
}
