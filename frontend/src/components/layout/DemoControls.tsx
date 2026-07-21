import { useState } from "react";
import { useApp } from "@/data/store";
import { Beaker, RotateCcw, FastForward, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function DemoControls() {
  const [open, setOpen] = useState(false);
  const advance = useApp((s) => s.advanceClock);
  const reseed = useApp((s) => s.reseed);
  const loadEmpty = useApp((s) => s.loadEmptyOrg);
  const offset = useApp((s) => s.clockOffsetDays);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-slate text-white px-4 py-2.5 text-xs font-medium shadow-lg hover:bg-slate/90 transition-colors"
        >
          <Beaker className="h-3.5 w-3.5" />
          Demo controls
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-72 rounded-xl border border-border bg-white shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Demo controls
              </p>
              <p className="text-sm font-medium">
                Clock offset: {offset > 0 ? `+${offset}` : offset} days
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-slate text-xs"
            >
              Close
            </button>
          </div>
          <div className="p-3 space-y-1.5">
            <button
              onClick={() => {
                advance(30);
                toast.success("Jumped 30 days forward");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium hover:bg-secondary transition-colors"
            >
              <FastForward className="h-3.5 w-3.5" />
              Jump 30 days forward
            </button>
            <button
              onClick={() => {
                advance(-offset);
                toast.success("Clock reset to today");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium hover:bg-secondary transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset clock to today
            </button>
            <button
              onClick={() => {
                reseed();
                toast.success("Data reseeded to defaults");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium hover:bg-secondary transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Reseed sample data
            </button>
            <button
              onClick={() => {
                if (confirm("Clear your org's data? Cannot be undone in demo.")) {
                  loadEmpty();
                  toast.success("Loaded empty organization");
                }
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium hover:bg-secondary transition-colors text-destructive"
            >
              Load empty organization
            </button>
          </div>
          <div className="px-4 py-3 border-t border-border">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              This is a frontend-only demo. All data lives in your browser and
              persists across reloads.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
