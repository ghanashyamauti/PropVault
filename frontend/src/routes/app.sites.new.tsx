import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/data/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/sites/new")({
  head: () => ({ meta: [{ title: "New site — PropVault" }] }),
  component: NewSite,
});

function NewSite() {
  const navigate = useNavigate();
  const create = useApp((s) => s.createSite);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [unit, setUnit] = useState<"SQFT" | "SQM">("SQFT");
  const [photo, setPhoto] = useState<string | null>(null);

  const onPhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Site name is required");
    const site = create({ name, address, area_unit: unit, photo_url: photo });
    toast.success(`Created ${site.name}`);
    navigate({ to: "/app/sites/$id", params: { id: site.id } });
  };

  return (
    <AppShell variant="tenant" title="New site" subtitle="Sites">
      <div className="max-w-2xl">
        <form onSubmit={submit} className="bg-white rounded-xl border border-border p-8 space-y-6">
          <div>
            <Label htmlFor="name">Site name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Green Valley Phase 2"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
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
              <label className="flex items-center gap-3 rounded-md border border-border px-4 py-3 cursor-pointer has-[[data-state=checked]]:border-slate has-[[data-state=checked]]:bg-slate/5">
                <RadioGroupItem value="SQFT" id="sqft" />
                <div>
                  <p className="text-sm font-medium">Square feet</p>
                  <p className="text-xs text-muted-foreground">Common in India</p>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-md border border-border px-4 py-3 cursor-pointer has-[[data-state=checked]]:border-slate has-[[data-state=checked]]:bg-slate/5">
                <RadioGroupItem value="SQM" id="sqm" />
                <div>
                  <p className="text-sm font-medium">Square meters</p>
                  <p className="text-xs text-muted-foreground">Metric standard</p>
                </div>
              </label>
            </RadioGroup>
          </div>
          <div>
            <Label htmlFor="photo">Site photo</Label>
            <div className="mt-1 flex items-center gap-4">
              {photo ? (
                <img src={photo} alt="Site" className="h-20 w-32 object-cover rounded-md border border-border" />
              ) : (
                <div className="h-20 w-32 rounded-md bg-parchment border border-border grid place-items-center text-[10px] text-muted-foreground uppercase tracking-widest">
                  No photo
                </div>
              )}
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPhoto(f);
                }}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="submit" className="bg-slate hover:bg-slate/90">Create site</Button>
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/app/sites" })}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
