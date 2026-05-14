export type ScoreSummaryEntry = {
  domain: string;
  components: Array<{
    component: string;
    overallAvg: number | null;
    byPeriod: Record<string, number | null>;
  }>;
};

const DOMAIN_THEME: Record<string, { bg: string; header: string; light: string; text: string }> = {
  Structural: { bg: "#eff6ff", header: "#1d4ed8", light: "#dbeafe", text: "#1e3a5f" },
  Behavioural: { bg: "#fffbeb", header: "#b45309", light: "#fef3c7", text: "#451a03" },
  "Enabling Environment": { bg: "#f0fdf4", header: "#047857", light: "#dcfce7", text: "#052e16" },
  Relational: { bg: "#faf5ff", header: "#7c3aed", light: "#ede9fe", text: "#2e1065" },
};

const FALLBACK_THEME = { bg: "#f1f5f9", header: "#475569", light: "#e2e8f0", text: "#1e293b" };

function scoreColor(v: number | null): string {
  if (v === null) return "#cbd5e1";
  if (v < 1.75) return "#ef4444";
  if (v < 2.5) return "#f97316";
  if (v < 3.25) return "#eab308";
  return "#22c55e";
}

function scoreLabel(v: number | null): string {
  if (v === null) return "No data";
  if (v < 1.75) return "Reactive";
  if (v < 2.5) return "Emerging";
  if (v < 3.25) return "Transitioning";
  return "Proactive";
}

