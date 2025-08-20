import fs from "fs";
import path from "path";
import axios from "axios";
import { store, ReportConfig } from "./store";
import OpenAI from "openai";
import { Resend } from "resend";

const REPORT_DIR = path.resolve(process.cwd(), "reports");
const SERVER_PUBLIC_BASE = process.env.SERVER_PUBLIC_BASE ?? "http://localhost:4000";

const NEWFORM_API_BASE = process.env.NEWFORM_API_BASE ?? "https://bizdev.newform.ai";
const NEWFORM_API_TOKEN = process.env.NEWFORM_API_TOKEN ?? "NEWFORMCODINGCHALLENGE";
const NEWFORM_AUTH_HEADER_NAME = process.env.NEWFORM_AUTH_HEADER_NAME ?? "Authorization";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

type AnyRow = Record<string, any>;

/** Build and deliver one report, updating store.status */
export async function runReport(): Promise<{ url?: string; emailed?: boolean }> {
  if (!store.config) throw new Error("No config saved");
  const cfg = store.config;

  // 1) Fetch data (via direct API; we could also call our /proxy)
  const payload = buildPayload(cfg);
  const url = `${NEWFORM_API_BASE}/sample-data/${cfg.platform}`;

  const resp = await axios.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
      // IMPORTANT: raw token (no "Bearer ") to match the working tests
      [NEWFORM_AUTH_HEADER_NAME]: NEWFORM_API_TOKEN,
    },
    timeout: 30_000,
    validateStatus: () => true, // let us format non-2xx errors
  });
  if (resp.status < 200 || resp.status >= 300) {
    const body = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data);
    throw new Error(`Upstream ${cfg.platform} ${resp.status}: ${body}`);
  }

  const rows: AnyRow[] = extractRows(resp.data);

  // 2) Aggregate totals for the selected metrics (simple + robust)
  const totals = aggregateTotals(rows, cfg.metrics);

  // 3) LLM summary (fallback to heuristic if key missing)
  const summary = await summarizeLLM({
    platform: cfg.platform,
    dateRange: cfg.dateRangeEnum,
    level: cfg.level,
    totals
  });

  // 4) Chart as inline SVG
  const chartSvg = makeBarSvg(totals);

  // Build simple HTML report
  const html = renderHtml({
    title: `Insight Report — ${cfg.platform} (${cfg.dateRangeEnum})`,
    summary,
    totals,
    chartSvg
  });

  // 5) Deliver
  ensureDir(REPORT_DIR);
  const filename = `report-${Date.now()}.html`;
  const fpath = path.join(REPORT_DIR, filename);
  fs.writeFileSync(fpath, html, "utf8");
  const publicUrl = `${SERVER_PUBLIC_BASE}/reports/${filename}`;
  store.status.latestPublicUrl = publicUrl;

  if (cfg.delivery === "email") {
    const from = process.env.RESEND_FROM;
    if (!from) throw new Error("RESEND_FROM not set");
    if (!cfg.email) throw new Error("Email not provided in config");
    await resend.emails.send({
      from,
      to: [cfg.email],
      subject: "Your Scheduled Insight Report",
      html
    });
    return { url: publicUrl, emailed: true };
  }

  return { url: publicUrl };
}

/** Build payloads that exactly follow the challenge spec:
 *  - Lowercase dateRangeEnum: "last7" | "last14" | "last30" | "lifetime"
 *  - Raw Authorization header (no "Bearer ")
 *  - No TikTok reportType (kept optional, omit to avoid 422s)
 */
export function buildPayload(cfg: ReportConfig) {
  if (cfg.platform === "tiktok") {
    // TikTok per spec
    return {
      metrics: cfg.metrics,          // array (allowed list)
      dimensions: ["stat_time_day"], // valid example dimension
      level: cfg.level,              // "AUCTION_ADVERTISER" | "AUCTION_AD" | "AUCTION_CAMPAIGN"
      dateRangeEnum: cfg.dateRangeEnum, // lower-case per working tests
      // reportType omitted intentionally
    };
  }
  // Meta per spec
  return {
    metrics: cfg.metrics,              // array (allowed list)
    level: cfg.level,                  // "account" | "campaign" | "adset" | "ad"
    breakdowns: [],                    // allowed empty
    timeIncrement: "7",                // valid per spec; keeps server happy
    dateRangeEnum: cfg.dateRangeEnum,  // lower-case per working tests
  };
}

/** Extract rows robustly from unknown sample payload shapes */
export function extractRows(data: any): AnyRow[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as AnyRow[];
  if (Array.isArray(data.rows)) return data.rows as AnyRow[];
  if (Array.isArray(data.data)) return data.data as AnyRow[];
  if (Array.isArray(data.results)) return data.results as AnyRow[];
  // Try single object
  if (typeof data === "object") return [data as AnyRow];
  return [];
}

