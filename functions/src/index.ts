import { onRequest } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import axios from 'axios';
import * as crypto from 'crypto';

// Initialize Firebase Admin once
admin.initializeApp();
const db = admin.firestore();

const app = express();

// Standard Express middlewares
app.use(cors({ 
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(cookieParser());
app.use(express.json());

// Auth Middleware: Verifies Firebase ID Token
const verifyToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying auth token', error);
    res.status(403).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Binance API Proxy
app.post('/api/binance/proxy', verifyToken, async (req, res) => {
  const user = (req as any).user;
  const { method, endpoint, params, baseUrl, apiKey: rawApiKey, apiSecret: rawApiSecret } = req.body;

  try {
    let apiKey = String(rawApiKey || '').trim();
    let apiSecret = String(rawApiSecret || '').trim();

    if (!apiKey || !apiSecret) {
      const secretDoc = await db.collection('user_secrets').doc(user.uid).get();

      if (!secretDoc.exists) {
        return res.status(400).json({ error: 'Binance credentials not configured for this user.' });
      }

      const data = secretDoc.data() || {};
      apiKey = String((data as any).binanceApiKey || '').trim();
      apiSecret = String((data as any).binanceApiSecret || '').trim();
    }

    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: 'API Key and Secret are required' });
    }

    const cleanKey = apiKey;
    const cleanSecret = apiSecret;
    const finalBaseUrl = baseUrl || 'https://api.binance.com';

    const timestamp = Date.now();
    const fullParams = { ...params, timestamp, recvWindow: 60000 };
    
    const sortedParams = Object.keys(fullParams)
      .sort()
      .reduce((obj: any, key: string) => {
        obj[key] = fullParams[key];
        return obj;
      }, {});

    const queryString = new URLSearchParams(sortedParams as Record<string, string>).toString();

    const signature = crypto
      .createHmac('sha256', cleanSecret)
      .update(queryString)
      .digest('hex');

    const url = `${finalBaseUrl}${endpoint}?${queryString}&signature=${signature}`;

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
    const status = error.response?.status || 500;
    res.status(status).json(binanceError || { msg: error.message || 'Proxy request failed.' });
  }
});

// Endpoint used by API Check flow to validate raw credentials before saving.
app.post('/api/binance/validate', verifyToken, async (req, res) => {
  const { apiKey, apiSecret, baseUrl } = req.body || {};

  const cleanKey = String(apiKey || '').trim();
  const cleanSecret = String(apiSecret || '').trim();
  const finalBaseUrl = baseUrl || 'https://api.binance.com';

  if (!cleanKey || !cleanSecret) {
    return res.status(400).json({ ok: false, msg: 'API key and secret are required.' });
  }

  try {
    const timestamp = Date.now();
    const params = { timestamp, recvWindow: 60000 };

    const queryString = new URLSearchParams(
      Object.keys(params)
        .sort()
        .reduce((acc: Record<string, string>, key) => {
          acc[key] = String((params as Record<string, number>)[key]);
          return acc;
        }, {})
    ).toString();

    const signature = crypto
      .createHmac('sha256', cleanSecret)
      .update(queryString)
      .digest('hex');

    const url = `${finalBaseUrl}/api/v3/account?${queryString}&signature=${signature}`;

    await axios.get(url, {
      headers: {
        'X-MBX-APIKEY': cleanKey,
      },
    });

    return res.json({ ok: true, msg: 'Credentials are valid.' });
  } catch (error: any) {
    const binanceError = error.response?.data;
    const status = error.response?.status || 500;

    return res.status(status).json({
      ok: false,
      code: binanceError?.code ?? null,
      msg: binanceError?.msg || error.message || 'Validation failed.',
    });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'TaskOS Cloud Functions API', version: '2.0.1' });
});

// --- GOOGLE OAUTH CONFIGURATION (LAZY LOAD GOOGLEAPIS) ---
const createOAuthClient = async () => {
  // Lazy-load googleapis to reduce discovery timeout issues
  const { google } = await import('googleapis');
  
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";

  if (!clientID || !clientSecret) return null;
  try {
    return new google.auth.OAuth2(clientID, clientSecret, redirectUri);
  } catch (error) {
    console.error("[Auth] Error creating OAuth client:", error);
    return null;
  }
};

app.get("/api/auth/google", async (_req, res) => {
  const client = await createOAuthClient();
  if (!client) {
    return res.status(400).send("Google OAuth credentials missing. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
  }
  
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ],
    prompt: 'consent'
  });
  res.redirect(url);
});

app.get("/api/auth/google/url", async (_req, res) => {
  const client = await createOAuthClient();
  if (!client) {
    return res.status(400).json({ error: "Google OAuth credentials missing" });
  }
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ],
    prompt: 'consent'
  });
  res.json({ url });
});

app.get("/api/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  const client = await createOAuthClient();
  
  if (!client || !code) {
    return res.send(`<script>window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', provider: 'google' }, '*'); window.close();</script>`);
  }

  try {
    const { tokens } = await client.getToken(code as string);
    const isProd = process.env.NODE_ENV === 'production' || process.env.GCP_PROJECT !== undefined;
    
    res.cookie('google_tokens', JSON.stringify(tokens), { 
      httpOnly: true, 
      secure: isProd,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: isProd ? 'none' : 'lax'
    });
    
    res.send(`
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'google' }, '*');
          window.close();
        } else {
          window.location.href = '/?tab=settings';
        }
      </script>
    `);
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.send(`<script>window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', provider: 'google' }, '*'); window.close();</script>`);
  }
});

app.get("/api/auth/google/status", (req, res) => {
  const tokens = req.cookies.google_tokens;
  res.json({ connected: !!tokens });
});

// Export the Express API wrapped in Cloud Functions HTTPS trigger (v2)
export const api = onRequest({
  region: 'europe-west1',
  cors: true,
  invoker: 'public',
  serviceAccount: 'project-166720b8-9694-4ef7-b97@appspot.gserviceaccount.com',
  maxInstances: 10,
  memory: '256MiB',
  timeoutSeconds: 60
}, app);
