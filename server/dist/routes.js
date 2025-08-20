"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const store_1 = require("./store");
const scheduler_1 = require("./scheduler");
const report_1 = require("./report");
const router = (0, express_1.Router)();
const ConfigSchema = zod_1.z.object({
    platform: zod_1.z.enum(["meta", "tiktok"]),
    metrics: zod_1.z.array(zod_1.z.string()).min(1),
    level: zod_1.z.string().min(1),
    dateRangeEnum: zod_1.z.enum(["last7", "last14", "last30"]),
    cadence: zod_1.z.enum(["manual", "hourly", "every 12 hours", "daily"]),
    delivery: zod_1.z.enum(["email", "link"]),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal("").transform(() => undefined))
}).refine(v => v.delivery === "email" ? !!v.email : true, {
    message: "Email is required when delivery = email",
    path: ["email"]
});
router.get("/config", (_req, res) => {
    res.json({ config: store_1.store.config });
});
router.post("/config", (req, res) => {
    const parsed = ConfigSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const data = parsed.data;
    const config = { ...data, email: data.delivery === "email" ? data.email : null };
    // Update config with persistence
    store_1.store.updateConfig(config);
    // Reset status and reschedule
    store_1.store.updateStatus({
        lastError: null,
        nextRunAt: data.cadence === "manual" ? null : (0, report_1.computeNextRunISO)(data.cadence)
    });
    (0, scheduler_1.reschedule)();
    res.json({ ok: true, config: store_1.store.config });
});
router.post("/run-now", async (_req, res) => {
    if (!store_1.store.config)
        return res.status(400).json({ error: "No config saved" });
    try {
        const result = await (0, report_1.runReport)();
        store_1.store.updateStatus({
            lastRunAt: new Date().toISOString(),
            lastError: null,
            nextRunAt: (0, report_1.computeNextRunISO)(store_1.store.config.cadence)
        });
        return res.json({ ok: true, lastRunAt: store_1.store.status.lastRunAt, ...result });
    }
    catch (err) {
        store_1.store.updateStatus({
            lastError: String(err?.message ?? err)
        });
        return res.status(500).json({ error: store_1.store.status.lastError });
    }
});
router.get("/status", (_req, res) => {
    res.json({ status: store_1.store.status, config: store_1.store.config });
});
exports.default = router;
