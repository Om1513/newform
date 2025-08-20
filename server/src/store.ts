export type Platform = "meta" | "tiktok";
export type DateRangeEnum = "last7" | "last14" | "last30";
export type Cadence = "manual" | "hourly" | "every 12 hours" | "daily";
export type Delivery = "email" | "link";

export interface ReportConfig {
  platform: Platform;
  metrics: string[];
  level: string;
  dateRangeEnum: DateRangeEnum;
  cadence: Cadence;
  delivery: Delivery;
  email?: string | null;
}

export interface RunStatus {
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  lastError?: string | null;
  latestPublicUrl?: string | null;
}

export const store = {
  config: null as ReportConfig | null,
  status: {
    lastRunAt: null,
    nextRunAt: null,
    lastError: null,
    latestPublicUrl: null
  } as RunStatus
};
