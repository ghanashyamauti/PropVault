import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useApp, today } from "@/data/store";
import {
  effectiveStageStatus,
  fmtDate,
  money,
  moneyCompact,
  plotCollected,
} from "@/data/selectors";
import { StatusPill } from "@/components/ui-ext/StatusPill";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Printer, Phone, Mail, MessageCircle, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCustomerStatementPDF } from "@/lib/pdf-export";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Decimal from "decimal.js";

export const Route = createFileRoute("/app/customers/$id")({
  head: () => ({ meta: [{ title: "Customer — PropVault" }] }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = useParams({ from: "/app/customers/$id" });
  const state = useApp();
  const now = today(state);
  const customer = state.customers.find((c) => c.id === id);
  const booking = state.bookings.find((b) => b.customer_id === id && !b.cancelled_at);
  const stages = booking
    ? state.schedule.filter((s) => s.booking_id === booking.id).sort((a, b) => a.sort_order - b.sort_order)
    : [];
  const plot = booking ? state.plots.find((p) => p.id === booking.plot_id) : null;
  const site = plot ? state.sites.find((s) => s.id === plot.site_id) : null;
  const paid = booking ? plotCollected(booking.plot_id, state) : "0";
  const pct = booking && Number(booking.total_sale_price) > 0
    ? Math.round((Number(paid) / Number(booking.total_sale_price)) * 100)
    : 0;

  const transactions = state.transactions.filter(
    (t) => t.customer_id === id && t.direction === "IN",
  );

  const [emailDialog, setEmailDialog] = useState<{
    open: boolean;
    recipientEmail: string;
    recipientName: string;
    subject: string;
    bodyText: string;
    stageId?: string;
  } | null>(null);

  if (!customer) return <AppShell variant="tenant" title="Not found">–</AppShell>;

  return (
    <AppShell
      variant="tenant"
      title={customer.full_name}
      subtitle="Customer statement"
      actions={
        <>
          <Button variant="outline" asChild>
            <Link to="/app/customers">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              downloadCustomerStatementPDF({
                customer,
                booking: booking ?? null,
                plot: plot ?? null,
                site: site ?? null,
                stages,
                transactions,
                paid,
              })
            }
          >
            <FileDown className="h-4 w-4" /> Download PDF
          </Button>
          <Button className="bg-slate hover:bg-slate/90" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </>
      }
    >
      <div className="max-w-4xl bg-white rounded-xl border border-border p-10 print:p-0 print:border-0">
        <div className="flex items-start justify-between border-b border-border pb-6 mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Statement of Account
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold">{customer.full_name}</h1>
            <div className="mt-3 text-sm text-muted-foreground flex flex-wrap gap-3">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {customer.phone}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> {customer.email}
              </span>
              <a
                href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-emerald hover:underline"
              >
                <MessageCircle className="h-3 w-3" /> WhatsApp
              </a>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p className="font-display italic text-lg text-slate">PropertyWala</p>
            <p>Statement generated {fmtDate(now.toISOString())}</p>
          </div>
        </div>

        {booking && plot && site && (
          <>
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Site</p>
                <p className="text-sm font-semibold mt-0.5">{site.name}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Plot</p>
                <p className="text-sm font-semibold mt-0.5">
                  {plot.plot_number} · {plot.area} {site.area_unit === "SQFT" ? "sq ft" : "sq m"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Booking date
                </p>
                <p className="text-sm font-semibold mt-0.5">{fmtDate(booking.booking_date)}</p>
              </div>
            </div>

            <div className="rounded-md bg-parchment p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-parchment-ink/60">
                    Paid so far
                  </p>
                  <p className="font-display text-3xl font-semibold text-parchment-ink tabular">
                    {money(paid)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-parchment-ink/60">
                    Total sale
                  </p>
                  <p className="font-display text-3xl font-semibold text-parchment-ink tabular">
                    {money(booking.total_sale_price)}
                  </p>
                </div>
              </div>
              <Progress value={pct} className="mt-4 h-2" />
              <p className="mt-2 text-xs text-parchment-ink/70">{pct}% completed</p>
            </div>

            <h3 className="font-display text-lg font-semibold mb-3">Payment schedule</h3>
            <table className="w-full text-sm mb-8 border-collapse">
              <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 text-left font-semibold">Stage</th>
                  <th className="py-2 text-left font-semibold">Due</th>
                  <th className="py-2 text-right font-semibold">Amount</th>
                  <th className="py-2 text-right font-semibold">Paid</th>
                  <th className="py-2 font-semibold">Status</th>
                  <th className="py-2 text-right font-semibold print:hidden">Action</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((s) => {
                  const st = effectiveStageStatus(s, now);
                  return (
                    <tr key={s.id} className="border-b border-border">
                      <td className="py-3">{s.stage_name}</td>
                      <td className="py-3 text-muted-foreground">{fmtDate(s.due_date)}</td>
                      <td className="py-3 text-right font-display tabular">{money(s.amount_due)}</td>
                      <td className="py-3 text-right tabular">{money(s.paid_amount)}</td>
                      <td className="py-3">
                        <StatusPill
                          kind={
                            st === "PAID"
                              ? "success"
                              : st === "OVERDUE"
                                ? "danger"
                                : st === "PARTIAL"
                                  ? "warning"
                                  : "neutral"
                          }
                        >
                          {st}
                        </StatusPill>
                      </td>
                      <td className="py-3 text-right print:hidden">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          title="Send email notification"
                          onClick={() => {
                            if (!plot || !site) return;
                            const isPaid = st === "PAID";
                            const isOverdue = st === "OVERDUE" || (st === "PARTIAL" && new Date(s.due_date) < now);
                            
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
                          <Mail className="h-4 w-4 text-muted-foreground hover:text-emerald cursor-pointer" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {transactions.length > 0 && (
              <>
                <h3 className="font-display text-lg font-semibold mb-3">Transactions</h3>
                <table className="w-full text-sm border-collapse">
                  <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="py-2 text-left font-semibold">Date</th>
                      <th className="py-2 text-left font-semibold">Reference</th>
                      <th className="py-2 text-left font-semibold">Mode</th>
                      <th className="py-2 text-right font-semibold">Amount</th>
                      <th className="py-2 text-right font-semibold print:hidden">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.id} className="border-b border-border">
                        <td className="py-3">{fmtDate(t.transaction_date)}</td>
                        <td className="py-3 text-muted-foreground text-xs">{t.type}</td>
                        <td className="py-3 text-xs">{t.payment_mode}</td>
                        <td className="py-3 text-right font-display tabular">
                          {money(t.amount)}
                        </td>
                        <td className="py-3 text-right print:hidden">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            title="Send email receipt"
                            onClick={() => {
                              const subject = `Payment Confirmation & Receipt - Plot ${plot?.plot_number || "Booking"}`;
                              const bodyText = `Dear ${customer.full_name},\n\nWe are pleased to confirm receipt of your payment.\n\nPayment Mode: ${t.payment_mode}\nAmount received: ${money(t.amount)}\nDate of payment: ${fmtDate(t.transaction_date)}\nReference: ${t.type}\nNotes: ${t.notes || "—"}\n\nThank you for choosing PropertyWala.\n\nBest regards,\n${state.session?.org_id ? state.organizations.find(o => o.id === state.session.org_id)?.name : "PropertyWala Team"}`;

                              setEmailDialog({
                                open: true,
                                recipientEmail: customer.email,
                                recipientName: customer.full_name,
                                subject,
                                bodyText,
                              });
                            }}
                          >
                            <Mail className="h-4 w-4 text-muted-foreground hover:text-emerald cursor-pointer" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}

        {!booking && (
          <p className="text-sm text-muted-foreground">
            This customer does not have an active booking.
          </p>
        )}
      </div>

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
    </AppShell>
  );
}
// silence unused import warnings
void moneyCompact;
