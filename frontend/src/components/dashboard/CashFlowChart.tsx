interface Props {
  labels: string[];
  inflow: number[];
  outflow: number[];
}

export function CashFlowChart({ labels, inflow, outflow }: Props) {
  const all = [...inflow, ...outflow];
  const max = Math.max(...all, 1);
  const w = 600;
  const h = 220;
  const pad = { l: 40, r: 10, t: 10, b: 24 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const xStep = innerW / Math.max(1, labels.length - 1);

  const pathFor = (data: number[]) => {
    const pts = data.map((v, i) => {
      const x = pad.l + i * xStep;
      const y = pad.t + innerH - (v / max) * innerH;
      return [x, y] as const;
    });
    if (pts.length === 0) return { line: "", area: "" };
    const line = pts
      .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
      .join(" ");
    const [lx] = pts[pts.length - 1];
    const [fx] = pts[0];
    const area = `${line} L${lx},${pad.t + innerH} L${fx},${pad.t + innerH} Z`;
    return { line, area };
  };

  const inP = pathFor(inflow);
  const outP = pathFor(outflow);

  // Y ticks
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => {
    const val = (max * i) / ticks;
    const y = pad.t + innerH - (val / max) * innerH;
    return { val, y };
  });

  const inrCompact = (n: number) =>
    n >= 10000000
      ? `₹${(n / 10000000).toFixed(1)}Cr`
      : n >= 100000
        ? `₹${(n / 100000).toFixed(0)}L`
        : `₹${(n / 1000).toFixed(0)}k`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-64">
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={t.y}
              y2={t.y}
              stroke="#0f172a"
              strokeOpacity={0.05}
            />
            <text
              x={pad.l - 6}
              y={t.y + 3}
              textAnchor="end"
              fontSize={9}
              fill="#94a3b8"
              className="tabular"
            >
              {inrCompact(t.val)}
            </text>
          </g>
        ))}

        {/* outflow area (behind) */}
        <path d={outP.area} fill="#92400e" fillOpacity={0.08} />
        <path d={outP.line} fill="none" stroke="#92400e" strokeOpacity={0.5} strokeWidth={1.5} />

        {/* inflow area */}
        <path d={inP.area} fill="#0f172a" fillOpacity={0.06} />
        <path d={inP.line} fill="none" stroke="#0f172a" strokeWidth={2} />

        {/* points */}
        {inflow.map((v, i) => {
          const x = pad.l + i * xStep;
          const y = pad.t + innerH - (v / max) * innerH;
          return <circle key={i} cx={x} cy={y} r={3} fill="#0f172a" />;
        })}

        {/* x labels */}
        {labels.map((l, i) => (
          <text
            key={l + i}
            x={pad.l + i * xStep}
            y={h - 6}
            textAnchor="middle"
            fontSize={10}
            fill="#94a3b8"
            className="uppercase tracking-wider"
          >
            {l}
          </text>
        ))}
      </svg>
    </div>
  );
}
