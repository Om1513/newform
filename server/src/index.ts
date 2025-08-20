import express from "express";
import cors from "cors";
import path from "path";
import router from "./routes";
import { reschedule } from "./scheduler";

const app = express();
const PORT = process.env.PORT || 4000;

// CORS configuration for Vercel deployment
app.use(cors({
  origin: process.env.VERCEL_URL 
    ? [`https://${process.env.VERCEL_URL}`, 'https://vercel.app']
    : ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

// API routes
app.use("/api", router);

// Serve static files (reports)
app.use("/reports", express.static(path.join(process.cwd(), "reports")));

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
  } catch (error: any) {
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
  reschedule();
});

export default app;
