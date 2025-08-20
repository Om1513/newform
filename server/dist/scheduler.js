"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reschedule = reschedule;
// server/src/scheduler.ts
const node_cron_1 = __importDefault(require("node-cron"));
const store_1 = require("./store");
const report_1 = require("./report");
let currentJob = null;
function reschedule() {
    // Clear prior job
    if (currentJob) {
        currentJob.stop();
        currentJob = null;
    }
    if (!store_1.store.config) {
        store_1.store.status.nextRunAt = null;
        return;
    }
    const cadence = store_1.store.config.cadence;
    if (cadence === "manual") {
        store_1.store.status.nextRunAt = null;
        return;
    }
    // Map cadence to cron expr
    const expr = cadence === "hourly" ? "0 * * * *" :
        cadence === "every 12 hours" ? "0 */12 * * *" :
            /* daily */ "0 9 * * *";
    // Note: omit the options object — scheduled is true by default.
    currentJob = node_cron_1.default.schedule(expr, async () => {
        try {
            await (0, report_1.runReport)();
            store_1.store.status.lastRunAt = new Date().toISOString();
            store_1.store.status.lastError = null;
        }
        catch (err) {
            store_1.store.status.lastError = String(err?.message ?? err);
        }
        finally {
            store_1.store.status.nextRunAt = (0, report_1.computeNextRunISO)(cadence);
        }
    });
    // initial estimate
    store_1.store.status.nextRunAt = (0, report_1.computeNextRunISO)(cadence);
}
