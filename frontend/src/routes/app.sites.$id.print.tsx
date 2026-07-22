import { createFileRoute, useParams } from "@tanstack/react-router";
import { PlanRenderer } from "@/components/plan/PlanRenderer";
import { useApp } from "@/data/store";
import { orgScope, fmtDate } from "@/data/selectors";
import { downloadMasterPlanPDF } from "@/lib/pdf-export";
import { FileDown } from "lucide-react";
import { useRef } from "react";

export const Route = createFileRoute("/app/sites/$id/print")({
  head: () => ({
    meta: [
      { title: "Master plan — Print view" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrintPlan,
});

function PrintPlan() {
  const { id } = useParams({ from: "/app/sites/$id/print" });
  const site = useApp((s) => s.sites.find((x) => x.id === id));
  const plots = useApp((s) => orgScope(s.plots, s.session?.org_id).filter((p) => p.site_id === id));
  const planRef = useRef<HTMLDivElement>(null);
  if (!site) return <div className="p-8">Site not found</div>;

  const onPdf = () => {
    const svg = planRef.current?.querySelector("svg");
    downloadMasterPlanPDF(site, plots, svg ?? null);
  };

  return (
    <div className="min-h-screen bg-parchment p-8 print:p-4">
      <style>{`
        @media print {
          @page { size: A3 landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="max-w-[1400px] mx-auto">
        <header className="flex items-end justify-between border-b-2 border-parchment-ink/40 pb-4 mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-parchment-ink/60">
              Master Plan
            </p>
            <h1 className="font-display text-4xl italic font-semibold text-parchment-ink">
              {site.name}
            </h1>
            <p className="text-sm text-parchment-ink/70 mt-1">{site.address}</p>
          </div>
          <div className="text-right text-xs text-parchment-ink/70">
            <p>Drawn {fmtDate(site.created_at)}</p>
            <p className="mt-1">{plots.length} plots · unit {site.area_unit}</p>
            <p className="mt-1 font-display italic text-parchment-ink">PropertyWala</p>
          </div>
        </header>

        <div ref={planRef} className="h-[800px] bg-parchment border border-parchment-ink/20">
          <PlanRenderer layout={site.layout} plots={plots} interactive={false} />
        </div>


        <footer className="mt-6 pt-4 border-t border-parchment-ink/40 grid grid-cols-4 gap-6 text-xs text-parchment-ink/80">
          <div>
            <p className="uppercase tracking-widest text-[10px] mb-2 font-semibold">Legend</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm border border-slate-400 bg-white" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm border border-blue-700 bg-blue-100" />
                <span>Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm border border-parchment-ink bg-amber-200" />
                <span>Sold</span>
              </div>
            </div>
          </div>
          <div>
            <p className="uppercase tracking-widest text-[10px] mb-2 font-semibold">
              Scale
            </p>
            <p>1 grid = 5 meters</p>
          </div>
          <div>
            <p className="uppercase tracking-widest text-[10px] mb-2 font-semibold">
              North
            </p>
            <p>See compass rose on plan</p>
          </div>
          <div className="text-right">
            <p className="font-display italic text-lg text-parchment-ink">
              PropertyWala
            </p>
            <p className="text-[10px] uppercase tracking-widest">
              Developer Edition
            </p>
          </div>
        </footer>

        <div className="no-print mt-6 flex gap-3">
          <button
            onClick={() => window.print()}
            className="rounded-md bg-parchment-ink text-parchment px-4 py-2 text-sm font-medium"
          >
            Print this plan
          </button>
          <button
            onClick={onPdf}
            className="rounded-md border border-parchment-ink text-parchment-ink px-4 py-2 text-sm font-medium inline-flex items-center gap-2 hover:bg-parchment-ink hover:text-parchment"
          >
            <FileDown className="h-4 w-4" /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