function x(n: number) { return Math.round(n); }

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// Truncate label to fit within maxChars
function trunc(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export function generateMsrInfographic(
  scoreSummary: ScoreSummaryEntry[],
  title?: string
): string {
  const W = 1200;
  const HDR_H = 90;
  const FTR_H = 54;
  const GRID_PAD = 20;
  const INNER_PAD = 20;
  const BOX_GAP = 14;

  const gridW = W - GRID_PAD * 2;
  const gridH = 900 - HDR_H - FTR_H - GRID_PAD * 3;
  const BOX_W = (gridW - BOX_GAP) / 2;
  const BOX_H = (gridH - BOX_GAP) / 2;

  const H = HDR_H + GRID_PAD * 3 + gridH + FTR_H;

  const p: string[] = [];

  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="system-ui,-apple-system,Helvetica Neue,Arial,sans-serif">`);

  // — Background
  p.push(`<rect width="${W}" height="${H}" fill="#f1f5f9"/>`);

  // — Header
  p.push(`<rect x="0" y="0" width="${W}" height="${HDR_H}" fill="#0f172a"/>`);
  p.push(`<text x="28" y="36" fill="#f8fafc" font-size="22" font-weight="700" letter-spacing="-0.3">Market System Resilience (MSR) Assessment</text>`);
  const subtitle = title ? escXml(title) : "Scores reflect component averages across all selected indicators and periods";
  p.push(`<text x="28" y="60" fill="#94a3b8" font-size="13">${subtitle}</text>`);
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  p.push(`<text x="${W - 24}" y="60" fill="#64748b" font-size="12" text-anchor="end">${dateStr}</text>`);

  // Score scale pill in header
  const pillX = W - 250;
  p.push(`<text x="${pillX}" y="78" fill="#475569" font-size="10.5" text-anchor="start">Scale: 1.0</text>`);
  const gradW = 160;
  const gpx = pillX + 40;
  p.push(`<defs><linearGradient id="scaleGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#ef4444"/><stop offset="33%" stop-color="#f97316"/><stop offset="66%" stop-color="#eab308"/><stop offset="100%" stop-color="#22c55e"/></linearGradient></defs>`);
  p.push(`<rect x="${gpx}" y="${HDR_H - 18}" width="${gradW}" height="8" rx="4" fill="url(#scaleGrad)"/>`);
  p.push(`<text x="${gpx + gradW + 6}" y="78" fill="#475569" font-size="10.5">4.0</text>`);

  // — 4 domain boxes
  const domains = scoreSummary.slice(0, 4);

  domains.forEach((domain, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = GRID_PAD + col * (BOX_W + BOX_GAP);
    const by = HDR_H + GRID_PAD + row * (BOX_H + BOX_GAP);
    const theme = DOMAIN_THEME[domain.domain] ?? FALLBACK_THEME;

    // Box shadow (simulated with offset rect)
    p.push(`<rect x="${x(bx + 2)}" y="${x(by + 3)}" width="${x(BOX_W)}" height="${x(BOX_H)}" rx="10" fill="#cbd5e1" opacity="0.45"/>`);
    // Box body
    p.push(`<rect x="${x(bx)}" y="${x(by)}" width="${x(BOX_W)}" height="${x(BOX_H)}" rx="10" fill="${theme.bg}" stroke="${theme.light}" stroke-width="1.5"/>`);

    // Domain header strip
    const HDR = 42;
    p.push(`<rect x="${x(bx)}" y="${x(by)}" width="${x(BOX_W)}" height="${HDR}" rx="10" fill="${theme.header}"/>`);
    p.push(`<rect x="${x(bx)}" y="${x(by + HDR - 10)}" width="${x(BOX_W)}" height="10" fill="${theme.header}"/>`);
    p.push(`<text x="${x(bx + INNER_PAD)}" y="${x(by + 27)}" fill="white" font-size="14" font-weight="700" letter-spacing="0.8">${escXml(domain.domain.toUpperCase())}</text>`);

    // Domain overall average badge
    const allAvgs = domain.components.map(c => c.overallAvg).filter((v): v is number => v !== null);
    const domainAvg = allAvgs.length ? allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length : null;
    if (domainAvg !== null) {
      const badge = `${domainAvg.toFixed(1)} · ${scoreLabel(domainAvg)}`;
      p.push(`<text x="${x(bx + BOX_W - INNER_PAD)}" y="${x(by + 27)}" fill="rgba(255,255,255,0.85)" font-size="12" font-weight="600" text-anchor="end">${escXml(badge)}</text>`);
    } else {
      p.push(`<text x="${x(bx + BOX_W - INNER_PAD)}" y="${x(by + 27)}" fill="rgba(255,255,255,0.5)" font-size="11" text-anchor="end">No scores yet</text>`);
    }

    // — Component rows
    const rowAreaY = by + HDR + 10;
    const rowAreaH = BOX_H - HDR - 20;
    const nComps = domain.components.length || 1;
    const ROW_H = Math.min(44, rowAreaH / nComps);
    const LABEL_W = Math.round(BOX_W * 0.32);
    const BAR_X = x(bx + INNER_PAD + LABEL_W + 8);
    const BAR_W = x(BOX_W - INNER_PAD * 2 - LABEL_W - 52);
    const SCORE_X = BAR_X + BAR_W + 8;

    domain.components.forEach((comp, ci) => {
      const ry = rowAreaY + ci * ROW_H;
      const midY = ry + ROW_H / 2;

      // Alternating row tint
      if (ci % 2 === 1) {
        p.push(`<rect x="${x(bx + 6)}" y="${x(ry)}" width="${x(BOX_W - 12)}" height="${x(ROW_H)}" fill="${theme.light}" opacity="0.5" rx="4"/>`);
      }

      // Label
      const label = trunc(comp.component, 26);
      p.push(`<text x="${x(bx + INNER_PAD)}" y="${x(midY + 5)}" fill="${theme.text}" font-size="11.5" font-weight="500">${escXml(label)}</text>`);

      // Bar track
      p.push(`<rect x="${BAR_X}" y="${x(midY - 7)}" width="${BAR_W}" height="14" rx="4" fill="#e2e8f0"/>`);

      if (comp.overallAvg !== null) {
        const pct = Math.max(0, Math.min(1, (comp.overallAvg - 1) / 3));
        const fw = Math.max(8, Math.round(pct * BAR_W));
        const col = scoreColor(comp.overallAvg);
        p.push(`<rect x="${BAR_X}" y="${x(midY - 7)}" width="${fw}" height="14" rx="4" fill="${col}"/>`);

        // Tick marks at 1,2,3,4 on the bar
        [0, 1 / 3, 2 / 3, 1].forEach((tick, ti) => {
          const tx = BAR_X + Math.round(tick * BAR_W);
          p.push(`<line x1="${tx}" y1="${x(midY + 7)}" x2="${tx}" y2="${x(midY + 11)}" stroke="#94a3b8" stroke-width="1"/>`);
          p.push(`<text x="${tx}" y="${x(midY + 20)}" fill="#94a3b8" font-size="8" text-anchor="middle">${ti + 1}</text>`);
        });

        // Score label
        p.push(`<text x="${SCORE_X}" y="${x(midY + 5)}" fill="${col}" font-size="13" font-weight="700">${comp.overallAvg.toFixed(1)}</text>`);
      } else {
        p.push(`<text x="${SCORE_X}" y="${x(midY + 5)}" fill="#94a3b8" font-size="11">—</text>`);
      }

      // Per-period dots (shown as small circles to the right of the score)
      const periodEntries = Object.entries(comp.byPeriod).filter(([, v]) => v !== null) as [string, number][];
      if (periodEntries.length > 1) {
        let dotX = SCORE_X + 28;
        periodEntries.slice(0, 4).forEach(([, v]) => {
          const dc = scoreColor(v);
          p.push(`<circle cx="${dotX}" cy="${x(midY)}" r="4" fill="${dc}" opacity="0.75"/>`);
          dotX += 11;
        });
      }
    });
  });

  // — Footer
  const fy = H - FTR_H;
  p.push(`<rect x="0" y="${fy}" width="${W}" height="${FTR_H}" fill="#0f172a"/>`);

  const legendItems = [
    { col: "#ef4444", label: "1.0–1.75  Reactive" },
    { col: "#f97316", label: "1.75–2.5  Emerging" },
    { col: "#eab308", label: "2.5–3.25  Transitioning" },
    { col: "#22c55e", label: "3.25–4.0  Proactive" },
  ];
  const totalLW = 760;
  const lStartX = (W - totalLW) / 2;
  legendItems.forEach(({ col, label }, li) => {
    const lx = lStartX + li * 190;
    const ly = fy + 18;
    p.push(`<rect x="${x(lx)}" y="${ly}" width="13" height="13" rx="3" fill="${col}"/>`);
    p.push(`<text x="${x(lx + 19)}" y="${ly + 11}" fill="#e2e8f0" font-size="11.5">${label}</text>`);
  });
  p.push(`<text x="${W - 24}" y="${fy + 33}" fill="#475569" font-size="10" text-anchor="end">Pathways · MSR Framework</text>`);

  p.push(`</svg>`);
  return p.join("\n");
}
