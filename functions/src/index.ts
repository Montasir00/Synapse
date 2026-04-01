import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import axios from 'axios';
import * as crypto from 'crypto';
import { google } from 'googleapis';

admin.initializeApp();
const db = admin.firestore();

const app = express();

// Enable CORS for frontend during local dev, but for Firebase Hosting rewrites it's often the same origin.
app.use(cors({ origin: true, credentials: true }));
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
  const { method, endpoint, params, baseUrl } = req.body;

  try {
    // Fetch Binance credentials securely from Firestore
    // Path matches what we will save from the frontend: user_secrets/{uid}
    const secretDoc = await db.collection('user_secrets').doc(user.uid).get();
    
    if (!secretDoc.exists) {
      return res.status(400).json({ error: 'Binance credentials not configured for this user.' });
    }

    const { binanceApiKey: apiKey, binanceApiSecret: apiSecret } = secretDoc.data()!;

    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: 'API Key and Secret are required' });
    }

    const cleanKey = apiKey.trim();
    const cleanSecret = apiSecret.trim();
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
    res.status(status).json(binanceError || { msg: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'TaskOS Cloud Functions API' });
});

// --- GOOGLE OAUTH CONFIGURATION ---
const createOAuthClient = () => {
  // Use Firebase environment config or env variables. In v2 functions process.env handles .env files correctly.
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

app.get("/api/auth/google", (req, res) => {
  const client = createOAuthClient();
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

app.get("/api/auth/google/url", (req, res) => {
  const client = createOAuthClient();
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
  const client = createOAuthClient();
  
  if (!client || !code) {
    return res.send(`<script>window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', provider: 'google' }, '*'); window.close();</script>`);
  }

  try {
    const { tokens } = await client.getToken(code as string);
    // Determine if production from environment
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

// Export the Express API wrapped in Cloud Functions HTTPS trigger
export const api = functions.https.onRequest(app);
