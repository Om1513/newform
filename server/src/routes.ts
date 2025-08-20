import { Router } from "express";
import { z } from "zod";
import { store, ReportConfig } from "./store";
import { reschedule } from "./scheduler";
import { runReport, computeNextRunISO } from "./report";

const router = Router();

const ConfigSchema = z.object({
  platform: z.enum(["meta", "tiktok"]),
  metrics: z.array(z.string()).min(1),
  level: z.string().min(1),
  dateRangeEnum: z.enum(["last7", "last14", "last30"]),
  cadence: z.enum(["manual", "hourly", "every 12 hours", "daily"]),
  delivery: z.enum(["email", "link"]),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined))
}).refine(v => v.delivery === "email" ? !!v.email : true, {
  message: "Email is required when delivery = email",
  path: ["email"]
});

router.get("/config", (_req, res) => {
  res.json({ config: store.config });
});

router.post("/config", (req, res) => {
  const parsed = ConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const data = parsed.data as ReportConfig;
  store.config = { ...data, email: data.delivery === "email" ? data.email! : null };

  // Reset status and reschedule
  store.status.lastError = null;
  store.status.nextRunAt = data.cadence === "manual" ? null : computeNextRunISO(data.cadence);
  reschedule();
  res.json({ ok: true, config: store.config });
});

router.post("/run-now", async (_req, res) => {
  if (!store.config) return res.status(400).json({ error: "No config saved" });
  try {
    const result = await runReport();
    store.status.lastRunAt = new Date().toISOString();
    store.status.lastError = null;
    // refresh next run estimate
    store.status.nextRunAt = computeNextRunISO(store.config.cadence);
    return res.json({ ok: true, lastRunAt: store.status.lastRunAt, ...result });
  } catch (err: any) {
    store.status.lastError = String(err?.message ?? err);
    return res.status(500).json({ error: store.status.lastError });
  }
});

router.get("/status", (_req, res) => {
  res.json({ status: store.status, config: store.config });
});

export default router;
