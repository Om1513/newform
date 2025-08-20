"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Persistence file paths
const DATA_DIR = path_1.default.resolve(process.cwd(), "data");
const CONFIG_FILE = path_1.default.join(DATA_DIR, "config.json");
const STATUS_FILE = path_1.default.join(DATA_DIR, "status.json");
// Ensure data directory exists
if (!fs_1.default.existsSync(DATA_DIR)) {
    fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
}
// Load persisted data
function loadConfig() {
    try {
        if (fs_1.default.existsSync(CONFIG_FILE)) {
            const data = fs_1.default.readFileSync(CONFIG_FILE, "utf8");
            const config = JSON.parse(data);
            console.log("✅ Loaded persisted configuration");
            return config;
        }
    }
    catch (error) {
        console.error("Failed to load config:", error);
    }
    console.log("ℹ️ No persisted configuration found");
    return null;
}
function loadStatus() {
    try {
        if (fs_1.default.existsSync(STATUS_FILE)) {
            const data = fs_1.default.readFileSync(STATUS_FILE, "utf8");
            return JSON.parse(data);
        }
    }
    catch (error) {
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
function saveConfig(config) {
    try {
        fs_1.default.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
        console.log("💾 Configuration saved to disk");
    }
    catch (error) {
        console.error("Failed to save config:", error);
    }
}
function saveStatus(status) {
    try {
        fs_1.default.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), "utf8");
    }
    catch (error) {
        console.error("Failed to save status:", error);
    }
}
exports.store = {
    config: loadConfig(),
    status: loadStatus(),
    // Methods to update and persist data
    updateConfig(newConfig) {
        this.config = newConfig;
        saveConfig(newConfig);
    },
    updateStatus(newStatus) {
        this.status = { ...this.status, ...newStatus };
        saveStatus(this.status);
    }
};
