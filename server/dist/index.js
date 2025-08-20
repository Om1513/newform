"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const routes_1 = __importDefault(require("./routes"));
const scheduler_1 = require("./scheduler");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// CORS configuration for Vercel deployment
app.use((0, cors_1.default)({
    origin: process.env.VERCEL_URL
        ? [`https://${process.env.VERCEL_URL}`, 'https://vercel.app']
        : ['http://localhost:3000'],
    credentials: true
}));
app.use(express_1.default.json());
// API routes
app.use("/api", routes_1.default);
// Serve static files (reports)
app.use("/reports", express_1.default.static(path_1.default.join(process.cwd(), "reports")));
// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// Proxy endpoint for external API calls
app.post("/api/proxy/:platform", async (req, res) => {
    const { platform } = req.params;
    const { NEWFORM_API_TOKEN, NEWFORM_AUTH_HEADER_NAME, NEWFORM_BASE_URL } = process.env;
    if (!NEWFORM_API_TOKEN || !NEWFORM_AUTH_HEADER_NAME || !NEWFORM_BASE_URL) {
        return res.status(500).json({ error: "API configuration missing" });
    }
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const response = await fetch(`${NEWFORM_BASE_URL}/sample-data/${platform}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                [NEWFORM_AUTH_HEADER_NAME]: NEWFORM_API_TOKEN
            },
            body: JSON.stringify(req.body),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        const data = await response.json();
        res.json(data);
    }
    catch (error) {
        console.error(`Proxy error for ${platform}:`, error);
        res.status(500).json({ error: error.message });
    }
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api`);
    console.log(`📁 Reports available at http://localhost:${PORT}/reports`);
    // Initialize scheduler
    (0, scheduler_1.reschedule)();
});
exports.default = app;