function aggregateTotals(rows: AnyRow[], metrics: string[]) {
  const totals: Record<string, number> = {};
  for (const m of metrics) totals[m] = 0;
  for (const row of rows) {
    for (const m of metrics) {
      const val = Number(row[m]);
      if (!Number.isNaN(val)) totals[m] += val;
    }
  }
  // Round to 2 decimals
  for (const m of metrics) totals[m] = Math.round((totals[m] + Number.EPSILON) * 100) / 100;
  return totals;
}

async function summarizeLLM(input: {
  platform: string;
  dateRange: string;
  level: string;
  totals: Record<string, number>;
}) {
  const { platform, dateRange, level, totals } = input;
  if (!process.env.OPENAI_API_KEY) {
    return defaultSummary(totals, platform, dateRange, level);
  }

  try {
    const content = [
      `You are a concise performance analyst. Produce 3 short bullets (max ~20 words each).`,
      `Platform: ${platform}`,
      `Date Range: ${dateRange}`,
      `Level: ${level}`,
      `Totals (JSON): ${JSON.stringify(totals)}`
    ].join("\n");

    // Use Chat Completions for broad compatibility
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Be concise and factual." },
        { role: "user", content }
      ],
      temperature: 0.2,
      max_tokens: 180
    });

    const text = resp.choices?.[0]?.message?.content?.trim();
    return text || defaultSummary(totals, platform, dateRange, level);
  } catch {
    return defaultSummary(totals, platform, dateRange, level);
  }
}

function defaultSummary(
  totals: Record<string, number>,
  platform: string,
  dateRange: string,
  level: string
) {
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  const topMetric = top ? `${top[0]}=${top[1]}` : "n/a";
  return [
    `• ${platform} ${dateRange} at ${level} level processed successfully.`,
    `• Highest total metric: ${topMetric}.`,
    `• Review chart for quick relative magnitudes.`
  ].join("\n");
}

/** Render a simple bar chart as inline SVG */
function makeBarSvg(totals: Record<string, number>): string {
  const entries = Object.entries(totals);
  const width = 640;
  const barH = 26;
  const gap = 12;
  const pad = 16;
  const labelW = 160;
  const chartW = width - pad * 2 - labelW;
  const height = pad * 2 + entries.length * (barH + gap) - gap;

  const max = Math.max(...entries.map(([, v]) => v), 1);

  const bars = entries
    .map(([k, v], i) => {
      const y = pad + i * (barH + gap);
      const w = Math.round((v / max) * chartW);
      return `
        <g>
          <text x="${pad}" y="${y + barH - 6}" font-family="sans-serif" font-size="12" fill="#111">${escapeHtml(k)}</text>
          <rect x="${pad + labelW}" y="${y}" width="${w}" height="${barH}" fill="#6b7280"></rect>
          <text x="${pad + labelW + w + 6}" y="${y + barH - 6}" font-family="sans-serif" font-size="12" fill="#111">${v}</text>
        </g>
      `;
    })
    .join("\n");

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#fff"/>
  ${bars}
</svg>`;
}

function renderHtml(params: {
  title: string;
  summary: string;
  totals: Record<string, number>;
  chartSvg: string;
}) {
  const { title, summary, totals, chartSvg } = params;
  const rows = Object.entries(totals)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 10px;border:1px solid #eee">${escapeHtml(
          k
        )}</td><td style="padding:6px 10px;border:1px solid #eee;text-align:right">${v}</td></tr>`
    )
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
</head>
<body style="font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.3;color:#111;background:#fff;padding:20px">
  <h1 style="font-size:20px;margin:0 0 10px">${escapeHtml(title)}</h1>
  <section style="margin:12px 0 16px;white-space:pre-wrap">${escapeHtml(summary)}</section>

  <section style="margin:16px 0">
    ${chartSvg}
  </section>

  <h2 style="font-size:16px;margin:16px 0 8px">Totals</h2>
  <table style="border-collapse:collapse;font-size:14px">
    <thead>
      <tr><th style="padding:6px 10px;border:1px solid #eee;text-align:left">Metric</th><th style="padding:6px 10px;border:1px solid #eee;text-align:right">Total</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

/** Helper to compute next run timestamp from cadence (simple) */
export function computeNextRunISO(cadence: ReportConfig["cadence"]) {
  const now = Date.now();
  const ms =
    cadence === "hourly" ? 60 * 60 * 1000 :
    cadence === "every 12 hours" ? 12 * 60 * 60 * 1000 :
    cadence === "daily" ? 24 * 60 * 60 * 1000 :
    0;
  return ms ? new Date(now + ms).toISOString() : null;
}
