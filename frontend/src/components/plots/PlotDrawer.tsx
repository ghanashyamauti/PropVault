import { useApp, today, nowISO } from "@/data/store";
import { areaLabel, money, moneyCompact, fmtDate, plotCollected, effectiveStageStatus } from "@/data/selectors";
import { StatusPill, plotStatusKind } from "@/components/ui-ext/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Phone, MessageCircle, Mail, Plus, UserCheck, ChevronDown, ChevronUp, Activity } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Decimal from "decimal.js";
import { BookPlotDialog } from "./BookPlotDialog";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function PlotDrawer({ plotId, onClose }: { plotId: string; onClose: () => void }) {
  const state = useApp();
  const plot = state.plots.find((p) => p.id === plotId);
  const site = state.sites.find((s) => s.id === plot?.site_id);
  const booking = state.bookings.find((b) => b.plot_id === plotId && !b.cancelled_at);
  const customer = booking ? state.customers.find((c) => c.id === booking.customer_id) : null;
  const stages = booking
    ? state.schedule.filter((s) => s.booking_id === booking.id).sort((a, b) => a.sort_order - b.sort_order)
    : [];
  const setStatus = useApp((s) => s.setPlotStatus);
  const recordPayment = useApp((s) => s.recordPayment);
  const [payOpen, setPayOpen] = useState(false);
  const [payStageId, setPayStageId] = useState<string | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [inqOpen, setInqOpen] = useState(false);
  const [showStaffHandling, setShowStaffHandling] = useState(false);
  const [emailDialog, setEmailDialog] = useState<{
    open: boolean;
    recipientEmail: string;
    recipientName: string;
    subject: string;
    bodyText: string;
    stageId?: string;
  } | null>(null);
  const now = today(state);

  if (!plot || !site) return <div className="p-6">Plot not found.</div>;

  const inquiries = state.inquiries
    .filter((inq) => inq.plot_id === plotId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const totalDue = stages.reduce((d, s) => d.plus(s.amount_due), new Decimal(0));
  const totalPaid = new Decimal(plotCollected(plot.id, state));
  const pct = totalDue.gt(0)
    ? Math.min(100, Math.round(totalPaid.div(totalDue).mul(100).toNumber()))
    : 0;
  const plotAuditLogs = state.audit
    .filter(
      (a) =>
        a.entity_id === plotId ||
        (booking && a.entity_id === booking.id) ||
        (a.detail && a.detail.toLowerCase().includes(`plot ${plot.plot_number.toLowerCase()}`)),
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const bookingActorLog = plotAuditLogs.find((a) => a.action === "BOOKING_CREATED");

  const plotTransactions = state.transactions.filter((t) => t.plot_id === plotId);
  const plotCollectors = Array.from(
    new Set(
      plotTransactions
        .map((t) => {
          const matchingAudit = state.audit.find((a) => a.entity_id === t.id && a.action === "PAYMENT_RECORDED");
          return matchingAudit?.actor_name;
        })
        .filter(Boolean),
    ),
  );

  return (
    <div>
      {/* Header */}
      <div className="p-6 border-b border-border bg-parchment">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-parchment-ink/60">
              Plot {plot.plot_number} · {site.name}
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-parchment-ink">
              {plot.plot_number}
            </h2>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-parchment-ink/70">
              <span>{plot.length} × {plot.width}</span>
              <span>·</span>
              <span>{plot.area} {areaLabel(site.area_unit)}</span>
              <span>·</span>
              <span>{plot.facing} facing</span>
              <span>·</span>
              <span>{plot.plot_type.replace("_", " ")}</span>
            </div>
          </div>
          <StatusPill kind={plotStatusKind(plot.status)}>{plot.status}</StatusPill>
        </div>
        <p className="mt-3 font-display text-3xl font-semibold text-parchment-ink tabular">
          {money(plot.price)}
        </p>
      </div>

      {/* Mark as buttons */}
      <div className="p-4 border-b border-border">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          Change status
        </p>
        <div className="flex flex-wrap gap-2">
          {(["AVAILABLE", "INQUIRY", "BOOKED", "SOLD"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={plot.status === s ? "default" : "outline"}
              className={plot.status === s ? "bg-slate hover:bg-slate/90" : ""}
              onClick={() => {
                setStatus(plot.id, s);
                toast.success(`Marked ${plot.plot_number} as ${s}`);
              }}
            >
              Mark as {s.toLowerCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Customer */}
      {customer && (
        <div className="p-6 border-b border-border">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
            Customer
          </p>
          <p className="font-display text-lg font-semibold">{customer.full_name}</p>
          <p className="text-xs text-muted-foreground">{customer.phone} · {customer.email}</p>
          <div className="mt-3 flex gap-2">
            <a
              href={`tel:${customer.phone.replace(/\s/g, "")}`}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
            >
              <Phone className="h-3 w-3" /> Call
            </a>
            <a
              href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
            >
              <MessageCircle className="h-3 w-3" /> WhatsApp
            </a>
            <a
              href={`mailto:${customer.email}`}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
            >
              <Mail className="h-3 w-3" /> Email
            </a>
          </div>
        </div>
      )}

      {/* Schedule */}
      {booking && (
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Payment schedule
            </p>
            <div className="text-xs font-medium tabular">
              {moneyCompact(totalPaid.toFixed(0))} / {moneyCompact(totalDue.toFixed(0))}
            </div>
          </div>
          <Progress value={pct} className="h-1.5 mb-4" />
          <div className="space-y-2">
            {stages.map((s) => {
              const status = effectiveStageStatus(s, now);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-md bg-surface px-3 py-2"
                >
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-xs font-semibold truncate">{s.stage_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Due {fmtDate(s.due_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right min-w-[70px]">
                      <p className="text-xs font-display font-semibold tabular">
                        {money(s.amount_due)}
                      </p>
                      <StatusPill
                        kind={
                          status === "PAID"
                            ? "success"
                            : status === "OVERDUE"
                              ? "danger"
                              : status === "PARTIAL"
                                ? "warning"
                                : "neutral"
                        }
                      >
                        {status}
                      </StatusPill>
                    </div>
                    {customer && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        title="Send email reminder"
                        onClick={() => {
                          if (!plot || !site || !customer) return;
                          const isPaid = status === "PAID";
                          const isOverdue = status === "OVERDUE" || (status === "PARTIAL" && new Date(s.due_date) < now);
                          
                          const subject = isPaid
                            ? `Payment Confirmation & Receipt - Plot ${plot.plot_number}`
                            : isOverdue
                              ? `URGENT: Installment Overdue for Plot ${plot.plot_number}`
                              : `Installment Reminder: Upcoming payment for Plot ${plot.plot_number}`;

                          const bodyText = isPaid
                            ? `Dear ${customer.full_name},\n\nWe are pleased to confirm receipt of your payment for stage "${s.stage_name}" of Plot ${plot.plot_number} at ${site.name}.\n\nStage: ${s.stage_name}\nAmount paid: ${money(s.paid_amount)} of ${money(s.amount_due)}\nDate of payment: ${s.paid_date ? fmtDate(s.paid_date) : fmtDate(now.toISOString())}\n\nThank you for choosing PropertyWala.\n\nBest regards,\n${state.session?.org_id ? state.organizations.find(o => o.id === state.session.org_id)?.name : "PropertyWala Team"}`
                            : isOverdue
                              ? `Dear ${customer.full_name},\n\nThis is an urgent notification that your payment for stage "${s.stage_name}" of Plot ${plot.plot_number} at ${site.name} is overdue.\n\nStage: ${s.stage_name}\nAmount due: ${money(new Decimal(s.amount_due).minus(s.paid_amount).toString())}\nOriginal due date: ${fmtDate(s.due_date)}\n\nPlease clear the outstanding dues as soon as possible.\n\nBest regards,\n${state.session?.org_id ? state.organizations.find(o => o.id === state.session.org_id)?.name : "PropertyWala Team"}`
                              : `Dear ${customer.full_name},\n\nThis is a friendly reminder of your upcoming installment for stage "${s.stage_name}" of Plot ${plot.plot_number} at ${site.name}.\n\nStage: ${s.stage_name}\nAmount due: ${money(new Decimal(s.amount_due).minus(s.paid_amount).toString())}\nDue date: ${fmtDate(s.due_date)}\n\nPlease make arrangements to clear this payment by the due date.\n\nBest regards,\n${state.session?.org_id ? state.organizations.find(o => o.id === state.session.org_id)?.name : "PropertyWala Team"}`;

                          setEmailDialog({
                            open: true,
                            recipientEmail: customer.email,
                            recipientName: customer.full_name,
                            subject,
                            bodyText,
                            stageId: s.id,
                          });
                        }}
                      >
                        <Mail className="h-4 w-4 text-muted-foreground hover:text-emerald" />
                      </Button>
                    )}
                    {status !== "PAID" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPayStageId(s.id);
                          setPayOpen(true);
                        }}
                      >
                        Record
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPayStageId(null);
                setPayOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Record transaction
            </Button>
            <AddInstallmentButton bookingId={booking.id} nextOrder={stages.length} />
          </div>
        </div>
      )}

      {/* Inquiries */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Customer Inquiries
          </p>
          <Button size="sm" variant="outline" onClick={() => setInqOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add inquiry
          </Button>
        </div>
        
        {inquiries.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No inquiries recorded for this plot.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {inquiries.map((inq) => (
              <div key={inq.id} className="rounded-lg border border-border/60 bg-surface px-3 py-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate">{inq.customer_name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{inq.phone}</p>
                  </div>
                  <span className="text-[9px] text-muted-foreground bg-white border px-1.5 py-0.5 rounded">
                    {fmtDate(inq.created_at)}
                  </span>
                </div>
                {inq.notes && (
                  <p className="mt-1.5 text-[11px] text-slate/75 italic border-t border-border/40 pt-1">
                    {inq.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toggleable Staff Handling & Audit Trail Section */}
      <div className="p-6 border-b border-border bg-surface/50">
        <button
          type="button"
          onClick={() => setShowStaffHandling((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate hover:text-gold transition-colors py-1 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-gold" />
            <span>Staff Handling & Action History</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase tracking-wider font-bold">
            <span>{showStaffHandling ? "Hide" : "Show"}</span>
            {showStaffHandling ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </div>
        </button>

        {showStaffHandling && (
          <div className="mt-4 pt-3 border-t border-border/60 space-y-4">
            {/* Sales & Handling Staff Summary */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                Staff In Charge & Sales
              </p>

              {/* Booked / Sold By Staff */}
              {booking && (
                <div className="rounded-lg bg-white border border-border p-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Booked / Sold By</p>
                    <p className="font-semibold text-slate mt-0.5">
                      {bookingActorLog ? bookingActorLog.actor_name : "Org Staff"}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Sales Staff
                  </span>
                </div>
              )}

              {/* Recent Payment Collectors */}
              {plotCollectors.length > 0 && (
                <div className="rounded-lg bg-white border border-border p-3 text-xs">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Payment Collectors</p>
                  <div className="space-y-1">
                    {plotCollectors.map((collectorName, i) => (
                      <div key={i} className="flex items-center justify-between text-slate">
                        <span className="font-medium">• {collectorName}</span>
                        <span className="text-[10px] text-muted-foreground">Recorded payments</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Plot Audit Action Trail */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                Plot Action History ({plotAuditLogs.length})
              </p>
              {plotAuditLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No audit records logged for this plot.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {plotAuditLogs.map((log) => (
                    <div key={log.id} className="rounded-lg border border-border/60 bg-white p-2.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate text-[11px]">{log.detail}</p>
                        <span className="text-[9px] font-mono text-muted-foreground shrink-0">{fmtDate(log.timestamp)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span>By: <strong className="text-slate font-medium">{log.actor_name}</strong></span>
                        <span>•</span>
                        <span className="uppercase tracking-wider">{log.action.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cashflow — all transactions tied to this plot */}
      <PlotCashflow plotId={plot.id} />


      {!booking && (
        <div className="p-6 border-b border-border">
          <p className="text-sm text-muted-foreground mb-3">This plot has no active booking.</p>
          <Button onClick={() => setBookOpen(true)} className="bg-gold hover:bg-gold/90 text-white">
            <Plus className="h-4 w-4" /> Book this plot
          </Button>
        </div>
      )}

      <RecordPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        stageId={payStageId}
        booking={booking ?? null}
        plot={plot}
        customer={customer ?? null}
        onDone={() => {
          setPayOpen(false);
          setPayStageId(null);
        }}
        recordPayment={recordPayment}
      />

      <BookPlotDialog
        open={bookOpen}
        onOpenChange={setBookOpen}
        plot={plot}
        siteName={site.name}
        onDone={() => setBookOpen(false)}
      />

      <AddInquiryDialog
        open={inqOpen}
        onOpenChange={setInqOpen}
        plotId={plot.id}
      />

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
                <Label htmlFor="plotEmailSubject" className="text-xs text-muted-foreground">Subject</Label>
                <Input
                  id="plotEmailSubject"
                  value={emailDialog.subject}
                  onChange={(e) =>
                    setEmailDialog({ ...emailDialog, subject: e.target.value })
                  }
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="plotEmailBody" className="text-xs text-muted-foreground">Message Body</Label>
                <Textarea
                  id="plotEmailBody"
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
                  if (emailDialog.stageId) {
                    state.sendReminder(emailDialog.stageId);
                  }
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
    </div>
  );
}

// Local record-payment mini dialog
import type { Booking, Customer, InstallmentStage, Plot } from "@/data/types";

function AddInquiryDialog({
  open,
  onOpenChange,
  plotId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  plotId: string;
}) {
  const createInquiry = useApp((s) => s.createInquiry);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (!name.trim()) return toast.error("Enter customer name");
    if (!phone.trim()) return toast.error("Enter phone number");
    createInquiry({
      plot_id: plotId,
      customer_name: name,
      phone: phone,
      notes: notes,
    });
    toast.success("Inquiry recorded");
    setName("");
    setPhone("");
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add customer inquiry</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Customer name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Phone number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Notes / Requirements</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-slate hover:bg-slate/90" onClick={submit}>Save inquiry</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddInstallmentButton({ bookingId, nextOrder }: { bookingId: string; nextOrder: number }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(`Installment ${nextOrder + 1}`);
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState(new Date().toISOString().slice(0, 10));

  const submit = () => {
    if (!amount || Number(amount) <= 0) return toast.error("Enter amount");
    const stage: InstallmentStage = {
      id: `stg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      booking_id: bookingId,
      stage_name: name,
      amount_due: new Decimal(amount).toFixed(0),
      due_date: due,
      paid_amount: "0",
      paid_date: null,
      status: "PENDING",
      sort_order: nextOrder,
    };
    useApp.setState((prev) => ({ schedule: [...prev.schedule, stage] }));
    toast.success("Installment added");
    setOpen(false);
    setAmount("");
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> Add installment
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add upcoming installment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Stage name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Due date</Label>
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-slate hover:bg-slate/90" onClick={submit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RecordPaymentDialog(props: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  stageId: string | null;
  booking: Booking | null;
  plot: Plot;
  customer: Customer | null;
  onDone: () => void;
  recordPayment: ReturnType<typeof useApp.getState>["recordPayment"];
}) {
  const { open, onOpenChange, stageId, booking, plot, customer, onDone, recordPayment } = props;
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"BANK" | "CASH" | "UPI" | "CHEQUE" | "CARD">("BANK");

  const submit = () => {
    if (!amount || Number(amount) <= 0) return toast.error("Enter a valid amount");
    const key = `pay-${stageId ?? plot.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const res = recordPayment({
      direction: "IN",
      type: "INSTALLMENT",
      party_name: customer?.full_name ?? "Buyer",
      amount,
      payment_mode: mode,
      transaction_date: nowISO(),
      booking_id: booking?.id,
      stage_id: stageId ?? undefined,
      plot_id: plot.id,
      customer_id: customer?.id,
      idempotency_key: key,
    });
    if (!res.ok) return toast.error(res.reason);
    toast.success(`Recorded ${money(amount)}`);
    setAmount("");
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
              autoFocus
            />
          </div>
          <div>
            <Label>Payment mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BANK">Bank transfer</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-slate hover:bg-slate/90" onClick={submit}>
            Save payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlotCashflow({ plotId }: { plotId: string }) {
  const txs = useApp((s) =>
    s.transactions
      .filter((t) => t.plot_id === plotId)
      .sort((a, b) => (a.transaction_date < b.transaction_date ? 1 : -1)),
  );
  const totalIn = txs
    .filter((t) => t.direction === "IN")
    .reduce((a, t) => a.plus(t.amount), new Decimal(0));
  const totalOut = txs
    .filter((t) => t.direction === "OUT")
    .reduce((a, t) => a.plus(t.amount), new Decimal(0));
  const net = totalIn.minus(totalOut);

  return (
    <div className="p-6 border-b border-border">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Cashflow
        </p>
        <p className="text-[10px] text-muted-foreground">{txs.length} transaction{txs.length === 1 ? "" : "s"}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-md bg-surface px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">In</p>
          <p className="font-display text-sm font-semibold text-emerald-700 tabular">
            {moneyCompact(totalIn.toFixed(0))}
          </p>
        </div>
        <div className="rounded-md bg-surface px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Out</p>
          <p className="font-display text-sm font-semibold text-rose-700 tabular">
            {moneyCompact(totalOut.toFixed(0))}
          </p>
        </div>
        <div className="rounded-md bg-surface px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Net</p>
          <p className="font-display text-sm font-semibold tabular">
            {moneyCompact(net.toFixed(0))}
          </p>
        </div>
      </div>
      {txs.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No cashflow yet for this plot.</p>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-auto">
          {txs.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-xs"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={
                      "inline-block h-1.5 w-1.5 rounded-full " +
                      (t.direction === "IN" ? "bg-emerald-600" : "bg-rose-600")
                    }
                  />
                  <p className="font-semibold truncate">{t.party_name}</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {t.type.replace(/_/g, " ")} · {t.payment_mode} · {fmtDate(t.transaction_date)}
                </p>
              </div>
              <p
                className={
                  "font-display text-sm font-semibold tabular " +
                  (t.direction === "IN" ? "text-emerald-700" : "text-rose-700")
                }
              >
                {t.direction === "IN" ? "+" : "−"}
                {money(t.amount)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
