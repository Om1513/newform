// server/src/scheduler.ts
import cron, { type ScheduledTask } from "node-cron";
import { store } from "./store";
import { runReport, computeNextRunISO } from "./report";

let currentJob: ScheduledTask | null = null;

export function reschedule() {
  // Clear prior job
  if (currentJob) {
    currentJob.stop();
    currentJob = null;
  }
  if (!store.config) {
    store.status.nextRunAt = null;
    return;
  }

  const cadence = store.config.cadence;
  if (cadence === "manual") {
    store.status.nextRunAt = null;
    return;
  }

  // Map cadence to cron expr
  const expr =
    cadence === "hourly"   ? "0 * * * *" :
    cadence === "every12h" ? "0 */12 * * *" :
    /* daily */              "0 9 * * *";

  // Note: omit the options object — scheduled is true by default.
  currentJob = cron.schedule(expr, async () => {
    try {
      await runReport();
      store.status.lastRunAt = new Date().toISOString();
      store.status.lastError = null;
    } catch (err: any) {
      store.status.lastError = String(err?.message ?? err);
    } finally {
      store.status.nextRunAt = computeNextRunISO(cadence);
    }
  });

  // initial estimate
  store.status.nextRunAt = computeNextRunISO(cadence);
}
