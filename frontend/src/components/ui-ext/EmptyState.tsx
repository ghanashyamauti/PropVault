import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

interface Props {
  title: string;
  description: string;
  icon: ReactNode;
  cta?: { label: string; to: string };
  secondary?: { label: string; onClick: () => void };
}

export function EmptyState({ title, description, icon, cta, secondary }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-white p-16 text-center">
      <div className="mx-auto size-14 rounded-full bg-secondary grid place-items-center text-slate/50 mb-4">
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold text-slate">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      <div className="mt-6 flex items-center justify-center gap-3">
        {cta && (
          <Link
            to={cta.to}
            className="inline-flex items-center rounded-md bg-slate text-white px-4 py-2 text-sm font-medium hover:bg-slate/90"
          >
            {cta.label}
          </Link>
        )}
        {secondary && (
          <button
            onClick={secondary.onClick}
            className="inline-flex items-center rounded-md border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            {secondary.label}
          </button>
        )}
      </div>
    </div>
  );
}
