import { useMemo, useState } from "react";
import { useApp, nowISO } from "@/data/store";
import type { Plot } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { money, moneyCompact, orgScope } from "@/data/selectors";
import { toast } from "sonner";
import Decimal from "decimal.js";
import { Check, ChevronRight } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  plot: Plot;
  siteName: string;
  onDone: () => void;
}

const stagePreset = [
  { name: "Token", pct: 6 },
  { name: "Booking Amount", pct: 24 },
  { name: "1st Installment", pct: 18 },
  { name: "2nd Installment", pct: 18 },
  { name: "Final Payment", pct: 34 },
];

export function BookPlotDialog({ open, onOpenChange, plot, siteName, onDone }: Props) {
  const [step, setStep] = useState(0);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [price, setPrice] = useState(plot.price);
  const [sendEmail, setSendEmail] = useState(true);

  const orgId = useApp((s) => s.session?.org_id);
  const customers = useApp((s) => orgScope(s.customers, orgId));
  const createCustomer = useApp((s) => s.createCustomer);
  const bookPlot = useApp((s) => s.bookPlot);

  const stages = useMemo(() => {
    const d = new Decimal(price || 0);
    return stagePreset.map((st, i) => ({
      name: st.name,
      amount: d.mul(st.pct).div(100).toFixed(0),
      due_date: new Date(Date.now() + i * 45 * 86400000).toISOString(),
    }));
  }, [price]);

  const stepsMeta = ["Plot", "Customer", "Pricing", "Schedule"];

  const commit = () => {
    let cid = customerId;
    let emailToUse = newEmail;
    let nameToUse = newName;
    if (!cid) {
      if (!newName.trim() || !newPhone.trim())
        return toast.error("Name and phone required");
      const c = createCustomer({
        full_name: newName,
        phone: newPhone,
        email: newEmail,
      });
      cid = c.id;
    } else {
      const existingCust = customers.find(x => x.id === cid);
      if (existingCust) {
        emailToUse = existingCust.email;
        nameToUse = existingCust.full_name;
      }
    }
    bookPlot({
      plot_id: plot.id,
      customer_id: cid,
      total_sale_price: price,
      stages,
    });
    toast.success("Plot booked");
    if (sendEmail) {
      toast.success(`Booking confirmation & schedule email sent to ${nameToUse || "Customer"} (${emailToUse || "customer@example.com"})`);
    }
    onDone();
    setStep(0);
    setCustomerId(null);
    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setSendEmail(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Book plot {plot.plot_number}</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-4">
          {stepsMeta.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-6 w-6 rounded-full text-[10px] font-semibold grid place-items-center ${
                  i < step
                    ? "bg-emerald text-white"
                    : i === step
                      ? "bg-slate text-white"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span
                className={`text-xs ${i === step ? "font-semibold text-slate" : "text-muted-foreground"}`}
              >
                {s}
              </span>
              {i < stepsMeta.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <div className="min-h-[240px]">
          {step === 0 && (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Site:</span> {siteName}</p>
              <p><span className="text-muted-foreground">Plot:</span> {plot.plot_number}</p>
              <p><span className="text-muted-foreground">Size:</span> {plot.length} × {plot.width} ({plot.area})</p>
              <p><span className="text-muted-foreground">Facing:</span> {plot.facing}</p>
              <p><span className="text-muted-foreground">Base price:</span> {money(plot.price)}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Existing customer</Label>
                <Select
                  value={customerId ?? ""}
                  onValueChange={(v) => {
                    setCustomerId(v || null);
                    setNewName("");
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select an existing customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name} — {c.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative py-2 text-center">
                <div className="absolute inset-0 top-1/2 border-t border-border" />
                <span className="relative bg-white px-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                  or add new
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Full name</Label>
                  <Input
                    className="mt-1"
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      setCustomerId(null);
                    }}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    className="mt-1"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Email</Label>
                  <Input
                    className="mt-1"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Total sale price</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Adjust price for negotiated discounts. Schedule preview updates automatically.
              </p>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-surface/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Stage</th>
                      <th className="px-4 py-2 text-left font-semibold">Due</th>
                      <th className="px-4 py-2 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stages.map((s, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2">{s.name}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {new Date(s.due_date).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4 py-2 text-right font-display font-semibold tabular">
                          {money(s.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-surface/50">
                    <tr>
                      <td colSpan={2} className="px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground">
                        Total
                      </td>
                      <td className="px-4 py-2 text-right font-display font-semibold tabular">
                        {money(price)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex items-center gap-2 mt-4 p-3 bg-emerald/5 rounded-md border border-emerald/10">
                <input
                  type="checkbox"
                  id="sendBookingEmail"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald focus:ring-emerald cursor-pointer"
                />
                <Label htmlFor="sendBookingEmail" className="text-xs cursor-pointer select-none font-medium text-emerald-800">
                  Send booking confirmation & installment schedule email to customer
                </Label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < 3 && (
            <Button className="bg-slate hover:bg-slate/90" onClick={() => setStep(step + 1)}>
              Continue
            </Button>
          )}
          {step === 3 && (
            <Button className="bg-gold hover:bg-gold/90 text-white" onClick={commit}>
              Confirm booking
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
// silence unused
void nowISO;
void moneyCompact;
