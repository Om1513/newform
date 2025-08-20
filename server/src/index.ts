import "dotenv/config";  // <-- keep this on the first line

import express, { type Request, type Response } from "express";
import cors from "cors";
import axios from "axios";
import path from "path";
import fs from "fs";
import router from "./routes";


const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.SERVER_PORT ?? 4000);
const NEWFORM_API_BASE = process.env.NEWFORM_API_BASE ?? "https://bizdev.newform.ai";
const NEWFORM_API_TOKEN = process.env.NEWFORM_API_TOKEN ?? "NEWFORMCODINGCHALLENGE";
const NEWFORM_AUTH_HEADER_NAME = process.env.NEWFORM_AUTH_HEADER_NAME ?? "Authorization";

// Static dir for public reports
const REPORT_DIR = path.resolve(process.cwd(), "reports");
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
app.use("/reports", express.static(REPORT_DIR));

app.use("/api", router);

app.get("/health", (_req, res) => res.json({ ok: true }));

// Example proxy: POST /proxy/meta or /proxy/tiktok
app.post("/proxy/:platform", async (req, res) => {
  const { platform } = req.params;
  const url = `${NEWFORM_API_BASE}/sample-data/${platform}`;

  try {
    const r = await axios.post(url, req.body, {
      headers: {
        "Content-Type": "application/json",
        [NEWFORM_AUTH_HEADER_NAME]: NEWFORM_API_TOKEN
      },
      timeout: 30_000
    });
    res.status(r.status).json(r.data);
  } catch (err: any) {
    const status = err?.response?.status ?? 500;
    res.status(status).json({ error: err?.response?.data ?? err?.message ?? "Unknown error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
