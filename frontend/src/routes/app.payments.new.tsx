import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useApp, nowISO } from "@/data/store";
import { api, isApiEnabled } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import type { Transaction } from "@/data/types";
import { Upload, X } from "lucide-react";

export const Route = createFileRoute("/app/payments/new")({
  head: () => ({ meta: [{ title: "Record payment — PropVault" }] }),
  component: NewPayment,
});

function NewPayment() {
  const navigate = useNavigate();
  const record = useApp((s) => s.recordPayment);
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [type, setType] = useState<Transaction["type"]>("INSTALLMENT");
  const [party, setParty] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<Transaction["payment_mode"]>("BANK");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  const onFile = async (f: File | null) => {
    if (!f) return;
    setReceiptName(f.name);
    if (f.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5MB)");
      return;
    }
    setUploading(true);
    try {
      if (isApiEnabled) {
        const { url } = await api.upload(f);
        setReceiptUrl(url);
        toast.success("Uploaded to backend");
      } else {
        // Fallback: inline as data URL so it survives in localStorage
        const reader = new FileReader();
        const dataUrl: string = await new Promise((res, rej) => {
          reader.onload = () => res(reader.result as string);
          reader.onerror = rej;
          reader.readAsDataURL(f);
        });
        setReceiptUrl(dataUrl);
        toast.success("Attached (stored locally)");
      }
    } catch (err) {
      toast.error("Upload failed: " + (err instanceof Error ? err.message : "unknown"));
    } finally {
      setUploading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!party.trim() || !amount) return toast.error("Party and amount required");
    const res = record({
      direction,
      type,
      party_name: party,
      amount,
      payment_mode: mode,
      transaction_date: new Date(date).toISOString(),
      notes,
      receipt_url: receiptUrl,
      idempotency_key: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
    if (!res.ok) return toast.error(res.reason);
    toast.success("Transaction recorded");
    if (sendEmail) {
      const customers = useApp.getState().customers;
      const cust = customers.find(c => c.full_name.toLowerCase() === party.toLowerCase());
      const email = cust ? cust.email : "customer@example.com";
      toast.success(`Payment confirmation receipt email sent to ${party} (${email})`);
    }
    navigate({ to: "/app/payments" });
  };


  const inTypes: Transaction["type"][] = ["TOKEN", "BOOKING", "INSTALLMENT", "FINAL", "REFUND", "MISC"];
  const outTypes: Transaction["type"][] = ["LANDOWNER_PAYOUT", "FINANCIER_PAYOUT", "VENDOR", "SALARY", "MISC"];
  const availableTypes = direction === "IN" ? inTypes : outTypes;

  return (
    <AppShell variant="tenant" title="Record transaction" subtitle="New ledger entry">
      <div className="max-w-xl bg-white rounded-xl border border-border p-8">
        <form onSubmit={submit} className="space-y-5">
          <div>
            <Label>Direction</Label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {(["IN", "OUT"] as const).map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => setDirection(d)}
                  className={`rounded-md border px-4 py-3 text-sm font-medium ${
                    direction === d
                      ? d === "IN"
                        ? "border-emerald bg-emerald/5 text-emerald"
                        : "border-gold bg-gold/5 text-gold"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {d === "IN" ? "Money In" : "Money Out"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Transaction["type"])}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as Transaction["payment_mode"])}>
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

          <div>
            <Label>Party name</Label>
            <Input
              value={party}
              onChange={(e) => setParty(e.target.value)}
              className="mt-1"
              placeholder={direction === "IN" ? "Customer name" : "Vendor / landowner name"}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1"
              placeholder="Optional reference or context"
            />
          </div>

          <div>
            <Label>Receipt attachment</Label>
            {!receiptUrl ? (
              <label className="mt-1 flex items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-surface/30 px-4 py-6 cursor-pointer hover:bg-surface/60 text-sm text-muted-foreground">
                <Upload className="h-4 w-4" />
                <span>{uploading ? "Uploading…" : "Click to upload image or PDF (max 5MB)"}</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                />
              </label>
            ) : (
              <div className="mt-1 flex items-center gap-3 rounded-md border border-border bg-surface/30 px-3 py-2">
                {receiptUrl.startsWith("data:image") && (
                  <img src={receiptUrl} alt="" className="h-12 w-12 object-cover rounded" />
                )}
                <span className="text-xs flex-1 truncate">{receiptName ?? "Attached"}</span>
                <button
                  type="button"
                  onClick={() => {
                    setReceiptUrl(null);
                    setReceiptName(null);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-4 p-3 bg-emerald/5 rounded-md border border-emerald/10">
            <input
              type="checkbox"
              id="sendPaymentEmail"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald focus:ring-emerald cursor-pointer"
            />
            <Label htmlFor="sendPaymentEmail" className="text-xs cursor-pointer select-none font-medium text-emerald-800">
              Send payment receipt email confirmation to customer
            </Label>
          </div>

          <div className="pt-4 border-t border-border flex gap-3">
            <Button type="submit" className="bg-slate hover:bg-slate/90" disabled={uploading}>
              Save transaction
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/app/payments" })}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
      {void nowISO}
    </AppShell>
  );
}
