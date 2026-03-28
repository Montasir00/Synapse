import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import CryptoJS from "crypto-js";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

console.log("Starting Crypto Trade Tracker server...");

const app = express();
const PORT = 3000;

app.use(cookieParser());
app.use(express.json());

// Binance API Proxy
app.post("/api/binance/proxy", async (req, res) => {
  const { method, endpoint, params, apiKey, apiSecret, baseUrl } = req.body;

  if (!apiKey || !apiSecret) {
    return res.status(400).json({ error: "API Key and Secret are required" });
  }

  // Strictly sanitize keys: remove any non-alphanumeric characters
  const cleanKey = apiKey.replace(/[^a-zA-Z0-9]/g, '').trim();
  const cleanSecret = apiSecret.replace(/[^a-zA-Z0-9]/g, '').trim();
  const finalBaseUrl = baseUrl || 'https://api.binance.com';

  const timestamp = Date.now();
  const fullParams = { ...params, timestamp, recvWindow: 60000 };
  
  // Sort params alphabetically to ensure consistent signature
  const sortedParams = Object.keys(fullParams)
    .sort()
    .reduce((obj: any, key: string) => {
      obj[key] = fullParams[key as keyof typeof fullParams];
      return obj;
    }, {});

  const queryString = Object.entries(sortedParams)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const signature = CryptoJS.HmacSHA256(queryString, cleanSecret).toString();
  const url = `${finalBaseUrl}${endpoint}?${queryString}&signature=${signature}`;

  console.log(`Proxying request to: ${finalBaseUrl}${endpoint} (Key length: ${cleanKey.length})`);

  try {
    const response = await axios({
      method: method || 'GET',
      url,
      headers: {
        'X-MBX-APIKEY': cleanKey
      }
    });
    res.json(response.data);
  } catch (error: any) {
    const binanceError = error.response?.data;
    console.error("Binance API error:", binanceError || error.message);
    res.status(error.response?.status || 500).json(binanceError || { msg: error.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Crypto Trade Tracker" });
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();
