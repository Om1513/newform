import fs from "fs";
import path from "path";

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
  latestPdfUrl?: string | null;
}

// Persistence file paths
const DATA_DIR = path.resolve(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");
const STATUS_FILE = path.join(DATA_DIR, "status.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load persisted data
function loadConfig(): ReportConfig | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf8");
      const config = JSON.parse(data);
      console.log("✅ Loaded persisted configuration");
      return config;
    }
  } catch (error) {
    console.error("Failed to load config:", error);
  }
  console.log("ℹ️ No persisted configuration found");
  return null;
}

function loadStatus(): RunStatus {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      const data = fs.readFileSync(STATUS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load status:", error);
  }
  return {
    lastRunAt: null,
    nextRunAt: null,
    lastError: null,
    latestPublicUrl: null,
    latestPdfUrl: null
  };
}

// Save data to disk
function saveConfig(config: ReportConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
    console.log("💾 Configuration saved to disk");
  } catch (error) {
    console.error("Failed to save config:", error);
  }
}

function saveStatus(status: RunStatus): void {
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save status:", error);
  }
}

export const store = {
  config: loadConfig(),
  status: loadStatus(),
  
  // Methods to update and persist data
  updateConfig(newConfig: ReportConfig): void {
    this.config = newConfig;
    saveConfig(newConfig);
  },
  
  updateStatus(newStatus: Partial<RunStatus>): void {
    this.status = { ...this.status, ...newStatus };
    saveStatus(this.status);
  }
};
